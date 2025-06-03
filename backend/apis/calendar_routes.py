from flask import Blueprint, jsonify, request
from backend.db_config import get_database, get_user_schedules_collection
import traceback
from datetime import datetime, timezone
from backend.models.task import Task
import uuid
import requests
import os
import json
from typing import List, Dict, Optional
from firebase_admin import credentials, get_app
import firebase_admin
from backend.services.ai_service import categorize_task

calendar_bp = Blueprint("calendar", __name__)

def initialize_firebase() -> Optional[firebase_admin.App]:
    """Initialize Firebase Admin SDK with credentials from JSON."""
    # Check for existing app
    try:
        return get_app()
    except ValueError:
        print("Firebase not yet initialized, continuing...")
    
    # Get Firebase credentials JSON
    firebase_json = os.environ.get('FIREBASE_JSON')
    
    if not firebase_json:
        print("FIREBASE_JSON environment variable not set")
        raise ValueError("Firebase credentials not found in environment variables")
    
    try:
        # Parse the JSON string
        json_data = json.loads(firebase_json)
        
        # In Railway, the JSON is stored directly, no need for nested fields check
        creds_dict = json_data
        print("Successfully parsed Firebase credentials from JSON")
        
    except json.JSONDecodeError as e:
        print(f"Error parsing Firebase credentials JSON: {str(e)}")
        raise ValueError("Firebase credentials are not valid JSON")
    
    # Initialize Firebase with credentials
    try:
        cred = credentials.Certificate(creds_dict)
        app = firebase_admin.initialize_app(cred)
        print("Successfully initialized Firebase with credentials")
        return app
    except Exception as e:
        print(f"Firebase initialization error: {str(e)}")
        raise ValueError(f"Failed to initialize Firebase: {str(e)}")

def get_user_id_from_token(token: str) -> Optional[str]:
    """
    Verify a Firebase ID token and extract the user ID.
    
    Args:
        token (str): Firebase ID token
    
    Returns:
        Optional[str]: User ID if token is valid, None otherwise
    """
    if not token:
        print("No token provided for verification")
        return None
        
    # Ensure Firebase is initialized
    if not firebase_admin._apps:
        app = initialize_firebase()
        if not app:
            print("Cannot verify token: Firebase initialization failed")
            return None
    
    try:
        from firebase_admin import auth
        decoded_token = auth.verify_id_token(token)
        print(f"DEBUG - Token verification successful. User ID: {decoded_token.get('uid')}")
        return decoded_token.get('uid')
    except Exception as e:
        print(f"DEBUG - Token verification error: {str(e)}")
        print(f"DEBUG - Exception type: {type(e).__name__}")
        traceback.print_exc()
        return None

def fetch_google_calendar_events(access_token: str, date: str) -> List[Dict]:
    """
    Fetch Google Calendar events for a specific date using the access token.
    
    Args:
        access_token (str): Google Calendar access token
        date (str): Date in YYYY-MM-DD format
    
    Returns:
        List[Dict]: List of calendar events
    """
    try:
        # Format date for API request (start and end of day in RFC3339 format)
        start_time = f"{date}T00:00:00Z"
        end_time = f"{date}T23:59:59Z"
        
        # Google Calendar API endpoint
        url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
        
        # Request parameters
        params = {
            'timeMin': start_time,
            'timeMax': end_time,
            'singleEvents': True,
            'orderBy': 'startTime'
        }
        
        # Request headers
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/json'
        }
        
        # Make the API request
        response = requests.get(url, params=params, headers=headers)
        
        if response.status_code == 200:
            events_data = response.json()
            return events_data.get('items', [])
        else:
            print(f"Google Calendar API error: {response.status_code} - {response.text}")
            return []
            
    except Exception as e:
        print(f"Error fetching Google Calendar events: {e}")
        traceback.print_exc()
        return []

def convert_calendar_event_to_task(event: Dict) -> Optional[Dict]:
    """
    Convert a Google Calendar event to a Task object.
    
    Args:
        event (Dict): Google Calendar event data
    
    Returns:
        Optional[Dict]: Task object dictionary or None if conversion fails
    """
    try:
        # Extract event title
        title = event.get('summary', 'Untitled Event')
        
        # Skip if no title or if it's a declined event
        if not title or event.get('status') == 'cancelled':
            return None
        
        # Categorize the event using existing AI service
        categories = categorize_task(title)
        
        # Extract start and end times
        start_time = None
        end_time = None
        
        start_data = event.get('start', {})
        end_data = event.get('end', {})
        
        # Handle both dateTime and date fields (all-day events vs timed events)
        if 'dateTime' in start_data:
            start_dt = datetime.fromisoformat(start_data['dateTime'].replace('Z', '+00:00'))
            start_time = start_dt.strftime('%H:%M')
        
        if 'dateTime' in end_data:
            end_dt = datetime.fromisoformat(end_data['dateTime'].replace('Z', '+00:00'))
            end_time = end_dt.strftime('%H:%M')
        
        # Create Task object
        task_data = {
            'id': str(uuid.uuid4()),
            'text': title,
            'categories': categories,
            'completed': False,
            'is_subtask': False,
            'is_section': False,
            'section': None,
            'parent_id': None,
            'level': 0,
            'section_index': 0,
            'type': 'task',
            'start_time': start_time,
            'end_time': end_time,
            'is_recurring': None,
            'start_date': datetime.now().strftime('%Y-%m-%d'),
            'gcal_event_id': event.get('id'),  # Store original event ID for reference
            'from_gcal': True  # Flag to identify calendar-sourced tasks
        }
        
        return task_data
        
    except Exception as e:
        print(f"Error converting calendar event to task: {e}")
        traceback.print_exc()
        return None

@calendar_bp.route("/connect", methods=["POST"])
def connect_google_calendar():
    """
    Connect a user to Google Calendar after authorization
    
    Expected request body:
    {
        "credentials": {
            "accessToken": str,
            "refreshToken": str (optional),
            "expiresAt": int,
            "scopes": List[str]
        }
    }
    
    Authorization header required with Firebase ID token
    """
    try:
        data = request.json
        if not data or 'credentials' not in data:
            return jsonify({
                "success": False,
                "error": "Missing required parameters"
            }), 400
        
        # Get user ID from token
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]  # Remove 'Bearer ' prefix
        else:
            token = auth_header
            
        user_id = get_user_id_from_token(token)
        if not user_id:
            return jsonify({
                "success": False,
                "error": "Invalid or missing authentication token"
            }), 401
        
        credentials = data['credentials']
        
        # Convert expiresAt timestamp to datetime object
        if 'expiresAt' in credentials and isinstance(credentials['expiresAt'], (int, float)):
            credentials['expiresAt'] = datetime.fromtimestamp(credentials['expiresAt']/1000, tz=timezone.utc)
        
        # Get database instance
        db = get_database()
        users = db['users']
        
        # Update user with calendar credentials
        result = users.update_one(
            {"googleId": user_id},
            {"$set": {
                "calendar.connected": True,
                "calendar.credentials": credentials,
                "calendar.syncStatus": "completed",
                "calendar.lastSyncTime": datetime.now(timezone.utc),
                "calendarSynced": True
            }}
        )
        
        if result.modified_count == 0:
            return jsonify({
                "success": False,
                "error": "User not found"
            }), 404
        
        return jsonify({
            "success": True,
            "data": {
                "connected": True,
                "syncStatus": "completed"
            }
        })
        
    except Exception as e:
        print(f"Error connecting to Google Calendar: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Failed to connect to Google Calendar: {str(e)}"
        }), 500

@calendar_bp.route("/disconnect", methods=["POST"])
def disconnect_google_calendar():
    """
    Disconnect a user's Google Calendar integration
    
    Expected request body:
    {
        "userId": str
    }
    
    Returns:
        JSON response with status of disconnection
    """
    try:
        data = request.json
        if not data or 'userId' not in data:
            return jsonify({
                "success": False,
                "error": "Missing required parameter: userId"
            }), 400
        
        user_id = data['userId']
        
        # Get database instance
        db = get_database()
        users = db['users']
        
        # Update user to remove calendar credentials and connection
        result = users.update_one(
            {"googleId": user_id},
            {"$set": {
                "calendar.connected": False,
                "calendar.credentials": None,
                "calendar.syncStatus": "disconnected",
                "calendar.lastSyncTime": datetime.now(timezone.utc),
                "calendarSynced": False
            }}
        )
        
        if result.modified_count == 0:
            return jsonify({
                "success": False,
                "error": "User not found"
            }), 404
        
        return jsonify({
            "success": True,
            "data": {
                "connected": False,
                "syncStatus": "disconnected"
            }
        })
        
    except Exception as e:
        print(f"Error disconnecting from Google Calendar: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Failed to disconnect from Google Calendar: {str(e)}"
        }), 500

@calendar_bp.route("/events", methods=["GET", "POST"])
def get_calendar_events():
    """
    Fetch Google Calendar events for a user and convert them to tasks
    
    GET method: 
    - Query parameters: date (YYYY-MM-DD)
    - Requires Authorization header with Firebase ID token
    
    POST method:
    - Request body: { "userId": str, "date": str }
    - Direct user ID-based authentication
    
    Returns standardized response with calendar events as tasks
    """
    try:
        # Determine request type and extract parameters
        is_post_request = request.method == "POST"
        
        if is_post_request:
            # Extract from POST body
            data = request.json
            if not data:
                return jsonify({
                    "success": False,
                    "error": "Missing request body"
                }), 400
                
            user_id = data.get('userId')
            date = data.get('date')
            
            if not user_id or not date:
                return jsonify({
                    "success": False,
                    "error": "Missing required parameters: userId and date"
                }), 400
        else:
            # Extract from GET query parameters
            date = request.args.get('date')
            if not date:
                return jsonify({
                    "success": False,
                    "error": "Missing date parameter"
                }), 400
                
            # Get user ID from token
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                token = auth_header[7:]  # Remove 'Bearer ' prefix
            else:
                token = auth_header
            
            user_id = get_user_id_from_token(token)
            if not user_id:
                return jsonify({
                    "success": False,
                    "error": "Invalid or missing authentication token"
                }), 401
        
        # Validate date format
        try:
            datetime.strptime(date, '%Y-%m-%d')
        except ValueError:
            return jsonify({
                "success": False,
                "error": "Invalid date format. Use YYYY-MM-DD"
            }), 400
        
        # Get database instance
        db = get_database()
        users = db['users']
        
        # Get user with calendar credentials
        user = users.find_one({"googleId": user_id})
        
        if not user:
            return jsonify({
                "success": False,
                "error": "User not found",
                "tasks": []
            }), 404 if not is_post_request else 200
        
        calendar_data = user.get('calendar', {})
        if not calendar_data.get('connected') or not calendar_data.get('credentials'):
            return jsonify({
                "success": False,
                "error": "User not connected to Google Calendar",
                "tasks": []
            }), 400 if not is_post_request else 200
        
        # Get access token from stored credentials
        access_token = calendar_data['credentials'].get('accessToken')
        if not access_token:
            return jsonify({
                "success": False,
                "error": "No valid access token found",
                "tasks": []
            }), 400 if not is_post_request else 200
        
        # Fetch events from Google Calendar
        calendar_events = fetch_google_calendar_events(access_token, date)
        
        # Convert events to tasks
        tasks = []
        for event in calendar_events:
            task_data = convert_calendar_event_to_task(event)
            if task_data:
                tasks.append(task_data)
        
        # For GET requests, store the schedule (original /events behavior)
        if not is_post_request:
            store_schedule_for_user(user_id, date, tasks)
        
        # Return unified response format
        response = {
            "success": True,
            "tasks": tasks,
            "count": len(tasks),
            "date": date
        }
        
        return jsonify(response)
        
    except Exception as e:
        print(f"Error fetching Google Calendar events: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Failed to fetch Google Calendar events: {str(e)}",
            "tasks": []
        }), 500 if request.method == "GET" else 200

def store_schedule_for_user(user_id: str, date: str, calendar_tasks: List[Dict]) -> bool:
    """
    Store or update calendar tasks for a user on a specific date
    
    Args:
        user_id: User's Google ID
        date: Date string (YYYY-MM-DD)
        calendar_tasks: List of task objects from calendar
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Get schedules collection
        schedules = get_user_schedules_collection()
        
        # Format date for storage
        date_str = f"{date}T00:00:00"
        date_end = f"{date}T23:59:59"
        
        # Use upsert approach with atomic operations
        update_result = schedules.update_one(
            {
                "userId": user_id,
                "date": {"$gte": date_str, "$lt": date_end}
            },
            {
                # Remove existing calendar tasks and add new ones in one operation
                "$pull": {"tasks": {"from_gcal": True}},
                "$push": {"tasks": {"$each": calendar_tasks}},
                "$set": {
                    "metadata.lastModified": datetime.now(timezone.utc).isoformat(),
                    "metadata.calendarSynced": True,
                    "metadata.calendarEvents": len(calendar_tasks)
                },
                "$setOnInsert": {
                    "userId": user_id,
                    "date": date_str,
                    "metadata.createdAt": datetime.now(timezone.utc).isoformat(),
                }
            },
            upsert=True
        )
        
        return update_result.acknowledged
        
    except Exception as e:
        print(f"Error storing schedule: {e}")
        traceback.print_exc()
        return False

@calendar_bp.route("/status/<user_id>", methods=["GET"])
def get_calendar_status(user_id: str):
    """
    Get the calendar connection status for a user
    
    Args:
        user_id: User's Google ID
    
    Returns:
        JSON response with calendar status properties directly in the response
    """
    try:
        # Get database instance
        db = get_database()
        users = db['users']
        
        # Get user
        user = users.find_one({"googleId": user_id})
        
        if not user:
            return jsonify({
                "success": False,
                "error": "User not found",
                "connected": False,
                "syncStatus": "never",
                "lastSyncTime": None,
                "hasCredentials": False
            }), 404
        
        calendar_data = user.get('calendar', {})
        
        # Return direct structure (not nested under data)
        return jsonify({
            "success": True,
            "connected": calendar_data.get('connected', False),
            "syncStatus": calendar_data.get('syncStatus', 'never'),
            "lastSyncTime": calendar_data.get('lastSyncTime'),
            "hasCredentials": bool(calendar_data.get('credentials'))
        })
        
    except Exception as e:
        print(f"Error getting calendar status: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Failed to get calendar status: {str(e)}",
            "connected": False,
            "syncStatus": "never",
            "lastSyncTime": None,
            "hasCredentials": False
        }), 500