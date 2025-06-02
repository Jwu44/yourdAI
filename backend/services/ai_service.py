"""
AI Service Module - Local implementation of AI functionality previously in Colab

This module provides direct access to AI services for:
- Schedule generation
- Task categorization
- Task decomposition
- Schedule suggestions
"""

import os
import re
import json
import anthropic
from typing import List, Dict, Any, Tuple, Optional
from cachetools import TTLCache, LRUCache
from backend.models.task import Task
from dotenv import load_dotenv
from backend.data import schedules_rag

# Load environment variables from .env file
load_dotenv()

# Initialize the Anthropic client
anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY")
client = anthropic.Anthropic(api_key=anthropic_api_key)

# Add cache for decomposition results (TTL of 24 hours, max 1000 entries)
decomposition_cache = TTLCache(maxsize=1000, ttl=86400)
# Add LRU cache for frequent tasks (max 100 entries)
frequent_tasks_cache = LRUCache(maxsize=100)
# Add cache for storing successful decomposition patterns
decomposition_patterns_cache = {}

def create_prompt_schedule(user_data: Dict[str, Any]) -> Tuple[str, str]:
    """
    Creates a prompt for schedule generation based on user data.
    
    Args:
        user_data: Dictionary containing user preferences and tasks
        
    Returns:
        Tuple of (system_prompt, user_prompt)
    """
    # Extract user data
    # Use default work times if not provided
    work_start_time = user_data.get('work_start_time', '9:00 AM')
    work_end_time = user_data.get('work_end_time', '05:00 PM')
    work_schedule = f"{work_start_time} - {work_end_time}"
    energy_patterns = ', '.join(user_data['energy_patterns'])
    priorities = user_data['priorities']
    layout_preference = user_data['layout_preference']

    # Process tasks
    tasks = user_data['tasks']
    categorized_tasks = {
        'Work': [], 'Exercise': [], 'Relationship': [],
        'Fun': [], 'Ambition': []
    }

    # this could be more efficient instead of n^2
    for task in tasks:
        for category in task.categories:
            if category in categorized_tasks:
                categorized_tasks[category].append(task.text)

    # Convert priorities to a sorted list of tuples (category, rank)
    priority_list = sorted(priorities.items(), key=lambda x: x[1], reverse=True)
    priority_description = ", ".join([f"{category} (rank {rank})" for category, rank in priority_list])
    
    # Get example schedule using the helper function
    example_schedule = generate_composite_example(layout_preference)
    print(example_schedule)
    
    # Create a more comprehensive system prompt
    system_prompt = """You are an expert psychologist and occupational therapist specializing in personalized daily planning and work-life balance optimization. Your role is to create a tailored schedule for your client's day that maximizes productivity, well-being, and personal growth. Based on client preferences, energy patterns, and priorities, you'll create an optimized schedule that follows their preferred structure and task ordering pattern."""

    # Create detailed user prompt with ordering pattern instructions
    user_prompt = f"""
    Here is the client's information:

    <client_info>
    <work_schedule>{work_schedule}</work_schedule>
    <energy_patterns>{energy_patterns}</energy_patterns>
    <priority_description>{priority_description}</priority_description>
    </client_info>

    Here are the client's tasks categorized:

    <tasks>
    <work_tasks>{', '.join(categorized_tasks['Work'])}</work_tasks>
    <exercise_tasks>{',_'.join(categorized_tasks['Exercise'])}</exercise_tasks>
    <relationship_tasks>{',_'.join(categorized_tasks['Relationship'])}</relationship_tasks>
    <fun_tasks>{',_'.join(categorized_tasks['Fun'])}</fun_tasks>
    <ambition_tasks>{',_'.join(categorized_tasks['Ambition'])}</ambition_tasks>
    </tasks>

    Instructions for creating the personalized schedule:

    1. Analyze the client's information carefully.
    2. Create a balanced schedule that adheres to the following guidelines:
       a. Schedule work tasks strictly within the specified work schedule, considering the client's energy patterns.
       b. Outside work hours, focus on personal tasks (exercise, relationship, fun, or ambition) based on the client's priority rankings and energy patterns.
       c. For tasks with multiple categories, prioritize according to the client's priority description.
       d. Apply the specified task ordering pattern as outlined below.
    3. Format the schedule as follows:
       a. If the ordering pattern is 'timebox', include specific times for each task.
       b. If the ordering pattern is not 'timebox', list tasks in the order they should be performed without specific times.
       c. Apply the correct schedule layout by referring to this example of the desired output format: {example_schedule}
    4. Ensure the language of the schedule is:
       a. Clear, concise, and conversational.
       b. Free of jargon and unnecessary complexity.
       c. Without explanations or notes sections.
       d. Without category labels for each task.
    5. Important: Ensure each task is listed separately. Do not combine multiple tasks into a single entry.
    6. Only include tasks that the client has provided. Do not add any new tasks.

    Please structure your response as follows:

    <schedule_planning>
    1. List all tasks from each category
    2. Analyze energy patterns and work schedule to determine optimal task placement
    3. Consider priority rankings when scheduling personal tasks
    4. Apply the specified task ordering pattern to optimize productivity and energy management
    5. Ensure the schedule follows the requested layout structure and timeboxing preference
    6. Create the final schedule based on the above analysis
    </schedule_planning>

    <schedule>
    [The final personalized schedule]
    </schedule>

    If requested to provide JSON format, also include a structured representation of the schedule.

    Remember to adhere to all guidelines and requirements outlined above when creating the schedule.
    """

    return system_prompt, user_prompt

def create_prompt_categorize(task: str) -> str:
    """
    Creates a prompt for task categorization.
    
    Args:
        task: The task text to categorize
        
    Returns:
        Formatted prompt string
    """
    prompt = f"""Given the following 5 categories to an ordinary life:
    1. Exercise - such as walking, running, swimming, gym, bouldering etc...
    2. Relationships - activities with friends, family, colleagues, etc...
    3. Fun - personal hobbies such as painting, croteching, baking, gaming, etc.., or miscallenous activities like shopping or packing etc...
    4. Ambition - short term or long term goals someone wants to achieve
    5. Work - such as going through emails, attending meetings etc... and do not fall in the same category as exercise, relationships, fun or ambitions.

    Categorize the following task: {task}.

    Respond only with the category name.
    The task may belong to multiple categories. Ensure if a task has been categorised as 'Work', then there should be no other category. Respond with a comma-separated list of category names, or 'Work' if no categories apply.
    """

    return prompt

def create_prompt_decompose(task: str, user_data: Dict[str, Any], categories: List[str]) -> str:
    """
    Creates a prompt for decomposing a task into microsteps.

    Args:
        task: The task to decompose
        user_data: User preferences and context
        categories: Task categories

    Returns:
        Formatted prompt string
    """
    # Extract relevant user context
    energy_patterns = ', '.join(user_data.get('energy_patterns', []))
    priorities = ', '.join(f"{k}: {v}" for k, v in user_data.get('priorities', {}).items())

    prompt = f"""You are an expert in behavior change and productivity optimization, tasked with helping users break down their goals into achievable microsteps. Your role is to analyze the given task and user context, then create a set of practical, science-backed microsteps that will lead to successful habit formation and task completion.

    First, review the following information:

    Task to be broken down:
    <task>
    {task}
    </task>

    User's energy patterns:
    <energy_patterns>
    {energy_patterns}
    </energy_patterns>

    User's life priorities:
    <priorities>
    {priorities}
    </priorities>

    Categories related to the task:
    <categories>
    {', '.join(str(c) for c in categories)}
    </categories>

    Now, let's define what makes an effective microstep:

    1. Too small to fail: The action should be so minor that it requires minimal willpower to complete.
    2. Immediately actionable: It can be done right away without extensive preparation.
    3. Highly specific: The step should be clear and unambiguous.
    4. Linked to existing habits or timeframes: It should fit naturally into the user's current routine.
    5. Supportive of the larger task: Each microstep should contribute to the overall goal.

    Your task is to break down the given task into 2-5 concrete microsteps that adhere to these principles. Consider the following guidelines:

    1. Ensure each microstep is specific and actionable.
    2. Design microsteps that can be completed in a single session.
    3. Create microsteps that build upon each other logically.
    4. Take into account the user's energy patterns and priorities when designing and ordering the microsteps.
    5. Make each microstep small enough to require minimal willpower but meaningful enough to create progress.

    Before providing your final output, wrap your thought process in <task_breakdown> tags:

    <task_breakdown>
    1. Analyze the main task and its components.
    2. List the key elements of the task that need to be addressed.
    3. Consider how the task aligns with the user's energy patterns and priorities.
    4. Identify potential obstacles and how they could be addressed in the microsteps.
    5. Brainstorm potential microsteps that meet the criteria for effectiveness.
    6. For each potential microstep, evaluate its alignment with the effectiveness criteria (too small to fail, immediately actionable, highly specific, linked to existing habits, supportive of the larger task).
    7. Determine the logical order of the microsteps based on dependencies and the user's context.
    8. Estimate the time required and energy level needed for each microstep.
    9. Refine the microsteps to ensure they build upon each other and lead to the overall goal.
    </task_breakdown>

    After completing your analysis, provide your response in the following JSON format:

    {{
        "microsteps": [
            {{
                "text": "Brief description of the microstep",
                "rationale": "Explanation of why this step is important and how it relates to the overall task",
                "estimated_time": "Time in minutes",
                "energy_level_required": "low/medium/high"
            }}
        ]
    }}

    Remember to focus on making each microstep concrete, achievable, and aligned with the user's context. By starting small and building momentum through these microsteps, we can help the user make meaningful progress towards their larger goal.
    """

    return prompt

def create_prompt_suggestions(user_data: Dict[str, Any]) -> str:
    """
    Creates a prompt for Claude to analyze schedule patterns and generate suggestions.

    Args:
        user_data: Dictionary containing user schedule data and preferences

    Returns:
        Formatted prompt string
    """
    prompt = f"""As an expert psychologist and productivity consultant, analyze this user's schedule patterns and generate optimized schedule suggestions based on the following information:

    User Context:
    <preferences>
    Energy Patterns: {', '.join(user_data['energy_patterns'])}
    Priorities: {json.dumps(user_data['priorities'], indent=2)}
    Work Hours: {user_data.get('work_start_time', 'Not specified')} - {user_data.get('work_end_time', 'Not specified')}
    </preferences>

    Historical Schedule Data (Last 14 Days):
    <historical_schedules>
    {json.dumps(user_data['historical_schedules'], indent=2)}
    </historical_schedules>

    Current Schedule:
    <current_schedule>
    {json.dumps(user_data['current_schedule'], indent=2)}
    </current_schedule>

    Your task is to:
    1. Analyze schedule patterns and user behavior, considering:
    - Task completion patterns and success rates
    - Energy level alignment with task timing
    - Priority alignment with schedule structure
    - Task dependencies and sequences
    - Procrastination patterns
    - Time management effectiveness

    2. Generate up to 5 high-confidence suggestions that could improve the user's schedule.
    Each suggestion should:
    - Be specific and actionable
    - Consider psychological principles of motivation and habit formation
    - Account for the user's energy patterns and priorities
    - Build on successful patterns from historical data
    - Address identified challenges or optimization opportunities

    Return the suggestions in this JSON format:
    {{
        "suggestions": [
            {{
                "text": str,            # The suggestion text
                "type": str,            # One of: "Energy Optimization", "Procrastination Prevention", "Priority Rebalancing", "Task Structure", "Time Management"
                "rationale": str,       # Psychology-based explanation for the suggestion
                "confidence": float,    # Confidence score between 0-1
                "categories": [str]     # Relevant task categories
            }}
        ]
    }}

    Focus on highest-impact suggestions that have strong supporting evidence from the user's data. Each suggestion should be grounded in behavioral science and pattern analysis."""

    return prompt

def generate_schedule(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate a personalized schedule based on user data.
    
    Acts as a coordinator for the schedule generation process:
    1. Prepares the user data
    2. Creates LLM prompt
    3. Calls external LLM API
    4. Processes response into structured data
    
    Args:
        user_data: Dictionary containing user preferences and tasks
        
    Returns:
        Dictionary containing the generated schedule with structured data
    """
    try:
        # Step 1: Prepare user data for prompt generation
        prepared_data = prepare_user_data_for_schedule(user_data)
        
        # Step 2: Generate LLM prompt
        system_prompt, user_prompt = create_prompt_schedule(prepared_data)
        
        # Step 3: Call LLM API
        llm_response = call_schedule_llm(system_prompt, user_prompt)
        
        # Step 4: Process LLM response into structured data
        result = process_schedule_response(llm_response, user_data)
        
        return result
    
    except Exception as e:
        print(f"Error generating schedule: {str(e)}")
        return create_error_response(e, user_data)


def prepare_user_data_for_schedule(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Prepares user data for schedule generation by normalizing tasks and creating mappings.
    
    Args:
        user_data: Raw user data from request
    
    Returns:
        Processed user data ready for prompt creation
    """
    prepared_data = user_data.copy()
    
    # Convert tasks to consistent format
    original_tasks = []
    task_categories_map = {}
    
    if 'tasks' in user_data:
        tasks = user_data['tasks']
        if tasks:
            # Store original tasks for category matching
            original_tasks = tasks.copy()
            
            # Convert tasks to Task objects if needed
            if isinstance(tasks[0], dict):
                prepared_data['tasks'] = [Task.from_dict(task) for task in tasks]
            
            # Create normalized task text to categories mapping
            task_categories_map = create_task_categories_map(original_tasks)
    
    # Add additional metadata to prepared data
    prepared_data['task_categories_map'] = task_categories_map
    
    return prepared_data


def create_task_categories_map(tasks: List[Any]) -> Dict[str, List[str]]:
    """
    Creates a mapping of normalized task text to categories for quick lookup.
    
    Args:
        tasks: List of tasks (either Task objects or dictionaries)
        
    Returns:
        Dictionary mapping normalized task text to category lists
    """
    task_categories_map = {}
    
    for task in tasks:
        # Handle both Task objects and dictionaries
        if isinstance(task, Task):
            task_text = task.text.lower()
            task_categories = task.categories
        else:
            task_text = task.get('text', '').lower()
            task_categories = task.get('categories', [])
        
        # Normalize text for better matching
        normalized_text = re.sub(r'[^\w\s]', '', task_text).strip()
        task_categories_map[normalized_text] = task_categories
    
    return task_categories_map


def call_schedule_llm(system_prompt: str, user_prompt: str) -> str:
    """
    Calls the LLM API with the generated prompts.
    
    Args:
        system_prompt: System prompt for the LLM
        user_prompt: User prompt for the LLM
        
    Returns:
        LLM response text
    """
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=2048,
        temperature=0.7,
        system=system_prompt,
        messages=[
            {"role": "user", "content": user_prompt}
        ]
    )
    
    return response.content[0].text


def process_schedule_response(response_text: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Processes the LLM response text into structured schedule data.
    
    Args:
        response_text: Raw LLM response text
        user_data: Original user data with task mappings
        
    Returns:
        Dictionary with structured schedule data
    """
    # Extract schedule content from tags
    schedule_match = re.search(r'<schedule>([\s\S]*?)<\/schedule>', response_text)
    
    if not schedule_match:
        print("No <schedule> tags found in AI response")
        return create_error_response(
            Exception("No schedule found in AI response"), 
            user_data
        )
    
    schedule_content = schedule_match.group(1).strip()
    task_categories_map = user_data.get('task_categories_map', {})
    
    # Extract layout preferences
    layout_type = user_data.get('layout_preference', {}).get('layout', 'todolist-structured')
    ordering_pattern = user_data.get('layout_preference', {}).get('orderingPattern', 'timebox')
    
    # Parse schedule content into task objects
    tasks = parse_schedule_content(
        schedule_content, 
        task_categories_map
    )
    
    return {
        "success": True,
        "tasks": tasks,
        "layout_type": layout_type,
        "ordering_pattern": ordering_pattern
    }


def parse_schedule_content(
    schedule_content: str, 
    task_categories_map: Dict[str, List[str]]
) -> List[Dict[str, Any]]:
    """
    Parses schedule content into structured task objects.
    
    Args:
        schedule_content: Content extracted from LLM response
        task_categories_map: Mapping of normalized task text to categories
        
    Returns:
        List of task objects
    """
    import uuid
    
    tasks = []
    current_section = None
    
    # Process the schedule line by line
    lines = schedule_content.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Check if this is a section header
        if not line.startswith('□') and not line.startswith('-'):
            # This is a section header
            current_section = line
            
            # Create a section task with UUID
            task = {
                'id': str(uuid.uuid4()),
                'text': current_section,
                'categories': [],
                'is_section': True,
                'completed': False,
                'section': None,
                'parent_id': None,
                'level': 0,
                'type': 'section'
            }
            tasks.append(task)
        else:
            # Regular task: process and create task object
            task = create_task_from_line(line, current_section, task_categories_map)
            tasks.append(task)
    
    return tasks


def create_task_from_line(
    line: str, 
    current_section: str, 
    task_categories_map: Dict[str, List[str]]
) -> Dict[str, Any]:
    """
    Creates a task object from a single line of schedule text.
    
    Args:
        line: Single line of schedule text
        current_section: Current section header
        task_categories_map: Mapping of normalized task text to categories
        
    Returns:
        Task object as dictionary
    """
    import uuid
    
    # Process task line
    task_text = line.replace('□ ', '').replace('- ', '')
    
    # Extract time information if present (for timeboxed schedules)
    start_time, end_time, task_text = extract_time_info(task_text)
    
    # Find matching categories from original tasks
    categories = find_matching_categories(task_text, task_categories_map)
    
    # Create task object with UUID
    return {
        'id': str(uuid.uuid4()),
        'text': task_text,
        'categories': categories,
        'completed': False,
        'is_section': False,
        'section': current_section,
        'parent_id': None,
        'level': 0,
        'type': 'task',
        'start_time': start_time,
        'end_time': end_time
    }


def extract_time_info(task_text: str) -> Tuple[Optional[str], Optional[str], str]:
    """
    Extracts time information from a task description.
    
    Args:
        task_text: Task description text
        
    Returns:
        Tuple of (start_time, end_time, cleaned_task_text)
    """
    start_time = None
    end_time = None
    
    # Look for time patterns like "7:00am - 8:00am: Task description"
    time_match = re.search(r'^(\d{1,2}:\d{2}(?:am|pm)?) - (\d{1,2}:\d{2}(?:am|pm)?):?\s*(.*)', 
                          task_text, re.IGNORECASE)
    if time_match:
        start_time = time_match.group(1)
        end_time = time_match.group(2)
        task_text = time_match.group(3).strip()
    
    return start_time, end_time, task_text


def find_matching_categories(
    task_text: str, 
    task_categories_map: Dict[str, List[str]]
) -> List[str]:
    """
    Finds matching categories for a task from the original task categories.
    
    Args:
        task_text: Task description text
        task_categories_map: Mapping of normalized task text to categories
        
    Returns:
        List of category names
    """
    # Normalize task text for matching
    normalized_task_text = re.sub(r'[^\w\s]', '', task_text.lower()).strip()
    
    # Try exact match first
    if normalized_task_text in task_categories_map:
        return task_categories_map[normalized_task_text]
    
    # Try partial matching
    for original_text, original_categories in task_categories_map.items():
        # Check for significant word overlap or one text containing the other
        if (normalized_task_text in original_text or 
            original_text in normalized_task_text or
            len(set(normalized_task_text.split()) & set(original_text.split())) >= 2):
            return original_categories
    
    return []


def create_error_response(error: Exception, user_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Creates a standardized error response.
    
    Args:
        error: Exception that occurred
        user_data: Original user data
        
    Returns:
        Error response dictionary
    """
    return {
        "success": False,
        "error": str(error),
        "structured_data": {
            "tasks": [],
            "layout_type": user_data.get('layout_preference', {}).get('layout_type', 'todolist-structured'),
            "ordering_pattern": user_data.get('layout_preference', {}).get('ordering_pattern', 'timebox'),
            "error": str(error)
        }
    }

def categorize_task(task_text: str) -> List[str]:
    """
    Categorize a task using Claude.
    
    Args:
        task_text: The task text to categorize
        
    Returns:
        List of category names
    """
    try:
        # Create prompt for Claude
        prompt = create_prompt_categorize(task_text)
        
        # Call Claude API
        response = client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=100,
            temperature=0.2,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        # Extract categories from response
        categories = response.content[0].text.strip().split(', ')
        
        # Ensure the categories are valid
        valid_categories = ["Work", "Exercise", "Relationships", "Fun", "Ambition", "Uncategorized"]
        categories = [cat for cat in categories if cat in valid_categories]
        
        if not categories:
            categories = ["Work"]
            
        return categories
        
    except Exception as e:
        print(f"Error categorizing task: {str(e)}")
        # Default to Work category if there's an error
        return ["Work"]

def decompose_task(task_data: Dict[str, Any], user_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Decompose a task into microsteps.
    
    Args:
        task_data: Dictionary containing task information
        user_data: Dictionary containing user context and preferences
        
    Returns:
        List of microsteps
    """
    try:
        # Extract task text and categories
        task_text = str(task_data.get('text', ''))
        categories = task_data.get('categories', [])
        
        # Create cache key
        cache_key = f"{task_text}_{json.dumps(categories)}"
        
        # Check cache first
        if cache_key in decomposition_cache:
            print(f"Cache hit for task: {task_text}")
            return decomposition_cache[cache_key]
        
        # Create prompt for Claude
        prompt = create_prompt_decompose(task_text, user_data, categories)
        
        # Call Claude API
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            temperature=0.7,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        # Process response
        microsteps = process_decomposition_response(response.content[0].text)
        
        # Cache the result
        decomposition_cache[cache_key] = microsteps
        
        return microsteps
        
    except Exception as e:
        print(f"Error decomposing task: {str(e)}")
        return []

def process_decomposition_response(response_text: str) -> List[Dict[str, Any]]:
    """
    Processes the AI response and extracts valid microsteps.

    Args:
        response_text: Raw response from the AI

    Returns:
        List of processed microsteps
    """
    try:
        print(response_text)
        # Extract JSON from response
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if not json_match:
            print("No JSON found in response")
            return []

        json_str = json_match.group(0)
        response_data = json.loads(json_str)

        # Extract microsteps from the parsed JSON
        microsteps = response_data.get('microsteps', [])

        # Validate and clean microsteps
        processed_steps = []
        for step in microsteps:
            if not isinstance(step, dict) or 'text' not in step:
                continue

            # Clean and validate the step text
            step_text = step['text'].strip()
            if not step_text or len(step_text) > 200:  # Basic validation
                continue

            processed_step = {
                'text': step_text,
                'rationale': step.get('rationale', ''),
                'estimated_time': step.get('estimated_time', '5-10'),
                'energy_level_required': step.get('energy_level_required', 'medium')
            }
            processed_steps.append(processed_step)

        print(f"Processed {len(processed_steps)} microsteps")  # Debug print
        return processed_steps

    except json.JSONDecodeError as e:
        print(f"Error decoding JSON response: {e}")
        return []
    except Exception as e:
        print(f"Error processing decomposition response: {e}")
        return []

def update_decomposition_patterns(
    task: str,
    categories: List[str],
    successful_steps: List[str]
) -> None:
    """
    Updates the cache of successful decomposition patterns.

    Args:
        task: Original task text
        categories: Task categories
        successful_steps: List of accepted microsteps
    """
    try:
        key = (task.lower(), tuple(sorted(categories)))
        if key not in decomposition_patterns_cache:
            decomposition_patterns_cache[key] = {
                'count': 0,
                'successful_patterns': []
            }

        pattern_data = decomposition_patterns_cache[key]
        pattern_data['count'] += 1
        pattern_data['successful_patterns'].append(successful_steps)

        # Limit cache size
        if len(decomposition_patterns_cache) > 1000:
            # Remove least used patterns
            sorted_patterns = sorted(
                decomposition_patterns_cache.items(),
                key=lambda x: x[1]['count']
            )
            decomposition_patterns_cache = dict(sorted_patterns[-1000:])

    except Exception as e:
        print(f"Error updating decomposition patterns: {str(e)}")

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
    Generate schedule suggestions based on user data and history.
    
    Args:
        user_id: User identifier
        current_schedule: Current day's schedule
        historical_schedules: Previous schedules (up to 14 days)
        priorities: User's priority rankings
        energy_patterns: User's energy pattern preferences
        work_start_time: Optional work start time
        work_end_time: Optional work end time
        
    Returns:
        List of suggestions
    """
    try:
        # Prepare user data for prompt
        user_data = {
            "user_id": user_id,
            "current_schedule": current_schedule,
            "historical_schedules": historical_schedules,
            "priorities": priorities,
            "energy_patterns": energy_patterns,
            "work_start_time": work_start_time,
            "work_end_time": work_end_time
        }
        
        # Create prompt for Claude
        prompt = create_prompt_suggestions(user_data)
        
        # Call Claude API
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            temperature=0.7,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
               # Extract JSON from response
        json_match = re.search(r'\{[\s\S]*\}', response.content[0].text)
        if not json_match:
            print("No JSON found in response")
            return []

        json_str = json_match.group(0)
        suggestions_data = json.loads(json_str)

        if not isinstance(suggestions_data, dict) or 'suggestions' not in suggestions_data:
            print("Invalid suggestion data structure")
            return []

        suggestions = suggestions_data['suggestions']

        # Basic validation of suggestions
        validated_suggestions = []
        for suggestion in suggestions:
            if not all(k in suggestion for k in [
                'text', 'type', 'rationale', 'confidence', 'categories'
            ]):
                continue

            # Ensure confidence is a float between 0 and 1
            try:
                suggestion['confidence'] = float(suggestion['confidence'])
                if not 0 <= suggestion['confidence'] <= 1:
                    suggestion['confidence'] = max(0.0, min(1.0, suggestion['confidence']))
            except (ValueError, TypeError):
                suggestion['confidence'] = 0.5  # Default if invalid

            validated_suggestions.append(suggestion)

        return validated_suggestions
        
    except json.JSONDecodeError as e:
        print(f"Error decoding suggestion response: {str(e)}")
        return []
    except Exception as e:
        print(f"Error generating schedule suggestions: {str(e)}")
        return []

def generate_composite_example(layout_preference: Dict[str, Any]) -> str:
    """
    Generate a composite example schedule based on user preferences.
    
    Args:
        layout_preference: Dictionary containing structure, subcategory, and ordering patterns
        
    Returns:
        A composite example that demonstrates the desired format
    """
    # Extract preferences
    structure = layout_preference.get('structure', 'structured')
    subcategory = layout_preference.get('subcategory', '') if structure == 'structured' else ''
    ordering_patterns = layout_preference.get('orderingPattern', ['timeboxed'])
    
    # Ensure ordering_patterns is a list
    if not isinstance(ordering_patterns, list):
        ordering_patterns = [ordering_patterns]
    
    # Load component examples from restructured YAML
    components = schedules_rag
    
    # Build the example based on structure and subcategory
    if structure == 'structured' and subcategory:
        # Get the basic structure from subcategory
        example = components['subcategories'][subcategory]['sample']
    elif structure == 'structured':
        # Default to category if no subcategory specified
        example = components['subcategories']['category']['sample']
    else:
        # Unstructured format
        example = components['structures']['unstructured']['sample']
    
    # Apply task formatting based on ordering patterns
    example = apply_ordering_patterns(example, ordering_patterns, components)
    
    return example

def apply_ordering_patterns(example: str, patterns: List[str], components: Dict) -> str:
    """
    Apply task ordering patterns to the example.
    
    Args:
        example: Base example with structure
        patterns: List of ordering patterns to apply
        components: Component examples dictionary
        
    Returns:
        Example with ordering patterns applied
    """
    # Extract section and task structure
    sections = []
    current_section = None
    current_tasks = []
    
    for line in example.split('\n'):
        if not line.strip():
            continue
            
        if not line.startswith('□'):
            # This is a section header
            if current_section and current_tasks:
                sections.append((current_section, current_tasks))
            current_section = line
            current_tasks = []
        else:
            # This is a task
            current_tasks.append(line)
    
    # Add the last section
    if current_section and current_tasks:
        sections.append((current_section, current_tasks))
    
    # Generate task examples for each pattern
    formatted_sections = []
    for section, tasks in sections:
        formatted_tasks = []
        
        # Apply each ordering pattern
        for pattern in patterns:
            # Get task examples for this pattern
            task_examples = components['task_examples'].get(pattern, [])
            
            # For demonstration, use a subset of examples or repeat if needed
            num_tasks = min(len(tasks), len(task_examples))
            for i in range(num_tasks):
                # Format the task according to the pattern
                if pattern in components['ordering_patterns']:
                    pattern_format = components['ordering_patterns'][pattern]['sample'].split('\n')[0]
                    if '□' in pattern_format:
                        formatted_task = pattern_format
                    else:
                        formatted_task = f"□ {task_examples[i % len(task_examples)]}"
                    formatted_tasks.append(formatted_task)
        
        # Add the section with formatted tasks
        formatted_section = section
        for task in formatted_tasks:
            formatted_section += f"\n{task}"
        formatted_sections.append(formatted_section)
    
    # Combine all sections
    return "\n\n".join(formatted_sections)