Status: To do
## Bug
I am facing a bug where after adjusting the positions of tasks via drag, the positions are not being saved in the backend. 
## Current behaviour
- After dragging tasks around whether if that's reorder, indent our outdent, the operations are performed in the frontend
- But these new positions are not being saved to the backend
- When I load the page, positions revert back to original


## Expected behaviour
- If a task's position has been changed, update its metadata and save to backend
- Reloading page should show latest task positions