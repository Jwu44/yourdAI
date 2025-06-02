# TASK-01: Google calendar integration 
Status: In Progress

## Current Progress
- Backend API routes have been created in backend/apis/calendar_routes.py:
  - `/api/calendar/connect` (POST): Connect user to Google Calendar after authorization
  - `/api/calendar/events` (GET): Fetch user's calendar events for a specific date
- Frontend implementation:
  - We already ask user to select their google calendar scope as seen in @firebase.ts
  - Fixed import for GoogleAuthProvider in AuthContext.tsx
  - Updated calendar.ts to correctly import auth from '@/auth/firebase'
  - Refactored dashboard.tsx to use calendarApi.fetchEvents() which automatically handles auth
  - Modified fetchEvents to use a simplified API signature with just date parameter


## Requirements
- If user allows google calendar access after google sso, then fetch their google calendar events and tasks for the current day
- Take the title of the google calendar event or task and pass it into api_categorise_task to create a task object and categorise it
- If a start and end time existed, add it to the created task object afterwards
