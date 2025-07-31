# TASK-23: Fix task dragging and indenting behaviour
Status: In Progress 

## Current behaviour
- Let's say there are 2 tasks: X and Y on level 1 in that respective order
- If I want to indent task Y under task X, currently I would drag task Y using the vertical grip icon and hover under and slightly right (30% of task width) of task X to try and indent.
- However, this does not indent task Y under task X. In fact, the position of both tasks remain the same as original.


## Expected behaviour
- when dragging a task using the vertical grip icon and hover under and at least 30% from the left edge of ANY target task container:
    - the purple horizontal bar should show under the the target task and NOT the dragged task
    - upon release, the dragged task should be indented under the target task
- to outdent, the user would drag the target indented task using the vertical grip and hover under and slightly left of the parent task:
    - the purple horizontal bar should show under the the parent task and NOT the dragged task
    - upon release, the dragged task should be outdented so there's no more parent-child relationship and these 2 tasks sit on the same level

## Requirements Clarifications:
- Max indentation level: 3
- Only regular tasks can be drop targets (not sections)
- Use purple bars with progressive opacity (not blue like Notion)
- Invalid operations should be silently prevented
- Tasks should maintain parent-child relationships with proper level/parent_id/is_subtask properties
- Clarifying UX:
    1. On hover, show a drag handle on tasks.
    2. Enable dragging of tasks, with visual feedback via the purple line showing possible insert positions.
    3. When dropped, adjust the task's parent-child relationships in the scgedyke tree to move/reorder it.
    4. Indent action changes the structure by moving the task into the preceding task content array if valid.
    5. Visual UI reflects the updated hierarchy with indentation and nesting.

## Progress Update:
### ✅ Completed:
- Purple indicator now shows under target task (not dragged task)
- Tasks no longer shuffle positions during drag operations
- Notion-style segmented purple bar implemented (10% darker left segment for indent)
- Progressive opacity: indent (90%+75%), outdent (80%), reorder (60%)
- Max indentation level 3 enforcement
- Visual debugging zones added (red 30%, green 70%, yellow boundary)
- Enhanced console logging for debugging

### 🔄 Current Issue - Percentage-based Threshold Detection:
**Problem**: Changed from fixed 30px to percentage-based (30% left zone = outdent/reorder, 70% right zone = indent), but darker purple line not appearing consistently.

**Key Findings**:
- Mouse tracking through @dnd-kit drag events works (`🎯 Real mouse position` logs appear)
- `updateCursorPosition` function not being called (missing `🔧 updateCursorPosition called:` logs)
- Black indicator showing `containerWidth: undefined`
- Always stuck on `dragType: 'reorder'` instead of `'indent'` in green zone

**Root Cause**: Mouse position data not properly passed from drag provider to target task's `updateCursorPosition` function.

### 🔄 Remaining Tasks:
1. Fix mouse position data flow from drag provider to target task
2. Ensure percentage calculations work correctly
3. Test darker purple line appears in green zone consistently
4. Implement actual indentation/outdentation on drop


