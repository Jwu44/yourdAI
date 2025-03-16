# Memory and Storage Architecture

## Overview

This document outlines the memory and storage architecture for the YourdAI application. It covers database design, caching strategies, and storage optimization techniques implemented across the system.

## Database Architecture

### MongoDB Collections

The application uses MongoDB as its primary database with the following collection structure:

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `users` | Stores user profiles and authentication data | `googleId`, `email`, `displayName`, `role` |
| `user_schedules` | Stores user scheduling data | `user_id`, `date`, `tasks` |
| `ai_suggestions` | Stores AI-generated schedule suggestions | `user_id`, `date`, `created_at` |
| `microstep_feedback` | Stores user feedback on task decomposition | `user_id`, `task_id`, `feedback` |

### Indexing Strategy

To optimize query performance, we maintain the following indexes:

- `users`: `{ googleId: 1 }` (unique)
- `user_schedules`: `{ user_id: 1, date: 1 }` (compound)
- `ai_suggestions`: `{ user_id: 1, date: 1, created_at: -1 }` (compound)

## Caching Strategy

### Client-Side Caching

- Authentication tokens are cached in the browser's localStorage
- Schedule data is cached in React state with SWR for revalidation
- Static assets are cached via service worker with a cache-first strategy

### Server-Side Caching

- MongoDB query results are cached in-memory for frequently accessed data
- Firebase token verification results are cached to reduce authentication overhead
- Task categorization results are cached using TTLCache to reduce AI API calls
- Decomposition results use LRUCache for frequently accessed tasks

## Storage Optimization

### Data Serialization

- ObjectId fields are converted to strings for JSON serialization
- Datetime objects are converted to ISO format strings
- Nested objects are flattened where appropriate to reduce document size
- Custom Python objects (like Task instances) are serialized to dictionaries before MongoDB storage using the `serialize_tasks()` utility function
- Serialization is applied to entire document structures to ensure all nested objects are properly converted

### Large Object Handling

For large objects such as user profile images:
- Images are stored as URLs pointing to Firebase Storage
- Binary data is never stored directly in MongoDB documents

## Memory Management

### Backend Memory Considerations

- Flask application is configured with appropriate worker processes based on instance size
- MongoDB connection pooling is implemented to efficiently reuse connections
- Memory-intensive operations (like AI processing) are executed asynchronously
- Custom Python objects are properly serialized before database storage to prevent InvalidDocument errors

### Frontend Memory Considerations

- React component memoization is used to prevent unnecessary re-renders
- Large lists implement virtualization to render only visible items
- Images are lazy-loaded and properly sized to reduce memory usage

## CORS Configuration

### Cross-Origin Resource Sharing

- CORS is configured at multiple levels to ensure secure cross-origin communication:
  - Global application-level CORS configuration in `application.py`
  - Blueprint-level CORS handlers in `api_bp` using `after_request` decorator
  - Explicit OPTIONS method handlers for preflight requests on critical endpoints
- Allowed origins are configured via environment variables (CORS_ALLOWED_ORIGINS)
- All API endpoints properly handle OPTIONS preflight requests to prevent CORS errors
- Headers are configured to allow credentials, content-type, and other necessary headers

### API Endpoint Structure

- All backend API endpoints are registered under the `/api/` prefix
- Frontend API calls must include this prefix when making requests
- Error handling includes proper status codes and CORS headers for cross-origin errors