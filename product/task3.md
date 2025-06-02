# TASK-03: Google calendar integration via mcp server
Status: To do
## Context
Currently a schedule can be formatted by combining these options:
1. structure which has values [structured, unstructured]. this handles whether a schedule should have sections or not.
2. subcategory which is only available if "structured" is selected. it has values [day-sections, priority, category]. this handles what each section is.
3. task ordering pattern which has values [timeboxed, untimeboxed, 3-3-3, alternating, batching]. this handles how tasks should be ordered within a section. a user can select multiple task ordering patterns e.g. timeboxed + alternating.

To improve schedule generation accuracy and personalisation, I want to reference an example schedule which combines inputted structure, subcategory (if available) and task ordering pattern. 

## Problem
Currenlty I'm trying to do this with a basic retrieval augmented generation system using @schedules_rag.yaml. But this limited as we scale the number of options for each option as the example-key increases exponentially.

## Requirements
- first keep asking any clarifying questions until you are confident you fully understand the scope of the task
- when confident, propose a way to handle referencing of example schedules as number of schedule format options increase e.g. if user selects multiple task ordering patterns
- proposed way should be simple and efficient, following @dev-guide.md for reference