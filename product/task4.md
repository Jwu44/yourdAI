# TASK-04: 
Status: To do

## Bug
After completing google sso and selecting google calendar scope, user's google calendar events are not syncing. This might be due to the model context protocol connection I'm trying to setup with google calendar?

## Browser logs
Sign in successful: Justin Wu (justin.wu4444@gmail.com)
Has calendar access: true
Waiting for auth state to stabilize before connecting to Google Calendar...
Connecting to Google Calendar...
Token obtained: true
Connected to Google Calendar
Error fetching calendar events: Error: Failed to fetch calendar events: {"error":"Failed to fetch Google Calendar events: Failed to call MCP server: 406 Client Error: Not Acceptable for url: https://mcp.pipedream.net/6ea7852a-7ca6-40c6-8c97-33ab3dfa6663/google_calendar","success":false}


## Requirements
- Keep asking any necessary clarifying questions before implementation
- Diagnose root cause
- Propose a fix following @dev-guide.md implementation principles when you are confident you have full context