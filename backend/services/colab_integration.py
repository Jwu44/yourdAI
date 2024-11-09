import requests
import urllib3
from backend.models.task import Task
import uuid

# Disable InsecureRequestWarning
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

COLAB_BASE_URL = "https://cac8-35-237-66-241.ngrok-free.app" 

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