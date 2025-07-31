Status: To do
## Bug
I am facing a bug where the "reorder" operation is not working as intended when trying to reorder tasks across sections.

## Current behaviour
- Let's say there are 2 tasks: D and E
- Task D lives in the "Afternoon" section while Task E lives in the "Evening" section
- If I drag Task E to Task D's red zone for reorder, I should see the reorder operation in the black indicator which is correct at the moment as seen in @image1.png
- But on upon release of Task E, Task E doesn't move and remains in the "Evening" section



## Expected behaviour
- When reordering across sections, the dragged task should go below the target task in that section
- E.g. in the @image1.png example, Task E should go after Task D in the "Afternoon" section so they're siblings: Task D + Task E