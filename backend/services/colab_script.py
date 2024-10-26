import os
import requests
import threading
from flask import Flask, request, jsonify
import anthropic
import re
import uuid
from fuzzywuzzy import fuzz

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

# rag examples
example_schedules = {
    "structured-day_sections-timeboxed": """
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

    "structured-day_sections-untimeboxed": """
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

    Health & Fitness 🏋️‍♀️
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
    <context>
    I need you to create a personalized daily schedule for my client. The schedule should balance work responsibilities with personal priorities, taking into account energy patterns throughout the day. The final output will be used by the client to structure their day effectively.
    </context>

    <client_info>
    Name: {name}
    Age: {age}
    Work schedule: {work_schedule}
    Tasks:
    - Work tasks: {', '.join(categorized_tasks['Work'])}
    - Exercise tasks: {', '.join(categorized_tasks['Exercise'])}
    - Relationship tasks: {', '.join(categorized_tasks['Relationship'])}
    - Fun tasks: {', '.join(categorized_tasks['Fun'])}
    - Ambition tasks: {', '.join(categorized_tasks['Ambition'])}
    Energy patterns: {energy_patterns}
    Priorities outside {work_schedule} (ranked from 1 - highest to 4 - lowest): {priority_description}
    Schedule preference:
    - Structure: {structure}
    - Timeboxed: {timeboxed}
    - Subcategory: {layout_preference['subcategory']}
    </client_info>

    <instructions>
    1. Analyze the client's information and create a personalized, balanced schedule.
    2. To prioritise tasks, follow these guidelines:
    a. Schedule work tasks strictly within {work_schedule} considering {name}'s energy patterns.
    b. Outside work hours {work_schedule}, focus on personal tasks which are classified as either exercise, relationship, fun, or ambition based on how {name} has ranked their priorities and their energy patterns.
    c. Tasks can have multiple categories. Using {priority_description}, prioritise personal tasks with multiple categories accordingly.
    3. To format the schedule:
    a. Use this example as a reference for the expected layout:
    {example_schedule}
    b. Ensure each task in the generated schedule belongs to {name}.
    c. If the schedule preference is untimeboxed, do not include any specific times for tasks, even in the section text. Simply list the tasks in the order they should be performed.
    4. Edit the language of the schedule by following these guidelines:
    a. Write in a clear, concise, and conversational tone. Avoid jargon and unnecessary complexity.
    b. Do not include explanations or notes sections.
    c. Do not show categories for each task.
    </instructions>

    <output_format>
    Please structure your response as follows:
    <thinking>
    [Your step-by-step thought process for creating the schedule]
    </thinking>

    <schedule>
    [The final personalized schedule]
    </schedule>
    </output_format>
    """

    return system_prompt, user_prompt

def create_prompt_categorize(task):
    prompt = f"""Given the following 5 categories to an ordinary life:
    1. Exercise - such as walking, running, swimming, gym, bouldering etc...
    2. Relationship - how you spend time with friends and family
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
            model="claude-3-sonnet-20240229",
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
        model="claude-3-sonnet-20240229",
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
                    model="claude-3-sonnet-20240229",
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

# def extract_tasks_with_categories(schedule_text):
#     tasks = []
#     for line in schedule_text.split('\n'):
#         if line.strip().startswith('□'):
#             task_text = line.strip()[1:].strip()
#             category_match = re.search(r'\[([^\]]+)\]$', task_text)
#             if category_match:
#                 category = category_match.group(1)
#                 task_text = task_text[:category_match.start()].strip()
#             else:
#                 category = "Uncategorized"
#             tasks.append({"text": task_text, "category": category})
#     return tasks

@app.route('/process_user_data', methods=['POST'])
def process_user_data():
    user_data = request.json

    # Convert task dictionaries to Task objects
    if 'tasks' in user_data:
        user_data['tasks'] = [Task.from_dict(task) if isinstance(task, dict) else task for task in user_data['tasks']]

    system_prompt, user_prompt = create_prompt_schedule(user_data)
    response = generate_schedule(system_prompt, user_prompt)

    # # Extract tasks with categories from the generated schedule
    # tasks_with_categories = extract_tasks_with_categories(response)

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
        current_schedule = data.get('current_schedule', [])
        previous_schedules = data.get('previous_schedules', [])

        if not isinstance(current_schedule, list) or not all(isinstance(s, list) for s in previous_schedules):
            return jsonify({"error": "Invalid input format"}), 400

        recurring_tasks = identify_recurring_tasks(current_schedule, previous_schedules)
        return jsonify({"recurring_tasks": recurring_tasks})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/")
def home():
    return "Running Flask on Google Colab!"

# Start the Flask server in a new thread
threading.Thread(target=app.run, kwargs={"use_reloader": False, "port": port}).start()
# app.run(host='0.0.0.0', port=5006, use_reloader=False)