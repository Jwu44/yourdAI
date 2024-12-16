calendar_events_schema = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["userId", "googleId", "calendarId", "eventId", "startTime", "endTime", "createdAt"],
        "properties": {
            "userId": { "bsonType": "string" },
            "googleId": { "bsonType": "string" },
            "calendarId": { "bsonType": "string" },
            "eventId": { "bsonType": "string" },
            "summary": { "bsonType": "string" },
            "description": { "bsonType": ["string", "null"] },
            "startTime": { "bsonType": "date" },
            "endTime": { "bsonType": "date" },
            "timeZone": { "bsonType": "string" },
            "isRecurring": { "bsonType": "bool" },
            "recurringEventId": { "bsonType": ["string", "null"] },
            "status": { 
                "enum": ["confirmed", "tentative", "cancelled"] 
            },
            "taskId": { "bsonType": ["string", "null"] },  # Reference to task if converted
            "categories": {
                "bsonType": "array",
                "items": { "bsonType": "string" }
            },
            "createdAt": { "bsonType": "date" },
            "updatedAt": { "bsonType": "date" },
            "syncStatus": {
                "enum": ["synced", "pending", "failed"]
            }
        }
    }
}