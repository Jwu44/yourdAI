# TASK-24: Implement task indent/outdent upon drag
Status: COMPLETE ✅ - Logic, Visual Indentation, and Bug Fixes Implemented

## Problem
Users need the ability to indent tasks to create sub tasks or outdent if it was a mistake

## Requirements
- When dragging a task X into target task Y into the first 30% of task Y, the action is to re order (already exists)
- When dragging a task X into target task Y into the latter 70% of task Y, the action is to indent (to be implemented)
    - When user releases the drag, indent task X into task Y so visually it is 30px padded left and sits under task Y
    - Update the task meta data to track parent-child relationship
    - Task Y containing Task X is now a block
    - Indented task X should now have 3 states: reorder, indent and oudent
        - If user tries to drag a task Z to task X there should be 3 shades of purple
        - If user drags task Z to the first 30% of task X, the action is to re order so that task Z sits below the task X + Y block
        - If user drags task Z to the 30-60% width zone of task X, the action is to indent so that task Z is indented below task Y and is positionally under task X
        - If user drags task Z to the 60%-100% width zone of task X, the action is to indent so that task Z is indented below task X (this is the 3rd and max level of indentation)
    - To outdent, user drags indented task to the left 30% width zone of the parent task
- Max indentation level: 3

## Implemented Logic (Backend & State Management) ✅

### Zone Detection System
**Files Modified:** `use-drag-drop-task.tsx`, `EditableSchedule.tsx`, `EditableScheduleRow.tsx`

**Three Zone Systems Based on Target Task Level:**

1. **2-Zone System** (Target Level 0 - Non-indented tasks):
   - 0-30%: reorder (non-indented) / outdent (indented dragged task)
   - 30-100%: indent (make dragged task level 1)

2. **3-Zone System** (Target Level 1-2 - Indented tasks):
   - 0-30%: reorder (non-indented) / indent_to_parent_level (indented dragged task)
   - 30-60%: indent_to_parent_level (same level as target's parent)
   - 60-100%: indent_to_child_level (target's level + 1)

3. **1-Zone System** (Target Level 3 - Max level tasks):
   - 0-100%: reorder only (no further indentation allowed)

### Drag Types Implemented
- `'reorder'` - Simple position change, no level change
- `'outdent'` - Reduce indentation level, move to parent's level
- `'indent'` - 2-zone system standard indent (level + 1)
- `'indent_to_parent_level'` - 3-zone system, match target's parent level
- `'indent_to_child_level'` - 3-zone system, target level + 1

### Visual Feedback System ✅
**Progressive Purple Opacity:**
- `opacity-60` (60%) - Lightest: reorder operations
- `opacity-75` (75%) - Medium: indent_to_parent_level, standard indent
- `opacity-80` (80%) - High: outdent operations  
- `opacity-90` (90%) - Darkest: indent_to_child_level

### Task Metadata Updates ✅
**Task Properties Updated on Drag:**
- `level` - Indentation level (0-3)
- `is_subtask` - Boolean flag for indented tasks
- `parent_id` - Reference to parent task
- `section` - Inherited from parent/target

### Error Handling ✅
- Try/catch blocks around all operations
- Fallback to simple reorder on errors
- Parent task finding with graceful degradation
- Comprehensive logging for debugging

## Visual Indentation Implementation ✅

### Changes Made
**File:** `EditableScheduleRow.tsx`

1. **Fixed Indentation Calculation** (line 695):
   - Removed conflicting `pl-8` class that wasn't working
   - Updated `marginLeft` to use `task.level * 30px` for proper 30px per level indentation
   - Changed condition from `task.is_subtask` to `task.level && task.level > 0`

2. **Enhanced Connecting Lines** (lines 732-744):
   - Replaced tiny 4x4px connector with proper 20x20px L-shaped connector
   - Added rounded corner (`borderBottomLeftRadius: '4px'`)
   - Used semantic styling with `border-muted-foreground/30`
   - Applied to all tasks with `level > 0`

### Visual Results
- **Level 1 tasks**: 30px left margin with connecting line
- **Level 2 tasks**: 60px left margin with connecting line  
- **Level 3 tasks**: 90px left margin with connecting line
- **Connecting lines**: Clear L-shaped borders showing parent-child relationships

## Critical Bug Fix ✅

### Issue Identified
Visual feedback showed correct indentation intent, but drag release performed reorder instead of indent due to data flow issue.

### Root Cause
`handleDragEnd` was reading drag type from wrong data source:
- **Problem**: Read from `active.data.current.indentationState` (dragged task's stale state)
- **Solution**: Read from `over.data.current.indentationState` (target task's real-time state)

### Fix Applied
**File:** `use-drag-drop-provider.tsx` (lines 195-212)

```typescript
// 🔧 FIX: Extract indentation state from target (over) data instead of active data
const targetIndentationState = overData?.indentationState
const fallbackIndentationState = activeData?.indentationState
const dragType = targetIndentationState?.dragType || fallbackIndentationState?.dragType || 'reorder'
```

### Implementation Complete
- ✅ Zone detection system (2-zone, 3-zone, 1-zone)
- ✅ Progressive purple opacity visual feedback
- ✅ Task metadata updates (level, is_subtask, parent_id)
- ✅ Visual indentation rendering (30px per level)
- ✅ Connecting lines for parent-child relationships
- ✅ Critical data flow bug fixed
- ✅ Debug logging for troubleshooting
