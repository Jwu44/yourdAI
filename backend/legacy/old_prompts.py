prompt = f"""As an expert psychologist and occupational therapist, create a personalized schedule for {name}, a {age}-year-old individual, based on the following information:
    1. Work schedule: {work_schedule}
    2. Tasks (in order of importance): {tasks}
    3. Energy levels: {energy_levels}
    4. Exercise routine: {exercise_routine}
    5. Relationships: {relationships}
    6. Fun activities: {fun_activities}
    7. Ambitions: Short-term - {short_term_ambitions}, Long-term - {long_term_ambitions}
    8. Priorities: Health - {priorities['health']}%, Relationships - {priorities['relationships']}%, Fun Activities - {priorities['fun_activities']}%, Ambitions - {priorities['ambitions']}%

    Create the schedule following these guidelines:
    1. Prioritize important tasks when energy levels are above 80%.
    2. Structure work tasks during {work_schedule}. Outside work, focus on exercise, relationships, and fun activities.
    3. Distribute tasks based on energy levels.
    4. Integrate personal values and goals, aligning with priority scores.
    5. Use a {layout_format} with line breaks between sentences.
    6. Write in a clear, concise, and conversational tone. Avoid jargon and unnecessary complexity."""

system_prompt = """You are an expert psychologist and occupational therapist specializing in personalized daily planning and work-life balance optimization. Your role is to create tailored schedules that maximize productivity, well-being, and personal growth for your clients."""

user_prompt = f"""
    <context>
    I need you to create a personalized daily schedule for my client. The schedule should balance work responsibilities with personal priorities, taking into account energy levels throughout the day. The final output will be used by the client to structure their day effectively.
    </context>

    <client_info>
    Name: {name}
    Age: {age}
    Work schedule: {work_schedule}
    Tasks:
    - Work tasks: {', '.join(work_tasks)}
    - Exercise tasks: {', '.join(exercise_tasks)}
    - Relationship tasks: {', '.join(relationship_tasks)}
    - Fun tasks: {', '.join(fun_tasks)}
    - Ambition tasks: {', '.join(ambition_tasks)}
    Energy levels throughout the day: {energy_levels}, where 'x' represents the hour of day in 24 hour format and 'y' represents how active the user is with 0% meaning {name} is asleep while 100% meaning {name} is feeling their absolute best.
    Priorities outside {work_schedule} (ranked from 4 - highest to 1 - lowest): {priority_description}
    </client_info>

    <instructions>
    1. Analyze the client's information and create a personalized, balanced schedule.
    2. To identify and priortise tasks, follow these guidelines:
    a. Schedule work tasks strictly within {work_schedule}.
    b. Outside work hours, focus on exercise, relationship, fun, and ambition tasks based on the client's priorities.
    c. Prioritize important tasks (both work and personal) when energy levels are above 70%.
    d. Distribute remaining tasks according to priorities and energy levels.
    3. To format the schedule, follow these guidelines:
    a. Display the planner in a {layout_subcategory} {layout_preference} format following {example_schedules[layout_subcategory]} as an example of the expected layout, ensuring each task generated belongs to {name}.
    b. Double check the format given the following definitions for each subcategory. Time-boxed means the user would like to see each task with a starting and end time. Un-time-boxed means there should be no start or end time with any tasks. Structured means the user would like to see 'Morning, 'Afternoon' and 'Evening sections in their schedule. Unstructured means there should be no 'Morning, 'Afternoon' and 'Evening sections in the schedule.
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
    c. Use the client's layout subcategory preference for additional formatting.
    4. Ensure the language of the schedule is:
    a. Clear, concise, and conversational.
    b. Free of jargon and unnecessary complexity.
    c. Without explanations or notes sections.
    d. Without category labels for each task.

    5. Important: Ensure each task is listed separately. Do not combine multiple tasks into a single entry.
    6. Only include tasks that the client has provided. Do not add any new tasks.

    Here's an example of the desired output format (note: this is a generic example on the layout subcatgory, your actual output for task content should be tailored to the client's specific information):

    {example_schedule}

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