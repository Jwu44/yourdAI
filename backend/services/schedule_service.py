"""
Schedule Service Module

Centralized service for handling all schedule operations including creation,
retrieval, updates, and validation. Provides a clean abstraction layer between 
API routes and database operations.

All schedule creation operations are centralized here for consistency and 
to eliminate code duplication across API routes.
"""

from typing import Dict, List, Any, Tuple, Optional
import traceback

from backend.db_config import get_user_schedules_collection
from backend.models.schedule_schema import (
    validate_schedule_document, 
    format_schedule_date, 
    format_timestamp
)


class ScheduleService:
    """
    Service class for managing schedule operations with proper error handling
    and business logic separation.
    
    Centralizes all schedule CRUD operations to eliminate duplication across API routes.
    """

    def __init__(self):
        """Initialize the schedule service."""
        self.schedules_collection = get_user_schedules_collection()

    def get_schedule_by_date(
        self, 
        user_id: str, 
        date: str
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Retrieve an existing schedule for a specific date.
        
        Args:
            user_id: User's Google ID or Firebase UID
            date: Date string in YYYY-MM-DD format
            
        Returns:
            Tuple of (success: bool, result: Dict) where result contains either
            schedule data on success or error message on failure
        """
        try:            
            # Format date for database query
            formatted_date = format_schedule_date(date)
            # Find schedule in database
            schedule_doc = self.schedules_collection.find_one({
                "userId": user_id,
                "date": formatted_date
            })

            if not schedule_doc:
                return False, {"error": "No schedule found for this date"}

            # Extract schedule data (use 'schedule' field only)
            schedule_tasks = schedule_doc.get('schedule', [])
            metadata_doc = schedule_doc.get('metadata', {})
            
            # Calculate current metadata
            metadata = self._calculate_schedule_metadata(schedule_tasks)
            metadata.update({
                "generatedAt": metadata_doc.get('created_at', ''),
                "lastModified": metadata_doc.get('last_modified', ''),
                "source": metadata_doc.get('source', 'unknown')
            })

            inputs = schedule_doc.get('inputs', {})
            return True, {
                "schedule": schedule_tasks,
                "date": date,
                "metadata": metadata,
                "inputs": inputs
            }

        except Exception as e:
            print(f"Error in get_schedule_by_date: {str(e)}")
            traceback.print_exc()
            return False, {"error": f"Internal error: {str(e)}"}

    def create_schedule_from_ai_generation(
        self,
        user_id: str,
        date: str,
        generated_tasks: List[Dict[str, Any]],
        inputs: Dict[str, Any]
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Create or replace a schedule from AI generation with full input context.
        
        Args:
            user_id: User's Google ID or Firebase UID
            date: Date string in YYYY-MM-DD format
            generated_tasks: List of AI-generated task objects
            inputs: Full user input data used for generation
            
        Returns:
            Tuple of (success: bool, result: Dict) where result contains either
            schedule data on success or error message on failure
        """
        try:
            # Prepare inputs with safe defaults
            processed_inputs = {
                "name": inputs.get('name', ''),
                "work_start_time": inputs.get('work_start_time', ''),
                "work_end_time": inputs.get('work_end_time', ''),
                "working_days": inputs.get('working_days', []),
                "energy_patterns": inputs.get('energy_patterns', []),
                "priorities": inputs.get('priorities', {}),
                "layout_preference": inputs.get('layout_preference', {}),
                "tasks": inputs.get('tasks', [])
            }
            
            # Create schedule document using centralized helper
            schedule_document = self._create_schedule_document(
                user_id=user_id,
                date=date,
                tasks=generated_tasks,
                source="ai_service",
                inputs=processed_inputs
            )
            
            # Validate document before storage
            is_valid, validation_error = validate_schedule_document(schedule_document)
            if not is_valid:
                return False, {"error": f"Schedule validation failed: {validation_error}"}
            
            # Replace existing schedule or create new one (upsert)
            formatted_date = format_schedule_date(date)
            result = self.schedules_collection.replace_one(
                {"userId": user_id, "date": formatted_date},
                schedule_document,
                upsert=True
            )
            
            # Calculate and return response metadata
            metadata = self._calculate_schedule_metadata(generated_tasks)
            metadata.update({
                "generatedAt": schedule_document["metadata"]["created_at"],
                "lastModified": schedule_document["metadata"]["last_modified"],
                "source": "ai_service"
            })
            
            return True, {
                "schedule": generated_tasks,
                "date": date,
                "scheduleId": str(result.upserted_id) if result.upserted_id else "updated",
                "metadata": metadata
            }
            
        except Exception as e:
            print(f"Error in create_schedule_from_ai_generation: {str(e)}")
            traceback.print_exc()
            return False, {"error": f"Failed to create AI-generated schedule: {str(e)}"}

    def create_schedule_from_calendar_sync(
        self,
        user_id: str,
        date: str,
        calendar_tasks: List[Dict[str, Any]]
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Create or merge calendar tasks with existing schedule.
        Preserves non-calendar tasks and adds/updates calendar tasks.
        
        Args:
            user_id: User's Google ID or Firebase UID
            date: Date string in YYYY-MM-DD format
            calendar_tasks: List of calendar task objects to sync
            
        Returns:
            Tuple of (success: bool, result: Dict) where result contains either
            schedule data on success or error message on failure
        """
        try:
            formatted_date = format_schedule_date(date)
            
            # Check if schedule exists
            existing_schedule = self.schedules_collection.find_one({
                "userId": user_id,
                "date": formatted_date
            })
            
            if existing_schedule:
                # Merge calendar tasks with existing non-calendar tasks
                existing_tasks = existing_schedule.get('schedule', [])
                
                # Filter out old calendar tasks, keep non-calendar tasks
                non_calendar_tasks = [
                    task for task in existing_tasks 
                    if not task.get('from_gcal', False)
                ]
                
                # Combine with new calendar tasks
                merged_tasks = non_calendar_tasks + calendar_tasks
                
                # Update existing schedule
                result = self.schedules_collection.update_one(
                    {"userId": user_id, "date": formatted_date},
                    {
                        "$set": {
                            "schedule": merged_tasks,
                            "metadata.last_modified": format_timestamp(),
                            "metadata.calendarSynced": True,
                            "metadata.calendarEvents": len(calendar_tasks)
                        }
                    }
                )
                
                if result.modified_count == 0:
                    return False, {"error": "Failed to update schedule with calendar tasks"}
                
                final_tasks = merged_tasks
                
            else:
                # Create new schedule with calendar tasks only
                schedule_document = self._create_schedule_document(
                    user_id=user_id,
                    date=date,
                    tasks=calendar_tasks,
                    source="calendar_sync"
                )
                
                # Add calendar-specific metadata
                schedule_document["metadata"].update({
                    "calendarSynced": True,
                    "calendarEvents": len(calendar_tasks)
                })
                
                # Validate and insert
                is_valid, validation_error = validate_schedule_document(schedule_document)
                if not is_valid:
                    return False, {"error": f"Schedule validation failed: {validation_error}"}
                
                result = self.schedules_collection.insert_one(schedule_document)
                final_tasks = calendar_tasks
            
            # Calculate metadata for response
            metadata = self._calculate_schedule_metadata(final_tasks)
            metadata.update({
                "generatedAt": format_timestamp(),
                "lastModified": format_timestamp(),
                "source": "calendar_sync",
                "calendarSynced": True,
                "calendarEvents": len(calendar_tasks)
            })
            
            return True, {
                "schedule": final_tasks,
                "date": date,
                "metadata": metadata
            }
            
        except Exception as e:
            print(f"Error in create_schedule_from_calendar_sync: {str(e)}")
            traceback.print_exc()
            return False, {"error": f"Failed to sync calendar schedule: {str(e)}"}

    def create_empty_schedule(
        self,
        user_id: str,
        date: str,
        tasks: Optional[List[Dict[str, Any]]] = None,
        inputs: Optional[Dict[str, Any]] = None
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Create a basic schedule manually with optional initial tasks.
        
        Args:
            user_id: User's Google ID or Firebase UID
            date: Date string in YYYY-MM-DD format
            tasks: Optional list of initial task objects (defaults to empty list)
            inputs: Optional user input data for schedule generation context
            
        Returns:
            Tuple of (success: bool, result: Dict) where result contains either
            schedule data on success or error message on failure
        """
        try:
            # Default to empty task list if none provided
            initial_tasks = tasks if tasks is not None else []
            
            # Create schedule document using centralized helper
            schedule_document = self._create_schedule_document(
                user_id=user_id,
                date=date,
                tasks=initial_tasks,
                source="manual",
                inputs=inputs
            )
            
            # Validate document before storage
            is_valid, validation_error = validate_schedule_document(schedule_document)
            if not is_valid:
                return False, {"error": f"Schedule validation failed: {validation_error}"}
            
            # Replace existing schedule or create new one (upsert)
            formatted_date = format_schedule_date(date)
            result = self.schedules_collection.replace_one(
                {"userId": user_id, "date": formatted_date},
                schedule_document,
                upsert=True
            )
            
            # Calculate response metadata
            metadata = self._calculate_schedule_metadata(initial_tasks)
            metadata.update({
                "generatedAt": schedule_document["metadata"]["created_at"],
                "lastModified": schedule_document["metadata"]["last_modified"],
                "source": "manual"
            })
            
            return True, {
                "schedule": initial_tasks,
                "date": date,
                "scheduleId": str(result.upserted_id) if result.upserted_id else "updated",
                "metadata": metadata
            }
            
        except Exception as e:
            print(f"Error in create_empty_schedule: {str(e)}")
            traceback.print_exc()
            return False, {"error": f"Failed to create manual schedule: {str(e)}"}

    def update_schedule_tasks(
        self, 
        user_id: str, 
        date: str, 
        tasks: List[Dict[str, Any]]
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Update an existing schedule with new tasks, or create if it doesn't exist.
        Now implements upsert behavior for seamless manual task addition.
        
        Args:
            user_id: User's Google ID or Firebase UID
            date: Date string in YYYY-MM-DD format
            tasks: List of task objects to update the schedule with
            
        Returns:
            Tuple of (success: bool, result: Dict) where result contains either
            updated schedule data on success or error message on failure
        """
        try:
            # Format date for database query
            formatted_date = format_schedule_date(date)
            
            # Check if schedule exists
            existing_schedule = self.schedules_collection.find_one({
                "userId": user_id,
                "date": formatted_date
            })

            if existing_schedule:
                # Update existing schedule
                # Validate updated document structure
                temp_doc = {
                    **existing_schedule,
                    "schedule": tasks,
                    "metadata": {
                        **existing_schedule.get('metadata', {}),
                        "last_modified": format_timestamp(),
                        "source": "manual"
                    }
                }
                
                is_valid, validation_error = validate_schedule_document(temp_doc)
                if not is_valid:
                    return False, {"error": f"Schedule validation failed: {validation_error}"}

                # Update the schedule
                result = self.schedules_collection.update_one(
                    {"_id": existing_schedule["_id"]},
                    {
                        "$set": {
                            "schedule": tasks,
                            "metadata.last_modified": format_timestamp(),
                            "metadata.source": "manual"
                        }
                    }
                )

                if result.modified_count == 0:
                    return False, {"error": "Failed to update schedule"}

                # Calculate metadata
                metadata = self._calculate_schedule_metadata(tasks)
                metadata.update({
                    "generatedAt": existing_schedule.get('metadata', {}).get('created_at', ''),
                    "lastModified": format_timestamp(),
                    "source": "manual"
                })

                return True, {
                    "schedule": tasks,
                    "date": date,
                    "metadata": metadata
                }
            else:
                # No existing schedule - create new one using create_empty_schedule logic
                return self.create_empty_schedule(user_id, date, tasks)

        except Exception as e:
            print(f"Error in update_schedule_tasks: {str(e)}")
            traceback.print_exc()
            return False, {"error": f"Internal error: {str(e)}"}

    def _create_schedule_document(
        self,
        user_id: str,
        date: str,
        tasks: List[Dict[str, Any]],
        source: str,
        inputs: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Internal helper method to create consistent schedule documents.
        Centralizes document structure creation to eliminate duplication.
        
        Args:
            user_id: User's Google ID or Firebase UID
            date: Date string in YYYY-MM-DD format
            tasks: List of task objects for the schedule
            source: Source of schedule creation ("ai_service", "calendar", "manual")
            inputs: Optional user input data (defaults to empty structure)
            
        Returns:
            Complete schedule document ready for database storage
        """
        # Format date consistently
        formatted_date = format_schedule_date(date)
        
        # Prepare default inputs structure if not provided
        default_inputs = {
            "name": "",
            "work_start_time": "",
            "work_end_time": "",
            "working_days": [],
            "energy_patterns": [],
            "priorities": {},
            "layout_preference": {},
            "tasks": []
        }
        
        # Use provided inputs or defaults
        document_inputs = inputs if inputs is not None else default_inputs
        
        # Create consistent document structure
        return {
            "userId": user_id,
            "date": formatted_date,
            "schedule": tasks,
            "inputs": document_inputs,
            "metadata": {
                "created_at": format_timestamp(),
                "last_modified": format_timestamp(),
                "source": source
            }
        }

    def _calculate_schedule_metadata(
        self, 
        tasks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate metadata from task list.
        
        Args:
            tasks: List of task objects
            
        Returns:
            Dictionary containing calculated metadata
        """
        non_section_tasks = [t for t in tasks if not t.get('is_section', False)]
        calendar_events = [t for t in tasks if t.get('gcal_event_id')]
        recurring_tasks = [t for t in tasks if t.get('is_recurring')]

        return {
            "totalTasks": len(non_section_tasks),
            "calendarEvents": len(calendar_events),
            "recurringTasks": len(recurring_tasks),
            "generatedAt": format_timestamp()
        }


# Create singleton instance for import
schedule_service = ScheduleService()