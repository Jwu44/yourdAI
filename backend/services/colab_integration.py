import requests
import urllib3
from backend.models.task import Task
import uuid
from typing import List, Dict, Optional, Union
from datetime import datetime
import json
from cachetools import TTLCache, LRUCache

# Disable InsecureRequestWarning
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

COLAB_BASE_URL = "https://2926-35-229-68-211.ngrok-free.app" 

# Add cache for decomposition results (TTL of 24 hours, max 1000 entries)
decomposition_cache = TTLCache(maxsize=1000, ttl=86400)
# Add LRU cache for frequent tasks (max 100 entries)
frequent_tasks_cache = LRUCache(maxsize=100)

def process_user_data(user_data):
    colab_url = f"{COLAB_BASE_URL}/process_user_data"
    
    # Convert Task objects to dictionaries
    if 'tasks' in user_data:
        user_data['tasks'] = [task.to_dict() if isinstance(task, Task) else task for task in user_data['tasks']]
    
    try:
        response = requests.post(colab_url, json=user_data, verify=False)
        
        if response.status_code == 200:
            result = response.json()
            
            # Convert task dictionaries back to Task objects
            if 'tasks' in result:
                result['tasks'] = [Task.from_dict(task) if isinstance(task, dict) else task for task in result['tasks']]
            
            return result
        else:
            raise Exception(f"Colab processing failed: {response.text}")
    
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        raise

def categorize_task(task_text):
    url = f"{COLAB_BASE_URL}/categorize_task"
    
    try:
        response = requests.post(url, json={"task": task_text}, verify=False)
        
        if response.status_code == 200:
            result = response.json()
            category = result.get('category', 'Work')
            
            # Ensure category is a list, even if there's only one category
            category = category if isinstance(category, list) else [category]
            
            # Create a Task object
            task = Task(id=str(uuid.uuid4()), text=task_text, categories=category)
            
            # Return a dictionary representation of the Task
            return task.to_dict()
        else:
            raise Exception(f"Task categorization failed: {response.text}")
    
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        raise

def identify_recurring_tasks(current_schedule, previous_schedules):
    url = f"{COLAB_BASE_URL}/identify_recurring_tasks"
    
    data = {
        "current_schedule": current_schedule,
        "previous_schedules": previous_schedules
    }
    
    try:
        response = requests.post(url, json=data, verify=False)
        
        if response.status_code == 200:
            result = response.json()
            return result.get('recurring_tasks', [])
        else:
            raise Exception(f"Recurring tasks identification failed: {response.text}")
    
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        raise

def decompose_task(task_data: Dict, user_data: Dict) -> Dict:
    """
    Send task decomposition request to Colab.
    
    Args:
        task_data: Dictionary containing task information
        user_data: Dictionary containing user context and preferences
    
    Returns:
        Dictionary containing microsteps from Colab
    """
    url = f"{COLAB_BASE_URL}/decompose_task"
    
    # Check cache first
    task_text = str(task_data.get('text', ''))
    categories = task_data.get('categories', [])
    
    # Create cache key using task text instead of whole task object
    cache_key = f"{task_text}_{json.dumps(categories)}"
    if cache_key in decomposition_cache:
        print(f"Cache hit for task: {task_data['text']}")
        return decomposition_cache[cache_key]

    try:
        request_data = {
            "task": task_data,
            "user_context": user_data
        }
        print(request_data)
        response = requests.post(url, json=request_data, verify=False)
        
        if response.status_code == 200:
            result = response.json()
            microsteps = result.get('microsteps', [])
            print(microsteps)
            # Cache the result
            decomposition_cache[cache_key] = result
            return microsteps
        else:
            raise Exception(f"Task decomposition failed: {response.text}")
    
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        raise

def send_microstep_feedback(feedback_data: Dict) -> Dict:
    """
    Send microstep feedback to Colab for pattern learning.
    
    Args:
        feedback_data: Dictionary containing feedback information
    
    Returns:
        Response from Colab
    """
    url = f"{COLAB_BASE_URL}/store_microstep_feedback"
    
    try:
        response = requests.post(url, json=feedback_data, verify=False)
        
        if response.status_code == 200:
            result = response.json()
            return result
        else:
            raise Exception(f"Storing microstep feedback failed: {response.text}")
    
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        raise

def generate_schedule_suggestions(
    user_id: str,
    current_schedule: List[Dict],
    historical_schedules: List[List[Dict]],
    priorities: Dict[str, str],
    energy_patterns: List[str],
    work_start_time: str = None,
    work_end_time: str = None
) -> List[Dict]:
    """
    Send schedule suggestions request to Colab.
    
    Args:
        user_id: User identifier
        current_schedule: Current day's schedule
        historical_schedules: Previous schedules (up to 14 days)
        priorities: User's priority rankings
        energy_patterns: User's energy pattern preferences
        work_start_time: Optional work start time
        work_end_time: Optional work end time
    
    Returns:
        List of AI-generated suggestions
    """
    url = f"{COLAB_BASE_URL}/generate_schedule_suggestions"

    try:
        # Prepare request data
        request_data = {
            "user_data": {
                "user_id": user_id,
                "current_schedule": current_schedule,
                "historical_schedules": historical_schedules,
                "priorities": priorities,
                "energy_patterns": energy_patterns,
                "work_start_time": work_start_time,
                "work_end_time": work_end_time
            }
        }

        # Make request to Colab
        response = requests.post(url, json=request_data, verify=False)
        
        if response.status_code == 200:
            result = response.json()
            suggestions = result.get('suggestions', [])
        
            return suggestions
        else:
            raise Exception(f"Schedule suggestions generation failed: {response.text}")
    
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        raise