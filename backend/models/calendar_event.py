from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from bson import ObjectId

class CalendarEvent:
    """
    Model for Google Calendar events stored in MongoDB
    """
    def __init__(
        self,
        id: str = None,
        user_id: str = None,
        gcal_event_id: str = None,
        calendar_id: str = "primary",
        summary: str = "",
        description: str = None,
        location: str = None,
        start: Dict[str, str] = None,
        end: Dict[str, str] = None,
        recurrence: List[str] = None,
        status: str = "confirmed",
        created: str = None,
        updated: str = None,
        creator: Dict[str, str] = None,
        organizer: Dict[str, str] = None,
        attendees: List[Dict[str, Any]] = None,
        reminders: Dict[str, Any] = None,
        transparency: str = None,
        visibility: str = "default",
        is_synced: bool = True,
        task_id: str = None,
        sync_timestamp: str = None
    ):
        """
        Initialize a new CalendarEvent
        
        Args:
            id: MongoDB ID (will be auto-assigned if None)
            user_id: User's Google ID
            gcal_event_id: Original Google Calendar event ID
            calendar_id: ID of the calendar (default "primary")
            summary: Event title
            description: Event description
            location: Event location
            start: Event start time with dateTime or date field
            end: Event end time with dateTime or date field
            recurrence: Recurrence rules
            status: Event status (confirmed, tentative, cancelled)
            created: Creation timestamp
            updated: Last update timestamp
            creator: Event creator info
            organizer: Event organizer info
            attendees: List of event attendees
            reminders: Reminder settings
            transparency: Whether event blocks time on calendar
            visibility: Event visibility setting
            is_synced: Whether event is in sync with Google Calendar
            task_id: ID of the corresponding Task object
            sync_timestamp: Last synchronization timestamp
        """
        self.id = id or str(ObjectId())
        self.user_id = user_id
        self.gcal_event_id = gcal_event_id
        self.calendar_id = calendar_id
        self.summary = summary
        self.description = description
        self.location = location
        self.start = start or {}
        self.end = end or {}
        self.recurrence = recurrence
        self.status = status
        self.created = created or datetime.now().isoformat()
        self.updated = updated or datetime.now().isoformat()
        self.creator = creator
        self.organizer = organizer
        self.attendees = attendees
        self.reminders = reminders
        self.transparency = transparency
        self.visibility = visibility
        self.is_synced = is_synced
        self.task_id = task_id
        self.sync_timestamp = sync_timestamp or datetime.now().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for MongoDB storage"""
        return {
            "_id": ObjectId(self.id) if isinstance(self.id, str) else self.id,
            "user_id": self.user_id,
            "gcal_event_id": self.gcal_event_id,
            "calendar_id": self.calendar_id,
            "summary": self.summary,
            "description": self.description,
            "location": self.location,
            "start": self.start,
            "end": self.end,
            "recurrence": self.recurrence,
            "status": self.status,
            "created": self.created,
            "updated": self.updated,
            "creator": self.creator,
            "organizer": self.organizer,
            "attendees": self.attendees,
            "reminders": self.reminders,
            "transparency": self.transparency,
            "visibility": self.visibility,
            "is_synced": self.is_synced,
            "task_id": self.task_id,
            "sync_timestamp": self.sync_timestamp
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CalendarEvent':
        """Create an event instance from a dictionary"""
        if "_id" in data:
            data["id"] = str(data.pop("_id"))
        return cls(**data)
    
    def to_task_dict(self) -> Dict[str, Any]:
        """Convert event to Task format for frontend"""
        return {
            "id": self.task_id or str(ObjectId()),
            "text": self.summary,
            "completed": False,
            "start_time": self.start.get("dateTime"),
            "end_time": self.end.get("dateTime"),
            "gcal_event_id": self.gcal_event_id,
            "is_recurring": {"frequency": "daily"} if self.recurrence else None,
            "type": "event",
            "categories": ["Calendar"],
            "section": "Calendar Events",
            "is_section": False,
            "description": self.description
        }
    
    @classmethod
    def from_google_event(cls, google_event: Dict[str, Any], user_id: str) -> 'CalendarEvent':
        """Create a CalendarEvent from a Google Calendar API response"""
        task_id = str(ObjectId())
        
        return cls(
            user_id=user_id,
            gcal_event_id=google_event.get("id"),
            calendar_id=google_event.get("calendarId", "primary"),
            summary=google_event.get("summary", "Untitled Event"),
            description=google_event.get("description"),
            location=google_event.get("location"),
            start=google_event.get("start", {}),
            end=google_event.get("end", {}),
            recurrence=google_event.get("recurrence"),
            status=google_event.get("status", "confirmed"),
            created=google_event.get("created"),
            updated=google_event.get("updated"),
            creator=google_event.get("creator"),
            organizer=google_event.get("organizer"),
            attendees=google_event.get("attendees"),
            reminders=google_event.get("reminders"),
            transparency=google_event.get("transparency"),
            visibility=google_event.get("visibility", "default"),
            task_id=task_id
        )