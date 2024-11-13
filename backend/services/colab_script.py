import os
import requests
import threading
from flask import Flask, request, jsonify
import anthropic
import re
import uuid
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from datetime import datetime
import json

class Task:
    def __init__(self, id, text, categories=None):
        self.id = id
        self.text = text
        self.categories = set(categories) if categories else set()

    def to_dict(self):
        return {
            "id": self.id,
            "text": self.text,
            "categories": list(self.categories)
        }

    @classmethod
    def from_dict(cls, data):
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            text=data["text"],
            categories=data.get("categories", [])
        )

# Setup app
app = Flask(__name__)

# Update any base URLs to use the public ngrok URL
app.config["BASE_URL"] = public_url

# Initialize the Anthropic client
client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

# rag examples
example_schedules = {
    "structured-day-sections-timeboxed": """
    Morning 🌞
    □ 7:00am - 7:30am: Wake up and morning routine
    □ 7:30am - 8:00am: Breakfast and check emails
    □ 8:00am - 9:30am: Work on high-priority project
    □ 9:30am - 10:00am: Team standup meeting
    □ 10:00am - 11:30am: Continue high-priority project work
    □ 11:30am - 12:00pm: Review and respond to important messages

    Afternoon 🌇
    □ 12:00pm - 1:00pm: Lunch break and short walk
    □ 1:00pm - 3:00pm: Deep work session on main tasks
    □ 3:00pm - 3:30pm: Quick break and snack
    □ 3:30pm - 5:00pm: Finish up daily tasks and plan for tomorrow

    Evening 💤
    □ 5:00pm - 6:00pm: Exercise or gym session
    □ 6:00pm - 7:00pm: Dinner and relaxation
    □ 7:00pm - 8:30pm: Personal project or hobby time
    □ 8:30pm - 9:30pm: Wind down routine
    □ 9:30pm: Bedtime
    """,

    "structured-day-sections-untimeboxed": """
    Morning 🌞
    □ Wake up and complete morning routine
    □ Enjoy breakfast while checking and responding to urgent emails
    □ Begin work on the day's highest priority task
    □ Attend team standup meeting
    □ Continue focused work on priority tasks
    □ Review and respond to important messages

    Afternoon 🌇
    □ Take a lunch break and go for a short walk
    □ Engage in a deep work session for main project tasks
    □ Take a quick break and have a healthy snack
    □ Wrap up daily tasks and plan for the next day

    Evening 💤
    □ Exercise or attend a gym session
    □ Prepare and enjoy dinner
    □ Spend time on a personal project or hobby
    □ Complete evening wind-down routine
    □ Go to bed at a consistent time
    """,

    "structured-priority-timeboxed": """
    High Priority
    □ 8:00am - 10:00am: Finish presentation for tomorrow's meeting
    □ 10:00am - 10:30am: Schedule dentist appointment
    □ 10:30am - 11:00am: Pay utility bills
    □ 2:00pm - 4:00pm: Complete high-priority project deliverables

    Medium Priority
    □ 11:00am - 11:30am: Start learning Spanish (Duolingo, 15 minutes)
    □ 12:30pm - 1:00pm: Plan weekend hiking trip
    □ 4:00pm - 4:30pm: Research new recipes for meal prep
    □ 6:00pm - 7:00pm: Work on personal development goals

    Low Priority
    □ 1:00pm - 1:30pm: Organize digital photos
    □ 5:00pm - 5:30pm: Clean out email inbox
    □ 7:00pm - 7:30pm: Look into new productivity apps
    """,

    "structured-priority-untimeboxed": """
    High Priority
    □ Finish presentation for tomorrow's meeting
    □ Schedule dentist appointment
    □ Pay utility bills
    □ Complete high-priority project deliverables

    Medium Priority
    □ Start learning Spanish (Duolingo, 15 minutes)
    □ Plan weekend hiking trip
    □ Research new recipes for meal prep
    □ Work on personal development goals

    Low Priority
    □ Organize digital photos
    □ Clean out email inbox
    □ Look into new productivity apps
    """,

    "structured-category-timeboxed": """
    Work 💼
    □ 9:00am - 9:30am: Prepare for team meeting
    □ 9:30am - 10:30am: Attend team meeting
    □ 10:30am - 11:30am: Review and respond to important emails
    □ 2:00pm - 4:00pm: Work on quarterly report

    Health & Fitness 🏋️‍♀️
    □ 7:00am - 7:30am: 30-minute jog
    □ 12:00pm - 12:30pm: Prepare healthy lunch
    □ Throughout the day: Drink 8 glasses of water

    Relationships ❤️
    □ 5:00pm - 5:30pm: Plan date night with partner
    □ 7:00pm - 7:30pm: Call best friend
    □ 8:00pm - 9:00pm: Organize game night with friends

    Fun 🎉
    □ 12:30pm - 1:00pm: Play a quick game or solve a puzzle
    □ 6:00pm - 6:30pm: Watch an episode of favorite TV show
    □ 9:00pm - 9:30pm: Engage in a hobby (painting, gardening, etc.)

    Ambition 🚀
    □ 6:30am - 7:00am: Read 20 pages of a book on personal development
    □ 5:30pm - 6:00pm: Work on side project or business idea
    □ 9:30pm - 10:00pm: Reflect on goals and plan next steps
    """,

    "structured-category-untimeboxed": """
    Work 💼
    □ Prepare for team meeting
    □ Attend team meeting
    □ Review and respond to important emails
    □ Work on quarterly report

    Health 🏋️‍♀️
    □ 30-minute jog
    □ Prepare healthy lunch
    □ Drink 8 glasses of water throughout the day

    Relationships ❤️
    □ Plan date night with partner
    □ Call best friend
    □ Organize game night with friends

    Fun 🎉
    □ Play a quick game or solve a puzzle
    □ Watch an episode of favorite TV show
    □ Engage in a hobby (painting, gardening, etc.)

    Ambition 🚀
    □ Read pages from a book on personal development
    □ Work on side project or business idea
    □ Reflect on goals and plan next steps
    """,

    "unstructured-timeboxed": """
    □ 6:30am - 7:00am: Morning meditation and stretching
    □ 7:00am - 7:30am: Breakfast and coffee
    □ 7:30am - 9:00am: Deep work on main project
    □ 9:00am - 9:15am: Quick break
    □ 9:15am - 10:30am: Respond to emails and messages
    □ 10:30am - 12:00pm: Team meeting and collaboration
    □ 12:00pm - 1:00pm: Lunch and short walk
    □ 1:00pm - 3:00pm: Continue work on main project
    □ 3:00pm - 3:30pm: Afternoon snack and break
    □ 3:30pm - 5:00pm: Wrap up daily tasks and plan for tomorrow
    □ 5:00pm - 6:00pm: Exercise or gym session
    □ 6:00pm - 7:00pm: Dinner preparation and eating
    □ 7:00pm - 8:30pm: Personal hobby or project time
    □ 8:30pm - 9:30pm: Reading or learning time
    □ 9:30pm - 10:00pm: Evening routine and prepare for bed
    """,

    "unstructured-untimeboxed": """
    □ Morning meditation and stretching
    □ Enjoy breakfast and coffee
    □ Deep work session on main project
    □ Respond to important emails and messages
    □ Attend team meeting and collaborate on projects
    □ Lunch break and short walk
    □ Continue work on main project
    □ Take short breaks as needed
    □ Wrap up daily tasks and plan for tomorrow
    □ Exercise or gym session
    □ Prepare and eat dinner
    □ Spend time on personal hobby or project
    □ Read or engage in learning activity
    □ Complete evening routine and prepare for bed
    """
};

def create_prompt_schedule(user_data):
    # Extract user data
    name = user_data['name']
    age = user_data['age']
    work_schedule = f"{user_data['work_start_time']} - {user_data['work_end_time']}"
    energy_patterns = ', '.join(user_data['energy_patterns'])
    priorities = user_data['priorities']
    layout_preference = user_data['layout_preference']

    # Process tasks
    tasks = user_data['tasks']
    categorized_tasks = {
        'Work': [], 'Exercise': [], 'Relationship': [],
        'Fun': [], 'Ambition': []
    }
    for task in tasks:
        for category in task.categories:
            if category in categorized_tasks:
                categorized_tasks[category].append(task.text)

    # Convert priorities to a sorted list of tuples (category, rank)
    priority_list = sorted(priorities.items(), key=lambda x: x[1], reverse=True)
    priority_description = ", ".join([f"{category} (rank {rank})" for category, rank in priority_list])

    # Determine the example schedule to use
    structure = layout_preference['structure']
    timeboxed = layout_preference['timeboxed']
    # Construct the example_key based on user preferences
    if structure == "structured":
        subcategory = layout_preference['subcategory']
        print(structure, subcategory, timeboxed)
        example_key = f"structured-{subcategory}-{timeboxed}"
    else:  # unstructured
        example_key = f"unstructured-{timeboxed}"

    example_schedule = example_schedules.get(example_key, "No matching example found.")
    print(example_schedule)
    system_prompt = """You are an expert psychologist and occupational therapist specializing in personalized daily planning and work-life balance optimization. Your role is to create a tailored schedule for your client's day that maximizes productivity, well-being, and personal growth."""

    user_prompt = f"""
    Here is the client's information:

    <client_info>
    <client_name>{name}</client_name>
    <client_age>{age}</client_age>
    <work_schedule>{work_schedule}</work_schedule>
    <energy_patterns>{energy_patterns}</energy_patterns>
    <priority_description>{priority_description}</priority_description>
    <schedule_structure>{structure}</schedule_structure>
    <schedule_timeboxed>{timeboxed}</schedule_timeboxed>
    <layout_subcategory>{layout_preference['subcategory']}</layout_subcategory>
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
    3. Format the schedule as follows:
    a. If the schedule preference is timeboxed, include specific times for each task.
    b. If the schedule preference is untimeboxed, list tasks in the order they should be performed without specific times.
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
    4. Check if the schedule adheres to the timeboxed/untimeboxed and user's layout subcatgory preference
    5. Create the final schedule based on the above analysis
    </schedule_planning>

    <schedule>
    [The final personalized schedule]
    </schedule>

    Remember to adhere to all guidelines and requirements outlined above when creating the schedule.
    """

    return system_prompt, user_prompt

def create_prompt_categorize(task):
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

def generate_schedule(system_prompt, user_prompt):
    try:
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            temperature=0.7,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_prompt}
            ]
        )
        return response.content[0].text
    except Exception as e:
        print(f"Error generating response: {str(e)}")
        raise

def categorize_task(prompt):
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=100,
        temperature=0.2,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )
    categories = response.content[0].text.strip().split(', ')

    # Ensure the categories are valid
    valid_categories = ["Work", "Exercise", "Relationships", "Fun", "Ambition", "Uncategorized"]
    categories = [cat for cat in categories if cat in valid_categories]

    if not categories:
        categories = ["Work"]
    return categories

def identify_potentially_recurring_tasks(schedule):
    recurring_indicators = [
        r'\b(daily|weekly|monthly|every|each)\b',
        r'\b(routine|usual|regular)\b',
        r'\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b',
        r'\b\d{1,2}:\d{2}\b',  # Time pattern
    ]

    likely_recurring_categories = [
        'medication', 'meditate', 'exercise', 'jog', 'yoga', 'laundry', 'clean',
        'meeting', 'email', 'call', 'breakfast', 'lunch', 'dinner', 'wake up',
        'sleep', 'commute', 'study', 'read', 'journal', 'shower', 'groom'
    ]

    def calculate_recurrence_probability(task: str, time: str) -> float:
        probability = 0.0

        for indicator in recurring_indicators:
            if re.search(indicator, task, re.IGNORECASE):
                probability += 0.2

        for category in likely_recurring_categories:
            if category in task.lower():
                probability += 0.15

        words = task.split()
        if len(words) <= 3:
            probability += 0.1

        if time:
            probability += 0.1

        return min(probability, 1.0)

    potentially_recurring = []
    for task in schedule:
        prob = calculate_recurrence_probability(task['text'], task.get('time', ''))
        if prob > 0.3:
            potentially_recurring.append((task['text'], prob))

    return sorted(potentially_recurring, key=lambda x: x[1], reverse=True)

def identify_recurring_tasks(current_schedule, previous_schedules):
    all_schedules = previous_schedules + [current_schedule]
    task_occurrences = {}
    recurring_tasks = []

    for schedule in all_schedules:
        potentially_recurring = identify_potentially_recurring_tasks(schedule)
        for task, probability in potentially_recurring:
            task_occurrences[task] = task_occurrences.get(task, 0) + 1

    recurring_threshold = max(len(all_schedules) // 2, 2)  # Ensure at least 2 occurrences

    for task, count in task_occurrences.items():
        if count >= recurring_threshold:
            prompt = f"""Given the task "{task}" that appears in {count} out of {len(all_schedules)} daily schedules:
            1. Analyze if this task is likely to be a recurring daily task.
            2. Consider factors such as the nature of the task, its frequency, and its importance in a daily routine.
            3. Provide a yes/no answer followed by a brief explanation.

            Response format:
            Recurring: [Yes/No]
            Explanation: [Your reasoning in one short sentence]"""

            try:
                response = client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=100,
                    temperature=0.2,
                    messages=[{"role": "user", "content": prompt}]
                )

                claude_opinion = response.content[0].text.strip()
                if claude_opinion.lower().startswith("recurring: yes"):
                    original_task = next((t for t in current_schedule if t['text'] == task), None)
                    if original_task:
                        recurring_tasks.append(original_task)
            except Exception as e:
                print(f"Error calling Anthropic API for task '{task}': {str(e)}")

    return recurring_tasks

# Add cache for storing successful decomposition patterns
decomposition_patterns_cache = {}

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
        print(f"Error updating decomposition patterns: {e}")

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

@app.route('/process_user_data', methods=['POST'])
def process_user_data():
    user_data = request.json

    # Convert task dictionaries to Task objects
    if 'tasks' in user_data:
        user_data['tasks'] = [Task.from_dict(task) if isinstance(task, dict) else task for task in user_data['tasks']]

    system_prompt, user_prompt = create_prompt_schedule(user_data)
    response = generate_schedule(system_prompt, user_prompt)

    return jsonify({'schedule': response})

@app.route('/categorize_task', methods=['POST'])
def process_task():
    task = request.json.get('task')
    prompt = create_prompt_categorize(task)
    response = categorize_task(prompt)
    return jsonify({"category": response})

@app.route('/identify_recurring_tasks', methods=['POST'])
def api_identify_recurring_tasks():
    try:
        data = request.json
        print("Received data:", data)  # Add this line
        current_schedule = data.get('current_schedule', [])
        previous_schedules = data.get('previous_schedules', [])

        print("Current schedule:", current_schedule)  # Add this line
        print("Previous schedules:", previous_schedules)  # Add this line

        if not isinstance(current_schedule, list) or not all(isinstance(s, list) for s in previous_schedules):
            return jsonify({"error": "Invalid input format"}), 400

        recurring_tasks = identify_recurring_tasks(current_schedule, previous_schedules)
        return jsonify({"recurring_tasks": recurring_tasks})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Add new route for task decomposition
@app.route('/decompose_task', methods=['POST'])
def decompose_task():
    try:
        data = request.json
        if not data or 'task' not in data:
            return jsonify({"error": "No task provided"}), 400
            
        task_data = data['task']
        user_context = data.get('user_context', {})
        
        # Safely extract text and categories
        if not isinstance(task_data, dict) or 'text' not in task_data:
            return jsonify({"error": "Invalid task format"}), 400
            
        task_text = str(task_data['text'])
        categories = task_data.get('categories', [])
        
        # Generate decomposition prompt with proper string formatting
        prompt = create_prompt_decompose(task_text, user_context, categories)
        print("getting response")
        # Get response from Claude
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            temperature=0.7,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        print(response)
        # Process response
        microsteps = process_decomposition_response(response.content[0].text)

        if not microsteps:
            return jsonify({
                "error": "Failed to generate valid microsteps"
            }), 500
            
        return jsonify({
            'microsteps': microsteps,
            'source': 'generated'
        })
        
    except Exception as e:
        print(f"Error in decompose_task: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Add new route for storing microstep feedback
@app.route('/store_microstep_feedback', methods=['POST'])
def store_microstep_feedback():
    try:
        data = request.json
        if not data or not all(k in data for k in ['task_id', 'microstep_id', 'accepted']):
            return jsonify({"error": "Missing required fields"}), 400
            
        task_id = data['task_id']
        microstep_id = data['microstep_id']
        accepted = data['accepted']
        completion_order = data.get('completion_order')
        timestamp = data.get('timestamp', datetime.utcnow().isoformat())
        
        # Store feedback in database
        feedback_doc = {
            'task_id': task_id,
            'microstep_id': microstep_id,
            'accepted': accepted,
            'completion_order': completion_order,
            'timestamp': timestamp
        }
        
        # Update decomposition patterns if microstep was accepted
        if accepted:
            # Fetch original task and microstep details
            task = get_task(task_id)  # You'll need to implement this
            if task:
                update_decomposition_patterns(
                    task['text'],
                    task.get('categories', []),
                    [microstep_id]
                )
        
        return jsonify({"status": "success"})
        
    except Exception as e:
        print(f"Error storing feedback: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/generate_schedule_suggestions', methods=['POST'])
def generate_schedule_suggestions():
    """
    API endpoint for generating schedule suggestions.
    
    Expected request format:
    {
        "user_data": {
            "user_id": str,
            "current_schedule": List[Dict],
            "historical_schedules": List[List[Dict]],
            "priorities": Dict[str, str],
            "energy_patterns": List[str],
            "work_start_time": str,
            "work_end_time": str
        }
    }
    """
    try:
        # Validate request data
        data = request.json
        if not data or 'user_data' not in data:
            return jsonify({
                "error": "No user data provided"
            }), 400
            
        user_data = data['user_data']
        
        # Validate required fields
        required_fields = [
            'user_id', 'current_schedule', 'historical_schedules',
            'priorities', 'energy_patterns'
        ]
        
        if not all(field in user_data for field in required_fields):
            return jsonify({
                "error": "Missing required fields in user data"
            }), 400
            
        # Validate data types
        if not isinstance(user_data['historical_schedules'], list):
            return jsonify({
                "error": "Invalid historical schedules format"
            }), 400
            
        if not isinstance(user_data['priorities'], dict):
            return jsonify({
                "error": "Invalid priorities format"
            }), 400
            
        if not isinstance(user_data['energy_patterns'], list):
            return jsonify({
                "error": "Invalid energy patterns format"
            }), 400
            
        # Generate prompt for Claude
        try:
            prompt = create_prompt_suggestions(user_data)
        except Exception as e:
            print(f"Error creating prompt: {str(e)}")
            return jsonify({
                "error": "Failed to create suggestion prompt"
            }), 500
            
        # Get suggestions from Claude
        try:
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                temperature=0.7,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
        except Exception as e:
            print(f"Error getting Claude response: {str(e)}")
            return jsonify({
                "error": "Failed to generate suggestions"
            }), 500
            
        # Process response
        try:
            # Extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', response.content[0].text)
            if not json_match:
                return jsonify({
                    "error": "Invalid response format from AI"
                }), 500
                
            suggestions_data = json.loads(json_match.group(0))
            
            if not isinstance(suggestions_data, dict) or 'suggestions' not in suggestions_data:
                return jsonify({
                    "error": "Invalid suggestion data structure"
                }), 500
                
            suggestions = suggestions_data['suggestions']
            
            # Basic validation of suggestions
            for suggestion in suggestions:
                if not all(k in suggestion for k in [
                    'text', 'type', 'rationale', 'confidence', 'categories'
                ]):
                    return jsonify({
                        "error": "Invalid suggestion format"
                    }), 500
                    
                # Ensure confidence is a float between 0 and 1
                suggestion['confidence'] = float(suggestion['confidence'])
                if not 0 <= suggestion['confidence'] <= 1:
                    suggestion['confidence'] = max(0.0, min(1.0, suggestion['confidence']))
            
            return jsonify({
                'suggestions': suggestions,
                'metadata': {
                    'generated_at': datetime.utcnow().isoformat(),
                    'suggestion_count': len(suggestions)
                }
            })
            
        except json.JSONDecodeError as e:
            print(f"Error decoding suggestion response: {str(e)}")
            return jsonify({
                "error": "Invalid JSON in AI response"
            }), 500
        except Exception as e:
            print(f"Error processing suggestions: {str(e)}")
            return jsonify({
                "error": f"Failed to process suggestions: {str(e)}"
            }), 500
            
    except Exception as e:
        print(f"Error in generate_schedule_suggestions: {str(e)}")
        return jsonify({
            "error": str(e)
        }), 500

@app.route("/")
def home():
    return "Running Flask on Google Colab!"

# Start the Flask server in a new thread
threading.Thread(target=app.run, kwargs={"use_reloader": False, "port": port}).start()
# app.run(host='0.0.0.0', port=5009, use_reloader=False)