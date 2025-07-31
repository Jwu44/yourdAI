# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (Next.js + TypeScript)
```bash
cd frontend

# Development
npm run dev              # Start development server (port 3000)
npm run build           # Build for production
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues
npm run test            # Run Jest tests
npm run test:watch      # Run tests in watch mode
```

### Backend (Flask + Python)
```bash
# Development
python3 application.py  # Start Flask server (port 8000)

# Testing
python -m pytest backend/tests/ -v                 # Run all backend tests with verbose output
python -m pytest backend/tests/integration/ -v     # Run integration tests
python -m pytest backend/tests/test_specific.py    # Run single test file
python -m pytest backend/tests/ -k "test_name"     # Run specific test by name
```

### Full Application
```bash
# Start both services concurrently
python3 application.py &    # Backend on port 8000
cd frontend && npm run dev  # Frontend on port 3000
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Flask with Blueprint architecture, Python 3.11+
- **Database**: MongoDB with Pydantic schema validation
- **AI**: Anthropic Claude API (Sonnet & Haiku models)
- **Auth**: Firebase Authentication
- **External APIs**: Google Calendar, Slack (via Klavis AI MCP)

### Core Architecture Patterns

#### Frontend Architecture
- **Component Structure**: shadcn/ui components in `components/ui/`, custom components in `components/parts/`
- **State Management**: React Context with reducer patterns (FormContext, AuthContext)
- **API Layer**: Centralized API clients in `lib/api/` (tasks.ts, calendar.ts, users.ts, etc.)
- **Import Organization**: (1) React/3rd-party (2) Components (3) Hooks (4) Types/Utils
- **Path Mapping**: Uses `@/*` imports configured in tsconfig.json

#### Backend Architecture
- **Blueprint Pattern**: Modular routes in `backend/apis/` (routes.py, calendar_routes.py, integration_routes.py)
- **Service Layer**: Business logic in `backend/services/` (ai_service.py, schedule_service.py, slack_service.py)
- **Data Models**: Pydantic models in `backend/models/` with validation

#### Task Management System
- **Hierarchical Tasks**: Support for parent-child relationships with indentation levels
- **Drag & Drop**: Custom dnd-kit implementation with indentation support (use-drag-drop-provider.tsx)
- **AI Integration**: Task categorization, decomposition, and schedule generation

### Key Data Models

#### Task Structure (Python & TypeScript)
```typescript
interface Task {
  id: string
  text: string
  categories?: string[]
  completed: boolean
  is_subtask?: boolean
  is_section?: boolean
  section?: string | null
  parent_id?: string | null
  level?: number              // Indentation level (0-n)
  section_index?: number
  type?: string
  is_recurring?: RecurrenceType | null
  is_microstep?: boolean      // AI-generated task breakdown
  source?: 'slack' | 'calendar' | 'manual'
  slack_message_url?: string
}
```

## Development Guidelines

### Code Style
- **TypeScript**: Strict mode, proper interface definitions, avoid 'any'
- **React**: Functional components with hooks, PascalCase for components, camelCase for functions
- **Python**: Type annotations, snake_case naming, docstrings for classes/functions
- **Import Organization**: (1) React/3rd-party (2) Components (3) Hooks (4) Types/Utils

### Key Development Practices
1. **Task-Based Development**: Follow TDD principles - create tests first, then implement code
2. **Type Safety**: TypeScript strict mode, proper interface definitions, avoid 'any'
3. **Error Handling**: Comprehensive try-catch blocks with user-friendly error messages
4. **Code Simplicity**: Keep implementation simple, avoid unnecessary complexity

## Environment Configuration

**Backend (.env)**:
- `MONGODB_URI` - MongoDB connection string
- `ANTHROPIC_API_KEY` - Claude API access
- `FIREBASE_ADMIN_CREDENTIALS` - Firebase service account path
- `KLAVIS_API_KEY` - Required for Slack integration via Klavis AI MCP

**Frontend (.env.local)**:
- `NEXT_PUBLIC_FIREBASE_API_KEY` - Firebase web config
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `NEXT_PUBLIC_API_URL` - Backend API URL (http://localhost:8000 for dev)

## Key Implementation Patterns

### Adding New Task Features
1. Update Task interface in `lib/types.ts`
2. Modify Python Task model in `backend/models/task.py`
3. Update API endpoints in relevant route files
4. Add frontend components and API integration
5. Write tests for both frontend and backend

### Drag & Drop System
- Core logic in `hooks/use-drag-drop-provider.tsx` and `hooks/use-drag-drop-task.tsx`
- Uses @dnd-kit with custom collision detection for parent-child relationships
- Supports horizontal dragging for indentation (indent/outdent operations)

### Archive System
- Archive service in `backend/services/archive_service.py`
- Routes: `/archive/task` (POST), `/archive/tasks` (GET), `/archive/task/<id>` (DELETE)
- Frontend components: `ArchivedTaskItem.tsx`, archive page at `/dashboard/archive`

## Database Collections (MongoDB)
- `UserSchedules` - Daily task schedules and layouts
- `users` - User profiles and integration settings
- `calendar_events` - Synced Google Calendar events
- `AISuggestions` - Generated AI recommendations
- `MicrostepFeedback` - Task decomposition learning data
- `ArchivedTasks` - User archived tasks storage