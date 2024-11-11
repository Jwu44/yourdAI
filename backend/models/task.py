import uuid
from datetime import datetime
from typing import Optional, Set, Dict, Union, List

class RecurrenceType:
    """
    Represents the recurrence pattern for a task.
    """
    VALID_FREQUENCIES = {'none', 'daily', 'weekly', 'monthly'}
    VALID_DAYS = {'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'}
    VALID_WEEKS = {'first', 'second', 'third', 'fourth', 'last'}

    def __init__(self, 
                 frequency: str, 
                 day_of_week: Optional[str] = None, 
                 week_of_month: Optional[str] = None):
        """
        Initialize a recurrence pattern.
        
        Args:
            frequency: One of 'none', 'daily', 'weekly', 'monthly'
            day_of_week: Day of the week for weekly/monthly recurrence
            week_of_month: Week of the month for monthly recurrence
        """
        if frequency not in self.VALID_FREQUENCIES:
            raise ValueError(f"Invalid frequency. Must be one of {self.VALID_FREQUENCIES}")
        
        if frequency in {'weekly', 'monthly'} and day_of_week not in self.VALID_DAYS:
            raise ValueError(f"Invalid day of week. Must be one of {self.VALID_DAYS}")
        
        if frequency == 'monthly' and week_of_month not in self.VALID_WEEKS:
            raise ValueError(f"Invalid week of month. Must be one of {self.VALID_WEEKS}")

        self.frequency = frequency
        self.day_of_week = day_of_week
        self.week_of_month = week_of_month

    def to_dict(self) -> Dict[str, Optional[str]]:
        """Convert the recurrence pattern to a dictionary."""
        return {
            "frequency": self.frequency,
            "dayOfWeek": self.day_of_week,
            "weekOfMonth": self.week_of_month
        }

    @classmethod
    def from_dict(cls, data: Optional[Dict]) -> Optional['RecurrenceType']:
        """
        Create a RecurrenceType instance from a dictionary.
        
        Args:
            data: Dictionary containing recurrence data
        
        Returns:
            RecurrenceType instance or None if data is invalid
        """
        if not data or not isinstance(data, dict):
            return None
        
        try:
            return cls(
                frequency=data.get("frequency", "none"),
                day_of_week=data.get("dayOfWeek"),
                week_of_month=data.get("weekOfMonth")
            )
        except ValueError:
            return None

class Task:
    """
    Represents a task with various attributes including recurrence patterns.
    """
    def __init__(self, 
                 text: str,
                 categories: Optional[List[str]] = None,
                 id: Optional[str] = None,
                 is_subtask: bool = False,
                 is_microstep: bool = False,
                 completed: bool = False,
                 is_section: bool = False,
                 section: Optional[str] = None,
                 parent_id: Optional[str] = None,
                 level: int = 0,
                 section_index: int = 0,
                 type: str = "task",
                 is_recurring: Optional[Union[Dict, RecurrenceType]] = None,
                 start_date: Optional[str] = None,
                 # New microstep fields
                 rationale: Optional[str] = None,
                 estimated_time: Optional[str] = None,
                 energy_level_required: Optional[str] = None):
                 
        """
        Initialize a task with all its attributes.
        """
        self.id = id or str(uuid.uuid4())
        self.text = text
        self.categories = set(categories) if categories else set()
        self.is_subtask = is_subtask
        self.is_microstep = is_microstep
        self.completed = completed
        self.is_section = is_section
        self.section = section
        self.parent_id = parent_id
        self.level = level
        self.section_index = section_index
        self.type = type
        
        # Add microstep fields
        self.rationale = rationale
        self.estimated_time = estimated_time
        self.energy_level_required = energy_level_required

        # Handle recurrence pattern
        if isinstance(is_recurring, dict):
            self.is_recurring = RecurrenceType.from_dict(is_recurring)
        elif isinstance(is_recurring, RecurrenceType):
            self.is_recurring = is_recurring
        else:
            self.is_recurring = None
            
        self.start_date = start_date

    def to_dict(self) -> Dict:
        """Convert the task to a dictionary representation."""
        base_dict = {
            "id": self.id,
            "text": self.text,
            "categories": list(self.categories),
            "is_subtask": self.is_subtask,
            "is_microstep": self.is_microstep,
            "completed": self.completed,
            "is_section": self.is_section,
            "section": self.section,
            "parent_id": self.parent_id,
            "level": self.level,
            "section_index": self.section_index,
            "type": self.type,
            "is_recurring": self.is_recurring.to_dict() if self.is_recurring else None,
            "start_date": self.start_date,
        }
        
        # Only include microstep fields if they exist
        if self.is_microstep:
            base_dict.update({
                "rationale": self.rationale,
                "estimated_time": self.estimated_time,
                "energy_level_required": self.energy_level_required,
            })
            
        return base_dict

    @classmethod
    def from_dict(cls, data: Dict) -> 'Task':
        """
        Create a Task instance from a dictionary.
        
        Args:
            data: Dictionary containing task data
        
        Returns:
            Task instance
        """
        return cls(
            text=data["text"],
            categories=data.get("categories", []),
            id=data.get("id"),
            is_subtask=data.get("is_subtask", False),
            is_microstep=data.get("is_microstep", False),
            completed=data.get("completed", False),
            is_section=data.get("is_section", False),
            section=data.get("section"),
            parent_id=data.get("parent_id"),
            level=data.get("level", 0),
            section_index=data.get("section_index", 0),
            type=data.get("type", "task"),
            is_recurring=data.get("is_recurring"),
            start_date=data.get("start_date"),
            rationale=data.get("rationale"),
            estimated_time=data.get("estimated_time"),
            energy_level_required=data.get("energy_level_required"),
        )

    def add_category(self, category: str) -> None:
        """Add a category to the task."""
        self.categories.add(category)

    def remove_category(self, category: str) -> None:
        """Remove a category from the task."""
        self.categories.discard(category)

    def toggle_completed(self) -> None:
        """Toggle the completed status of the task."""
        self.completed = not self.completed

    def set_section(self, section: Optional[str]) -> None:
        """Set the section for the task."""
        self.section = section

    def set_parent(self, parent_id: Optional[str]) -> None:
        """Set the parent task and update subtask status."""
        self.parent_id = parent_id
        self.is_subtask = bool(parent_id)

    def set_level(self, level: int) -> None:
        """Set the indentation level of the task."""
        self.level = level

    def set_section_index(self, index: int) -> None:
        """Set the index within the section."""
        self.section_index = index

    def set_type(self, type: str) -> None:
        """Set the type of the task."""
        self.type = type

    def set_recurrence(self, recurrence_data: Optional[Dict]) -> None:
        """
        Set the recurrence pattern for the task.
        
        Args:
            recurrence_data: Dictionary containing recurrence information or None
        """
        if recurrence_data is None:
            self.is_recurring = None
            return

        try:
            self.is_recurring = RecurrenceType.from_dict(recurrence_data)
        except ValueError as e:
            raise ValueError(f"Invalid recurrence data: {str(e)}")

    def __str__(self) -> str:
        """String representation of the task."""
        return f"Task(id={self.id}, text='{self.text}', categories={self.categories})"

    def __repr__(self) -> str:
        """Representation of the task."""
        return self.__str__()