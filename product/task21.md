# TASK-21: Debug Google Calendar events not syncing  
Status: ✅ RESOLVED

## Bug
I am facing a bug where the user's Google Calendar events are not syncing to the dashboard after google sso.

## Steps to reproduce:
1. Click "Get started" on home page
2. Complete google sso
3. arrive on dashboard
4. Bug: google calendar events for today aren't synced


## Expected behaviour:
After google sso and enabling calendar access, google calendar events should be synced and displayed on the dashboard.

## Resources
### Console logs
Sign in successful: Justin Wu (justin.wu4444@gmail.com)
page-38c6dd705d95bb07.js:1 Authenticated user detected on home page, redirecting to dashboard
layout-893795dc592b02d1.js:1 RouteGuard State: {user: 'Justin Wu (justin.wu4444@gmail.com)', loading: false, pathname: '/', isPublicPath: true, inAuthFlow: false, …}
344-18c889d9e9d2a045.js:1 Has calendar access: true
344-18c889d9e9d2a045.js:1 Storing user with calendar access flag: true
344-18c889d9e9d2a045.js:1 Got fresh ID token for backend storage
344-18c889d9e9d2a045.js:1 Calendar access status: false
344-18c889d9e9d2a045.js:1 API Base URL: https://yourdai-production.up.railway.app
344-18c889d9e9d2a045.js:1 Got fresh ID token for backend storage
344-18c889d9e9d2a045.js:1 Calendar access status: true
344-18c889d9e9d2a045.js:1 API Base URL: https://yourdai-production.up.railway.app
page-16315068ed461b65.js:1 Setting currentDate: Tue Jul 29 2025 15:03:28 GMT+1000 (Australian Eastern Standard Time)
page-16315068ed461b65.js:1 Attempting to fetch calendar events for: 2025-07-29
layout-893795dc592b02d1.js:1 RouteGuard State: {user: 'Justin Wu (justin.wu4444@gmail.com)', loading: false, pathname: '/dashboard', isPublicPath: false, inAuthFlow: false, …}
site.webmanifest:1  GET https://yourdai.app/site.webmanifest 401 (Unauthorized)
/dashboard:1 Manifest fetch from https://yourdai.app/site.webmanifest failed, code 401
344-18c889d9e9d2a045.js:1 User stored in backend successfully with calendar access: false
344-18c889d9e9d2a045.js:1 Authentication completed successfully
344-18c889d9e9d2a045.js:1  GET https://yourdai-production.up.railway.app/api/calendar/events?date=2025-07-29&timezone=Australia%2FSydney 400 (Bad Request)
fetchEvents @ 344-18c889d9e9d2a045.js:1
await in fetchEvents
page-16315068ed461b65.js:1 Calendar not connected, loading regular schedule: Google Calendar not connected. Please connect your calendar in the Integrations page to sync events.
page-16315068ed461b65.js:1 User creation date: Sun Mar 02 2025 11:01:54 GMT+1100 (Australian Eastern Daylight Time)
344-18c889d9e9d2a045.js:1 User stored in backend successfully with calendar access: true
344-18c889d9e9d2a045.js:1 Starting calendar connection process...
344-18c889d9e9d2a045.js:1 Waiting for auth state to stabilize before connecting to Google Calendar...
344-18c889d9e9d2a045.js:1 Connecting to Google Calendar...
344-18c889d9e9d2a045.js:1 Connected to Google Calendar successfully
Navigated to https://yourdai.app/dashboard
344-18c889d9e9d2a045.js:1 Setting up auth state listener
344-18c889d9e9d2a045.js:1 Checking redirect result...
dashboard:1  GET https://yourdai.app/site.webmanifest 401 (Unauthorized)
dashboard:1 Manifest fetch from https://yourdai.app/site.webmanifest failed, code 401
344-18c889d9e9d2a045.js:1 Auth state changed. User: Justin Wu (justin.wu4444@gmail.com)
344-18c889d9e9d2a045.js:1 OAuth in progress: false
344-18c889d9e9d2a045.js:1 Storing user from auth state change (non-OAuth)
344-18c889d9e9d2a045.js:1 Redirect result: null
344-18c889d9e9d2a045.js:1 No redirect result found
page-16315068ed461b65.js:1 Setting currentDate: Tue Jul 29 2025 15:03:33 GMT+1000 (Australian Eastern Standard Time)
page-16315068ed461b65.js:1 Attempting to fetch calendar events for: 2025-07-29
layout-893795dc592b02d1.js:1 RouteGuard State: {user: 'Justin Wu (justin.wu4444@gmail.com)', loading: false, pathname: '/dashboard', isPublicPath: false, inAuthFlow: false, …}
344-18c889d9e9d2a045.js:1 Got fresh ID token for backend storage
344-18c889d9e9d2a045.js:1 Calendar access status: false
344-18c889d9e9d2a045.js:1 API Base URL: https://yourdai-production.up.railway.app
page-16315068ed461b65.js:1 User creation date: Sun Mar 02 2025 11:01:54 GMT+1100 (Australian Eastern Daylight Time)
344-18c889d9e9d2a045.js:1  GET https://yourdai-production.up.railway.app/api/calendar/events?date=2025-07-29&timezone=Australia%2FSydney 400 (Bad Request)
fetchEvents @ 344-18c889d9e9d2a045.js:1
await in fetchEvents
page-16315068ed461b65.js:1 Calendar not connected, loading regular schedule: Google Calendar not connected. Please connect your calendar in the Integrations page to sync events.
344-18c889d9e9d2a045.js:1 User stored in backend successfully with calendar access: false
344-18c889d9e9d2a045.js:1 Authentication completed successfully

## Network requests
- https://yourdai-production.up.railway.app/api/calendar/events?date=2025-07-29&timezone=Australia%2FSydney
- https://yourdai-production.up.railway.app/api/auth/user
- https://yourdai-production.up.railway.app/api/auth/user: {
    "message": "User successfully created/updated",
    "user": {
        "_id": "67c43aa2748088a1d7d9b585",
        "age": null,
        "calendar": {
            "connected": false,
            "error": null,
            "lastSyncTime": null,
            "selectedCalendars": [],
            "settings": {
                "autoSync": true,
                "defaultReminders": true,
                "syncFrequency": 15
            },
            "syncStatus": "never"
        },
        "calendarSynced": false,
        "createdAt": "2025-03-02T11:01:54.766000",
        "displayName": "Justin Wu",
        "email": "justin.wu4444@gmail.com",
        "googleId": "Si3NryNNjSMbW8q1t0niKX8sYng1",
        "jobTitle": null,
        "lastLogin": "2025-07-29T03:07:00.092000",
        "metadata": {
            "lastModified": "2025-07-29T03:07:00.092000"
        },
        "photoURL": "https://lh3.googleusercontent.com/a/ACg8ocL0LSvlk8wllunIei33pP_1Cce4t4DyHmlBrTaL1LNVYyKaU68FiA=s96-c",
        "role": "free",
        "slack": {
            "connected": true,
            "connectedAt": "Fri, 11 Jul 2025 03:11:07 GMT",
            "instanceId": "5dd87456-c0bc-4f4a-aa3f-75ffe8631e09",
            "lastSyncTime": "Fri, 11 Jul 2025 03:11:07 GMT",
            "oauthUrl": "https://api.klavis.ai/oauth/slack/authorize?instance_id=5dd87456-c0bc-4f4a-aa3f-75ffe8631e09",
            "serverUrl": "https://slack-mcp-server.klavis.ai/mcp/?instance_id=5dd87456-c0bc-4f4a-aa3f-75ffe8631e09"
        },
        "timezone": "UTC"
    }
}

https://yourdai-production.up.railway.app/api/calendar/events?date=2025-07-29&timezone=Australia%2FSydney: {
    "error": "Google Calendar not connected. Please connect your calendar in the Integrations page to sync events.",
    "success": false,
    "tasks": []
}

## backend server logs
WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.

 * Running on all addresses (0.0.0.0)

 * Running on http://127.0.0.1:8000

 * Running on http://10.250.16.254:8000

Press CTRL+C to quit

100.64.0.2 - - [29/Jul/2025 04:47:24] "OPTIONS /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 04:47:24] "OPTIONS /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 04:47:24] "OPTIONS /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 04:47:24] "OPTIONS /api/calendar/events?date=2025-07-29&timezone=Australia/Sydney HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 04:47:24] "POST /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 04:47:25] "GET /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 04:47:25] "GET /api/calendar/events?date=2025-07-29&timezone=Australia/Sydney HTTP/1.1" 400 -

100.64.0.2 - - [29/Jul/2025 04:47:25] "POST /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 04:47:26] "OPTIONS /api/schedules/2025-07-29 HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 04:47:26] "GET /api/schedules/2025-07-29 HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 04:47:27] "OPTIONS /api/calendar/connect HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 04:47:27] "POST /api/calendar/connect HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 04:47:29] "POST /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 04:47:30] "OPTIONS /api/calendar/events?date=2025-07-29&timezone=Australia/Sydney HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 04:47:30] "OPTIONS /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 04:47:31] "GET /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 04:47:31] "GET /api/calendar/events?date=2025-07-29&timezone=Australia/Sydney HTTP/1.1" 400 -

100.64.0.2 - - [29/Jul/2025 04:47:31] "OPTIONS /api/schedules/2025-07-29 HTTP/1.1" 200 -

---

## ✅ SOLUTION IMPLEMENTED

### Root Cause
Race condition between calendar connection and auth state listener - the auth listener was overwriting successful calendar connections with `calendarSynced: false`.

### Key Changes Made

**Backend (`backend/db_config.py`)**:
```python
# Modified create_or_update_user() to preserve existing calendar connections
if existing_user and existing_user.get("calendar", {}).get("connected"):
    # Preserve existing calendar connection if it exists
    user_doc["calendarSynced"] = existing_user.get("calendarSynced", False)
    user_doc["calendar"] = existing_user.get("calendar", {})
else:
    # Set calendar fields from user_data for new users only
    user_doc["calendarSynced"] = user_data.get("calendarSynced", False)
    user_doc["calendar"] = user_data.get("calendar", {})
```

**Frontend (`frontend/auth/AuthContext.tsx`)**:
- Added 500ms delay before resetting OAuth state to prevent race conditions
- Removed problematic additional user storage call that caused Firebase errors

### Result
✅ Calendar connection now persists through auth state changes  
✅ Google Calendar events sync successfully to dashboard  
✅ No more "Google Calendar not connected" errors
