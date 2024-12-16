from flask import Blueprint, jsonify, request
from backend.services.colab_integration import process_user_data, categorize_task, decompose_task, generate_schedule_suggestions
from backend.db_config import get_database, get_user_schedules_collection, store_microstep_feedback, get_ai_suggestions_collection, create_or_update_user
import traceback
from bson import ObjectId
from datetime import datetime, UTC  
from backend.models.task import Task
from typing import List, Dict, Any
import json

api_bp = Blueprint("api", __name__)

@api_bp.route("/auth/user", methods=["POST"])
def create_or_get_user():
    """
    Create or update user after Google authentication.
    Expects a JSON payload with user data from Google Auth.
    Returns the user object or error response.
    """
    try:
        print("Received authentication request. Headers:", request.headers)
        print("Request body:", request.get_json(silent=True))
        # Validate request payload
        user_data = request.json
        if not user_data:
            return jsonify({"error": "Missing request body"}), 400

        # Validate required fields
        required_fields = ["googleId", "email"]
        missing_fields = [field for field in required_fields if field not in user_data]
        if missing_fields:
            return jsonify({
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }), 400

        # Get database instance and users collection
        db = get_database()
        users = db['users']

        # Prepare calendar settings based on hasCalendarAccess
        has_calendar_access = user_data.get('hasCalendarAccess', False)
        calendar_settings = {
            "connected": has_calendar_access,
            "lastSyncTime": None,
            "syncStatus": "never",
            "selectedCalendars": [],
            "error": None,
            "settings": {
                "autoSync": True,
                "syncFrequency": 15,  # minutes
                "defaultReminders": True
            }
        }

        # Ensure displayName is never None/null
        display_name = user_data.get("displayName")
        if not display_name:
            # Fall back to email username if displayName is not provided
            display_name = user_data["email"].split('@')[0]

        # Prepare user data with all required fields and ensure no null values
        processed_user_data = {
            "googleId": user_data["googleId"],
            "email": user_data["email"],
            "displayName": display_name,  # Use processed display_name
            "photoURL": user_data.get("photoURL") or "",  # Ensure photoURL is never null
            "role": "free",  # Default role for new users
            "calendarSynced": has_calendar_access,
            "lastLogin": datetime.now(UTC), 
            "calendar": calendar_settings,
            "metadata": {
                "lastModified": datetime.now(UTC)  # Use UTC here as well
            }
        }

        # Create or update user using the utility function
        user = create_or_update_user(users, processed_user_data)
        
        if not user:
            return jsonify({
                "error": "Failed to create or update user"
            }), 500

        # Convert ObjectId to string and dates to ISO format for JSON serialization
        serialized_user = process_user_for_response(user)

        return jsonify({
            "user": serialized_user,
            "message": "User successfully created/updated"
        }), 200

    except Exception as e:
        # Log the full error traceback for debugging
        traceback.print_exc()
        return jsonify({
            "error": "Internal server error",
            "message": str(e)
        }), 500

def process_user_for_response(user: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process user document for JSON response.
    Converts ObjectId to string and datetime objects to ISO format.
    """
    processed_user = dict(user)  # Create a copy to avoid modifying the original
    
    # Convert ObjectId to string
    if '_id' in processed_user:
        processed_user['_id'] = str(processed_user['_id'])
    
    # Convert datetime objects to ISO format strings
    date_fields = ['lastLogin', 'createdAt', 'lastModified']
    for field in date_fields:
        if field in processed_user:
            if isinstance(processed_user[field], datetime):
                processed_user[field] = processed_user[field].isoformat()
    
    # Process nested datetime objects in metadata
    if 'metadata' in processed_user and 'lastModified' in processed_user['metadata']:
        if isinstance(processed_user['metadata']['lastModified'], datetime):
            processed_user['metadata']['lastModified'] = processed_user['metadata']['lastModified'].isoformat()
    
    # Process calendar lastSyncTime if it exists
    if 'calendar' in processed_user and 'lastSyncTime' in processed_user['calendar']:
        if isinstance(processed_user['calendar']['lastSyncTime'], datetime):
            processed_user['calendar']['lastSyncTime'] = processed_user['calendar']['lastSyncTime'].isoformat()
    
    return processed_user

@api_bp.route("/user/<user_id>", methods=["GET"])
def get_user(user_id):
    try:
        # Get database instance
        db = get_database()
        
        # Get user collection
        users = db['users']
        
        # Find user by Google ID
        user = users.find_one({"googleId": user_id})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        # Convert ObjectId to string for JSON serialization
        user['_id'] = str(user['_id'])
        
        return jsonify({"user": user}), 200
        
    except Exception as e:
        print(f"Error getting user: {e}")
        return jsonify({"error": str(e)}), 500

@api_bp.route("/user/<user_id>", methods=["PUT"])
def update_user(user_id):
    try:
        updates = request.json
        if not updates:
            return jsonify({"error": "No updates provided"}), 400
            
        # Get database instance
        db = get_database()
        
        # Get user collection
        users = db['users']
        
        # Update user document
        result = users.update_one(
            {"googleId": user_id},
            {"$set": {
                **updates,
                "lastModified": datetime.now().isoformat()
            }}
        )
        
        if result.modified_count == 0:
            return jsonify({"error": "User not found"}), 404
            
        # Get updated user document
        updated_user = users.find_one({"googleId": user_id})
        updated_user['_id'] = str(updated_user['_id'])
        
        return jsonify({
            "message": "User updated successfully",
            "user": updated_user
        }), 200
        
    except Exception as e:
        print(f"Error updating user: {e}")
        return jsonify({"error": str(e)}), 500

@api_bp.route("/submit_data", methods=["POST"])
def submit_data():
    try:
        user_data = request.json
        if not user_data or 'name' not in user_data:
            return jsonify({"error": "No data provided or name is missing"}), 400
        
        user_id = user_data['name']
        
        print(f"User data received for user {user_id}:", user_data)

        colab_response = process_user_data(user_data)

        print("Response from Colab server:", colab_response)

        if colab_response and 'schedule' in colab_response:
            user_schedules = get_user_schedules_collection()

            # Prepare the schedule document with more detailed information
            schedule_document = {
                "userId": user_id,
                "date": datetime.now().isoformat(),
                "inputs": {
                    "name": user_data.get('name'),
                    "age": user_data.get('age'),
                    "work_start_time": user_data.get('work_start_time'),
                    "work_end_time": user_data.get('work_end_time'),
                    "energy_patterns": user_data.get('energy_patterns', []),
                    "layout_preference": user_data.get('layout_preference', {}),
                    "priorities": user_data.get('priorities', {}),
                    "tasks": user_data.get('tasks', [])
                },
                "schedule": colab_response['schedule'],
                "metadata": {
                    "generatedAt": datetime.now().isoformat(),
                }
            }

            result = user_schedules.insert_one(schedule_document)

            if result.inserted_id:
                return jsonify({
                    "message": "Schedule generated and saved successfully",
                    "userId": user_id,
                    "scheduleId": str(result.inserted_id),
                    "inputs": schedule_document["inputs"],
                    "schedule": schedule_document["schedule"]
                }), 201
            else:
                return jsonify({"error": "Failed to save schedule to database"}), 500
        else:
            return jsonify({"error": "Failed to generate schedule"}), 500

    except Exception as e:
        print("Exception occurred:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/categorize_task", methods=["POST"])
def add_task():
    try:
        task_data = request.json
        if not task_data or 'task' not in task_data:
            return jsonify({"error": "No task provided"}), 400
        
        print(f"Processing task categorization: {task_data['task']}")
        categorized_task = categorize_task(task_data['task'])
        
        return jsonify(categorized_task)

    except Exception as e:
        print("Exception occurred:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/update_parsed_schedule", methods=["POST"])
def update_parsed_schedule():
    try:
        data = request.json
        if not data or 'scheduleId' not in data or 'parsedTasks' not in data:
            return jsonify({"error": "Invalid data provided"}), 400

        schedule_id = data['scheduleId']
        parsed_tasks = data['parsedTasks']

        user_schedules = get_user_schedules_collection()

        # Update the document with the parsed tasks
        result = user_schedules.update_one(
            {"_id": ObjectId(schedule_id)},
            {"$set": {"schedule": parsed_tasks}}
        )

        if result.modified_count > 0:
            return jsonify({"message": "Schedule synced to backend"}), 200
        else:
            return jsonify({"error": "Failed to update parsed schedule"}), 500

    except Exception as e:
        print("Exception occurred:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/update_task", methods=["POST"])
def update_task():
    try:
        data = request.json
        # Enhanced input validation
        if not data or not isinstance(data, dict):
            return jsonify({"error": "Invalid request format"}), 400
        
        if 'taskId' not in data or 'updates' not in data:
            return jsonify({"error": "Missing required fields: taskId or updates"}), 400

        task_id = data['taskId']
        updates = data['updates']
        
        # Validate updates object
        required_fields = ['type', 'is_section', 'id']
        if not all(field in updates for field in required_fields):
            return jsonify({"error": "Missing required task fields"}), 400
            
        # Ensure taskId matches the updates.id
        if task_id != updates['id']:
            return jsonify({"error": "Task ID mismatch"}), 400

        user_schedules = get_user_schedules_collection()
        
        # Update the task in all relevant future schedules if it's recurring
        if updates.get('is_recurring'):
            result = user_schedules.update_many(
                {
                    "tasks.id": task_id,
                    "date": {"$gte": datetime.now().isoformat()}
                },
                {"$set": {"tasks.$": updates}}
            )
        else:
            # Update only the specific task instance
            result = user_schedules.update_one(
                {"tasks.id": task_id},
                {"$set": {"tasks.$": updates}}
            )

        if result.modified_count > 0:
            return jsonify({
                "message": "Task updated successfully",
                "taskId": task_id,
                "updates": updates
            }), 200
        else:
            return jsonify({"error": "Task not found or no changes made"}), 404

    except Exception as e:
        print("Exception occurred:", str(e))
        return jsonify({"error": str(e)}), 500

@api_bp.route("/get_recurring_tasks", methods=["GET"])
def get_recurring_tasks():
    try:
        user_schedules = get_user_schedules_collection()
        recurring_tasks = user_schedules.distinct(
            "tasks",
            {
                "tasks.is_recurring": {"$ne": None},
                "date": {"$gte": datetime.now().isoformat()}
            }
        )
        
        return jsonify({
            "recurring_tasks": recurring_tasks
        }), 200

    except Exception as e:
        print("Exception occurred:", str(e))
        return jsonify({"error": str(e)}), 500

@api_bp.route("/schedules/<date>", methods=["GET"])
def get_schedule_by_date(date):
    """Retrieve schedule for a specific date."""
    try:
        # Validate date format
        try:
            datetime.strptime(date, '%Y-%m-%d')
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

        user_schedules = get_user_schedules_collection()
        
        # Find schedule for the specific date using date range
        schedule = user_schedules.find_one({
            "date": {
                "$gte": f"{date}T00:00:00",
                "$lt": f"{date}T23:59:59"
            }
        })

        if schedule:
            # Convert ObjectId to string for JSON serialization
            schedule['_id'] = str(schedule['_id'])
            return jsonify(schedule), 200
        else:
            return jsonify({"error": "Schedule not found"}), 404

    except Exception as e:
        print("Exception occurred:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/schedules", methods=["POST"])
def save_schedule():
    """Save a new schedule."""
    try:
        data = request.json
        if not data or 'date' not in data or 'tasks' not in data:
            return jsonify({"error": "Missing required fields: date or tasks"}), 400

        user_schedules = get_user_schedules_collection()

        # Check if schedule already exists for this date
        existing_schedule = user_schedules.find_one({
            "date": {
                "$gte": data['date'].split('T')[0] + "T00:00:00",
                "$lt": data['date'].split('T')[0] + "T23:59:59"
            }
        })

        if existing_schedule:
            return jsonify({"error": "Schedule already exists for this date"}), 409

        # Prepare schedule document with all fields
        schedule_document = {
            "date": data['date'],
            "tasks": data['tasks'],
            "userId": data.get('userId'),
            "inputs": data.get('inputs'),
            "schedule": data.get('schedule'),
            "metadata": {
                "createdAt": datetime.now().isoformat(),
                "lastModified": datetime.now().isoformat()
            }
        }

        result = user_schedules.insert_one(schedule_document)

        if result.inserted_id:
            schedule_document['_id'] = str(result.inserted_id)
            return jsonify(schedule_document), 201
        else:
            return jsonify({"error": "Failed to save schedule"}), 500

    except Exception as e:
        print("Exception occurred:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/schedules/<date>", methods=["PUT"])
def update_schedule(date):
    """Update an existing schedule."""
    try:
        data = request.json
        if not data or 'tasks' not in data:
            return jsonify({"error": "No tasks provided"}), 400

        # Validate date format
        try:
            datetime.strptime(date, '%Y-%m-%d')
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

        user_schedules = get_user_schedules_collection()

        # Update the schedule
        result = user_schedules.update_one(
            {
                "date": {
                    "$gte": f"{date}T00:00:00",
                    "$lt": f"{date}T23:59:59"
                }
            },
            {
                "$set": {
                    "tasks": data['tasks'],
                    "metadata.lastModified": datetime.now().isoformat()
                }
            }
        )

        if result.modified_count > 0:
            return jsonify({"message": "Schedule updated successfully"}), 200
        else:
            return jsonify({"error": "Schedule not found"}), 404

    except Exception as e:
        print("Exception occurred:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/schedules/range", methods=["GET"])
def get_schedules_range():
    """Retrieve schedules within a date range."""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        if not start_date or not end_date:
            return jsonify({"error": "Missing start_date or end_date"}), 400

        # Validate date formats
        try:
            datetime.strptime(start_date, '%Y-%m-%d')
            datetime.strptime(end_date, '%Y-%m-%d')
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

        user_schedules = get_user_schedules_collection()

        # Find schedules within the date range
        schedules = list(user_schedules.find({
            "date": {
                "$gte": f"{start_date}T00:00:00",
                "$lt": f"{end_date}T23:59:59"
            }
        }).sort("date", 1))  # Sort by date ascending

        # Convert ObjectIds to strings
        for schedule in schedules:
            schedule['_id'] = str(schedule['_id'])

        return jsonify({"schedules": schedules}), 200

    except Exception as e:
        print("Exception occurred:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
@api_bp.route("/user/<user_id>/has-schedules", methods=["GET"])
def check_user_schedules(user_id):
    """Check if a user has any schedules."""
    try:
        user_schedules = get_user_schedules_collection()
        
        # Check for at least one schedule
        schedule_exists = user_schedules.find_one(
            {"userId": user_id},
            {"_id": 1}  # Only retrieve ID for performance
        ) is not None
        
        return jsonify({
            "hasSchedules": schedule_exists
        }), 200
        
    except Exception as e:
        print("Exception occurred:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/tasks/decompose", methods=["POST"])
def api_decompose_task():
    """Handle task decomposition requests."""
    try:
        data = request.json
        if not data or 'task' not in data:
            return jsonify({"error": "Missing task data"}), 400
            
        # Get task and user data
        task_data = data['task']
        user_data = {
            'energy_patterns': data.get('energy_patterns', []),
            'priorities': data.get('priorities', {}),
            'work_start_time': data.get('work_start_time'),
            'work_end_time': data.get('work_end_time')
        }
        
        # Call Colab integration for decomposition
        result = decompose_task(task_data, user_data)
        
        # Handle different response formats safely
        if result:
            if isinstance(result, list):
                if result and isinstance(result[0], dict):
                    # If result is array of objects with 'text' property
                    microstep_texts = [step['text'] for step in result]
                else:
                    # If result is already array of strings
                    microstep_texts = result
            else:
                # If result is a single string, wrap it in a list
                microstep_texts = [str(result)]
        else:
            # Handle empty or None result
            return jsonify({"error": "No decomposition results generated"}), 400
            
        print("Microsteps:", microstep_texts)
        return jsonify(microstep_texts)
        
    except Exception as e:
        print(f"Error in api_decompose_task: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/tasks/microstep-feedback", methods=["POST"])
def api_store_microstep_feedback():
    """
    Handle POST requests for storing microstep feedback.
    Expects JSON data with task_id, microstep_id, accepted, and optional completion_order.
    """
    try:
        # Validate request data
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Required fields validation
        required_fields = ['task_id', 'microstep_id', 'accepted']
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400

        # Prepare feedback data dictionary
        feedback_data = {
            'task_id': data['task_id'],
            'microstep_id': data['microstep_id'],
            'accepted': data['accepted'],
            'completion_order': data.get('completion_order'),  # Optional field
            'timestamp': datetime.utcnow().isoformat()  # Add timestamp
        }

        # Store feedback in database
        db_result = store_microstep_feedback(feedback_data)  # Pass single dictionary argument

        if not db_result:
            return jsonify({
                "error": "Failed to store feedback",
                "database_status": "error",
                "colab_status": "error"
            }), 500

        # Return success response
        return jsonify({
            "database_status": "success",
            "colab_status": "success"
        })

    except Exception as e:
        print(f"Error in api_store_microstep_feedback: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "error": str(e),
            "database_status": "error",
            "colab_status": "error"
        }), 500

# Add new routes for microstep operations
@api_bp.route("/microstep/feedback", methods=["POST"])
def submit_microstep_feedback():
    """Handle feedback submission for microstep suggestions"""
    try:
        feedback_data = request.json
        if not feedback_data or not all(
            k in feedback_data for k in ['task_id', 'microstep_id', 'accepted']
        ):
            return jsonify({
                "error": "Missing required fields"
            }), 400
        
        # Add timestamp if not provided
        if 'timestamp' not in feedback_data:
            feedback_data['timestamp'] = datetime.utcnow().isoformat()
            
        # Store feedback
        success = store_microstep_feedback(feedback_data)
        
        if success:
            return jsonify({
                "message": "Feedback stored successfully",
                "status": "success"
            }), 201
        else:
            return jsonify({
                "error": "Failed to store feedback"
            }), 500
            
    except Exception as e:
        print(f"Error in submit_microstep_feedback: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/schedule/suggestions", methods=["POST"])
def api_generate_suggestions():
    """
    Handle schedule suggestions generation requests.
    
    Expected request body:
    {
        "userId": str,
        "currentSchedule": List[Dict],
        "historicalSchedules": List[List[Dict]],
        "priorities": Dict[str, str],
        "energyPatterns": List[str],
        "workStartTime": str,
        "workEndTime": str
    }
    """
    try:
        # Validate request data
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        required_fields = [
            'userId', 'currentSchedule', 'historicalSchedules',
            'priorities', 'energyPatterns'
        ]
        
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400
        print(data)
        try:
            # Call Colab integration for suggestions
            suggestions = generate_schedule_suggestions(
                user_id=data['userId'],
                current_schedule=data['currentSchedule'],
                historical_schedules=data['historicalSchedules'],
                priorities=data['priorities'],
                energy_patterns=data['energyPatterns'],
                work_start_time=data.get('workStartTime'),
                work_end_time=data.get('workEndTime')
            )
            
            # Store suggestions in database
            stored_suggestions = store_suggestions_in_db(
                user_id=data['userId'],
                date=datetime.now().strftime('%Y-%m-%d'),
                suggestions=suggestions
            )
            
            return jsonify({
                "suggestions": stored_suggestions,
                "metadata": {
                    "generated_at": datetime.now().isoformat(),
                    "count": len(stored_suggestions)
                }
            })
            
        except Exception as e:
            print(f"Error generating suggestions: {e}")
            return jsonify({
                "error": f"Failed to generate suggestions: {str(e)}"
            }), 500
            
    except Exception as e:
        print(f"Error in api_generate_suggestions: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

class MongoJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)

def store_suggestions_in_db(user_id: str, date: str, suggestions: List[Dict]) -> List[Dict]:
    """Store generated suggestions in MongoDB."""
    try:
        suggestions_collection = get_ai_suggestions_collection()
        
        # Prepare suggestions for storage
        suggestions_to_store = []
        for suggestion in suggestions:
            suggestion_doc = {
                "user_id": user_id,
                "date": date,
                **suggestion,
               "created_at": datetime.now(UTC).isoformat() 
            }
            suggestions_to_store.append(suggestion_doc)
        
        # Store suggestions
        if suggestions_to_store:
            result = suggestions_collection.insert_many(suggestions_to_store)
            
            # Update suggestions with generated IDs - convert ObjectId to string
            for suggestion, inserted_id in zip(suggestions_to_store, result.inserted_ids):
                suggestion['id'] = str(inserted_id)  # Convert ObjectId to string
        
        # Use custom encoder when returning
        return json.loads(json.dumps(suggestions_to_store, cls=MongoJSONEncoder))
        
    except Exception as e:
        print(f"Error storing suggestions: {e}")
        # Return original suggestions if storage fails
        return suggestions