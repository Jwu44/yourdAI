from typing import Dict, Any

user_schema_validation = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["googleId", "email", "role", "lastLogin", "createdAt"],
        "properties": {
            "googleId": { "bsonType": "string" },
            "email": { "bsonType": "string" },
            "displayName": { "bsonType": "string" },
            "photoURL": { "bsonType": ["string", "null"] },
            "role": { "enum": ["free", "premium", "admin"] },
            "lastLogin": { "bsonType": "date" },
            "createdAt": { "bsonType": "date" },
            # Add calendar-related fields
            "calendar": {
                "bsonType": "object",
                "properties": {
                    "connected": { "bsonType": "bool" },
                    "lastSyncTime": { "bsonType": ["date", "null"] },
                    "syncStatus": { 
                        "enum": ["never", "in_progress", "completed", "failed"] 
                    },
                    "selectedCalendars": {
                        "bsonType": "array",
                        "items": { "bsonType": "string" }
                    },
                    "credentials": {
                        "bsonType": "object",
                        "properties": {
                            "accessToken": { "bsonType": "string" },
                            "refreshToken": { "bsonType": "string" },
                            "expiresAt": { "bsonType": "date" },
                            "scopes": {
                                "bsonType": "array",
                                "items": { "bsonType": "string" }
                            }
                        }
                    }
                }
            }
        }
    }
}