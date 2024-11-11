from flask import Blueprint, jsonify, request
from backend.services.colab_integration import process_user_data, categorize_task, identify_recurring_tasks, decompose_task, send_microstep_feedback
from backend.db_config import get_user_schedules_collection, store_microstep_feedback, get_microstep_feedback_collection, get_decomposition_patterns_collection, get_successful_patterns
import traceback
from bson import ObjectId
from datetime import datetime, timedelta
from pymongo import DESCENDING
from backend.models.task import Task


api_bp = Blueprint("api", __name__)

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

@api_bp.route("/identify_recurring_tasks", methods=["POST"])
def recurring_tasks():
    try:
        data = request.json
        if not data or 'current_schedule' not in data or 'previous_schedules' not in data:
            return jsonify({"error": "Invalid data provided"}), 400
        
        current_schedule = data['current_schedule']
        previous_schedules = data['previous_schedules']
        
        print("Identifying recurring tasks")
        recurring_tasks = identify_recurring_tasks(current_schedule, previous_schedules)
        print("Recurring tasks identified:", recurring_tasks)

        return jsonify({"recurring_tasks": recurring_tasks})

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
        
        # Extract just the text from each microstep
        microstep_texts = [step['text'] for step in result]
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

@api_bp.route("/microstep/patterns", methods=["GET"])
def get_decomposition_patterns():
    """Retrieve successful decomposition patterns for a task"""
    try:
        task_text = request.args.get('task_text')
        categories = request.args.getlist('category')
        
        if not task_text:
            return jsonify({
                "error": "Task text is required"
            }), 400
            
        patterns = get_successful_patterns(
            task_text,
            categories,
            min_success_rate=0.6
        )
        
        return jsonify({
            "patterns": patterns,
            "count": len(patterns)
        })
        
    except Exception as e:
        print(f"Error in get_decomposition_patterns: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/microstep/stats", methods=["GET"])
def get_microstep_stats():
    """Get statistics about microstep usage and success rates"""
    try:
        # Get date range for stats
        days = int(request.args.get('days', 30))
        start_date = datetime.utcnow() - timedelta(days=days)
        
        feedback_collection = get_microstep_feedback_collection()
        
        # Get overall statistics
        total_suggestions = feedback_collection.count_documents({
            'timestamp': {'$gte': start_date.isoformat()}
        })
        
        accepted_suggestions = feedback_collection.count_documents({
            'timestamp': {'$gte': start_date.isoformat()},
            'accepted': True
        })
        
        # Get most successful patterns
        patterns_collection = get_decomposition_patterns_collection()
        top_patterns = patterns_collection.find({
            'last_used': {'$gte': start_date}
        }).sort('success_rate', DESCENDING).limit(10)
        
        return jsonify({
            "total_suggestions": total_suggestions,
            "accepted_suggestions": accepted_suggestions,
            "acceptance_rate": (accepted_suggestions / total_suggestions) if total_suggestions > 0 else 0,
            "top_patterns": list(top_patterns)
        })
        
    except Exception as e:
        print(f"Error in get_microstep_stats: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500