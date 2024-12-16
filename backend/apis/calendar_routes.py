from flask import Blueprint, jsonify, request
from backend.db_config import (
    get_database, 
    get_users_collection,
    get_user_schedules_collection,
    sync_calendar_status
)
from datetime import datetime, timedelta
from typing import Dict, Any
import requests
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

calendar_bp = Blueprint("calendar", __name__)

# Helper function to convert Google Calendar events to yourdai tasks
def convert_event_to_task(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert Google Calendar event to yourdai task format.
    Adds special flags to identify calendar-sourced tasks.
    """
    return {
        "id": f"gcal_{event['id']}",  # Prefix to identify calendar-sourced tasks
        "text": event['summary'],
        "completed": False,
        "is_section": False,
        "is_subtask": False,
        "start_time": event.get('start', {}).get('dateTime'),
        "end_time": event.get('end', {}).get('dateTime'),
        "from_gcal": True,  # Flag to identify calendar-sourced tasks
        "categories": ["calendar"]  # Tag calendar tasks
    }

@calendar_bp.route("/connect", methods=["POST"])
def connect_calendar():
    """Connect user's Google Calendar"""
    try:
        data = request.json
        user_id = data.get('userId')
        selected_calendars = data.get('selectedCalendars', [])

        if not user_id:
            return jsonify({"error": "User ID is required"}), 400

        users = get_users_collection()
        
        # Update user's calendar connection status
        result = users.update_one(
            {"googleId": user_id},
            {
                "$set": {
                    "calendar.connected": True,
                    "calendar.syncStatus": "in_progress",
                    "calendar.selectedCalendars": selected_calendars,
                    "calendar.lastSyncTime": datetime.utcnow().isoformat(),
                    "calendar.error": None
                }
            }
        )

        if result.modified_count == 0:
            return jsonify({"error": "User not found"}), 404

        return jsonify({
            "message": "Calendar connected successfully",
            "status": "in_progress",
            "selectedCalendars": selected_calendars
        })

    except Exception as e:
        print(f"Error connecting calendar: {e}")
        return jsonify({"error": str(e)}), 500

@calendar_bp.route("/disconnect", methods=["POST"])
def disconnect_calendar():
    """Disconnect user's Google Calendar"""
    try:
        data = request.json
        user_id = data.get('userId')

        if not user_id:
            return jsonify({"error": "User ID is required"}), 400

        users = get_users_collection()
        
        # Update user's calendar connection status
        result = users.update_one(
            {"googleId": user_id},
            {
                "$set": {
                    "calendar.connected": False,
                    "calendar.syncStatus": "never",
                    "calendar.selectedCalendars": [],
                    "calendar.lastSyncTime": None,
                    "calendar.error": None
                }
            }
        )

        if result.modified_count == 0:
            return jsonify({"error": "User not found"}), 404

        return jsonify({
            "message": "Calendar disconnected successfully",
            "status": "never"
        })

    except Exception as e:
        print(f"Error disconnecting calendar: {e}")
        return jsonify({"error": str(e)}), 500

@calendar_bp.route("/status/<user_id>", methods=["GET"])
def check_calendar_status(user_id: str):
    """Check user's calendar connection status"""
    try:
        users = get_users_collection()
        user = users.find_one({"googleId": user_id})

        if not user:
            return jsonify({"error": "User not found"}), 404

        calendar_status = {
            "connected": user.get("calendar", {}).get("connected", False),
            "syncStatus": user.get("calendar", {}).get("syncStatus", "never"),
            "lastSyncTime": user.get("calendar", {}).get("lastSyncTime"),
            "selectedCalendars": user.get("calendar", {}).get("selectedCalendars", []),
            "error": user.get("calendar", {}).get("error")
        }

        return jsonify(calendar_status)

    except Exception as e:
        print(f"Error checking calendar status: {e}")
        return jsonify({"error": str(e)}), 500

@calendar_bp.route("/verify-permissions", methods=["POST"])
def verify_calendar_permissions():
    """Verify user's calendar permissions"""
    try:
        data = request.json
        token = data.get('accessToken')
        
        if not token:
            return jsonify({"error": "Access token is required"}), 400

        # Make a test request to Google Calendar API
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json"
        }
        
        response = requests.get(
            "https://www.googleapis.com/calendar/v3/users/me/calendarList",
            headers=headers
        )

        if response.status_code == 200:
            calendars = response.json().get('items', [])
            return jsonify({
                "hasPermissions": True,
                "availableCalendars": [
                    {
                        "id": cal['id'],
                        "summary": cal['summary'],
                        "primary": cal.get('primary', False)
                    }
                    for cal in calendars
                ]
            })
        else:
            return jsonify({
                "hasPermissions": False,
                "error": "Failed to access Google Calendar API"
            }), 403

    except Exception as e:
        print(f"Error verifying calendar permissions: {e}")
        return jsonify({"error": str(e)}), 500

# New sync routes
@calendar_bp.route("/sync/initial", methods=["POST"])
def initial_sync():
    """
    Sync today's calendar events to tasks.
    Converts calendar events to tasks and adds them to today's schedule.
    """
    try:
        data = request.json
        user_id = data.get('userId')
        
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400

        # Get user's calendar credentials
        users = get_users_collection()
        user = users.find_one({"googleId": user_id})
        
        if not user or not user.get('calendar', {}).get('credentials'):
            return jsonify({"error": "Calendar credentials not found"}), 404

        # Update sync status to in_progress
        sync_calendar_status(user_id, "in_progress")
        
        # Setup Google Calendar API client
        credentials = Credentials(**user['calendar']['credentials'])
        service = build('calendar', 'v3', credentials=credentials)

        # Calculate today's time range
        today = datetime.now().date()
        time_min = datetime.combine(today, datetime.min.time()).isoformat() + 'Z'
        time_max = datetime.combine(today, datetime.max.time()).isoformat() + 'Z'

        # Fetch today's events from Google Calendar
        events_result = service.events().list(
            calendarId='primary',
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy='startTime'
        ).execute()

        events = events_result.get('items', [])
        
        # Convert events to yourdai tasks
        calendar_tasks = [convert_event_to_task(event) for event in events]
        
        # Get current schedule
        schedules = get_user_schedules_collection()
        today_str = today.isoformat()
        current_schedule = schedules.find_one({
            "userId": user_id,
            "date": f"{today_str}T00:00:00"
        })

        if current_schedule:
            # Avoid duplicates by checking task text
            existing_task_texts = {task['text'] for task in current_schedule['tasks']}
            new_tasks = [
                task for task in calendar_tasks 
                if task['text'] not in existing_task_texts
            ]
            
            # Update schedule with new tasks
            if new_tasks:
                updated_tasks = current_schedule['tasks'] + new_tasks
                schedules.update_one(
                    {"_id": current_schedule["_id"]},
                    {"$set": {
                        "tasks": updated_tasks,
                        "metadata.lastModified": datetime.utcnow().isoformat()
                    }}
                )

        # Update sync status with metadata
        users.update_one(
            {"googleId": user_id},
            {"$set": {
                "calendar.syncStatus": "completed",
                "calendar.lastSyncTime": datetime.utcnow().isoformat(),
                "calendar.eventsSynced": len(events),
                "calendar.error": None
            }}
        )

        return jsonify({
            "success": True,
            "eventsSynced": len(events),
            "tasksAdded": len(calendar_tasks)
        })

    except HttpError as error:
        # Handle Google Calendar API specific errors
        error_message = f"Calendar API error: {error.reason}"
        sync_calendar_status(user_id, "failed")
        return jsonify({"error": error_message}), 500
    except Exception as e:
        # Handle general errors
        error_message = f"Sync error: {str(e)}"
        sync_calendar_status(user_id, "failed")
        return jsonify({"error": error_message}), 500

@calendar_bp.route("/sync/next-day", methods=["POST"])
def next_day_sync():
    """
    Sync tomorrow's calendar events during next day generation.
    Similar to initial sync but for tomorrow's date.
    """
    try:
        data = request.json
        user_id = data.get('userId')
        
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400

        # Get user's calendar credentials
        users = get_users_collection()
        user = users.find_one({"googleId": user_id})
        
        if not user or not user.get('calendar', {}).get('credentials'):
            return jsonify({"error": "Calendar credentials not found"}), 404

        # Setup Google Calendar API client
        credentials = Credentials(**user['calendar']['credentials'])
        service = build('calendar', 'v3', credentials=credentials)

        # Calculate tomorrow's time range
        tomorrow = datetime.now().date() + timedelta(days=1)
        time_min = datetime.combine(tomorrow, datetime.min.time()).isoformat() + 'Z'
        time_max = datetime.combine(tomorrow, datetime.max.time()).isoformat() + 'Z'

        # Fetch tomorrow's events
        events_result = service.events().list(
            calendarId='primary',
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy='startTime'
        ).execute()

        events = events_result.get('items', [])
        calendar_tasks = [convert_event_to_task(event) for event in events]

        return jsonify({
            "success": True,
            "eventsSynced": len(events),
            "tasks": calendar_tasks  # Return tasks for integration with generateNextDay
        })

    except HttpError as error:
        return jsonify({
            "success": False,
            "error": f"Calendar API error: {error.reason}"
        }), 500
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Next day sync error: {str(e)}"
        }), 500

@calendar_bp.route("/sync/status/<user_id>", methods=["GET"])
def sync_status(user_id: str):
    """
    Get detailed calendar sync status with metadata.
    Includes number of events synced and any error information.
    """
    try:
        users = get_users_collection()
        user = users.find_one({"googleId": user_id})
        
        if not user:
            return jsonify({"error": "User not found"}), 404

        calendar_status = user.get('calendar', {})
        return jsonify({
            "syncStatus": calendar_status.get('syncStatus', 'never'),
            "lastSyncTime": calendar_status.get('lastSyncTime'),
            "eventsSynced": calendar_status.get('eventsSynced', 0),
            "error": calendar_status.get('error')
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500