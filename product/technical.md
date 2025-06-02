# YourdAI Technical Specifications

## Data Models

### Backend Models

#### AISuggestion
- **Purpose**: Represents AI-generated schedule suggestions for users
- **Key Fields**:
  - `id` (str): Unique identifier (MongoDB ObjectId)
  - `text` (str): Suggestion content
  - `type` (SuggestionType): Suggestion type (Energy Optimization, Procrastination Prevention, etc.)
  - `rationale` (str): Explanation for the suggestion
  - `confidence` (float): Confidence score (0-1)
  - `categories` (List[str]): Associated categories
  - `user_id` (str): User reference
  - `date` (str): Target date
- **Relationships**: Links to User model
- **Storage**: MongoDB with indexes on user_id+date and confidence

#### Task
- **Purpose**: Core model for user tasks
- **Key Fields**:
  - `id` (str): UUID identifier
  - `text` (str): Task description
  - `categories` (Set[str]): Associated categories/tags
  - `is_subtask`/`is_microstep`/`is_section` (bool): Task structure flags
  - `completed` (bool): Completion status
  - `parent_id` (str, optional): Parent task for hierarchy
  - `level` (int): Indentation/hierarchy level
  - `is_recurring` (RecurrenceType): Recurrence pattern
  - `start_date` (str): Scheduled date
  - `estimated_time`/`energy_level_required`: Task characteristics
- **Special Methods**:
  - Category management
  - Status toggling
  - Hierarchy manipulation
  - Recurrence configuration

#### User
- **Purpose**: User data storage
- **Key Fields**:
  - `googleId`/`email`/`displayName`: User identity
  - `role`: free/premium/admin
  - `calendar`: Integration configuration
    - Connection status, sync metadata
    - OAuth credentials (tokens, scopes)
    - Selected calendars
- **Storage**: MongoDB with JSON schema validation

### Frontend Models (TypeScript)

- **Task**: Mirror of backend Task with frontend-specific fields
- **AISuggestion**: TypeScript representation of backend AISuggestion
- **FormData**: User schedule configuration (work hours, preferences, tasks)
- **UserDocument**: Frontend user representation with extended metadata
- **ScheduleDocument**: Generated schedule container
- **Supporting Types**: RecurrenceType, LayoutPreference, TimeSlot, etc.

## AI Capabilities

### Models Used
- **Primary**: `claude-3-5-sonnet-20241022` (complex tasks)
- **Secondary**: `claude-3-5-haiku-20241022` (simpler tasks)
- **Implementation**: Anthropic Python SDK

### Core Capabilities
1. **Schedule Generation**: Personalized daily schedules based on user preferences
2. **Task Categorization**: Automatic categorization into predefined categories
3. **Task Decomposition**: Breaking down complex tasks into actionable microsteps
4. **Schedule Suggestions**: Personalized productivity optimization suggestions

### Prompt Engineering
- **Retrieval-Augmented Generation**: Template-based generation with 8 different schedule formats
- **Structured Prompts**: XML-tagged information organization for the model
- **Expert Personalization**: Models act as productivity and psychology experts
- **Output Structuring**: JSON templates for structured responses

### Processing & Integration
- **Caching**: TTL, LRU, and pattern caching for performance optimization
- **Frontend Components**: Dedicated React components for AI content display
- **Feedback Loop**: User feedback collection on AI suggestions
- **API Integration**: REST endpoints exposing AI capabilities
- **Response Processing**: JSON parsing and validation for AI outputs

## Integration Architecture

- **Backend → AI**: Service layer integration with Anthropic API
- **Frontend → Backend**: REST API endpoints for AI capabilities
- **Database**: MongoDB for persistent storage of all models
- **Authentication**: Firebase for user authentication and security

## Interface Implementation

### Frontend Components Architecture

#### UI Component Structure
- **Base Components**: Built on Radix UI primitives in `/components/ui/`
  - Includes button, input, dialog, drawer, toast, select, etc.
  - Uses class variance authority (cva) for component variants
  - Shadow-based design system with consistent styling across components
  - All components fully typed with TypeScript interfaces

#### Application Components
- **Page Components**: Next.js pages in app directory structure
  - Dashboard, Tasks, Settings, Onboarding flows
- **Part Components**: Specialized UI elements in `/components/parts/`
  - TaskItem: Displays and allows interaction with task data
  - EditableSchedule: Complex schedule visualization and editing
  - TaskEditDrawer: Side drawer for detailed task editing
  - AISuggestionsList: Displays AI-generated productivity suggestions
  - MicrostepSuggestions: Shows task breakdown suggestions

#### Component Patterns
- Functional components with React hooks
- Component memoization with React.memo for performance
- Explicit prop typing with TypeScript interfaces
- Consistent data flow patterns (props down, events up)
- Compound components for complex UI elements
- Composition over inheritance throughout the codebase

### Styling Implementation
- Tailwind CSS for utility-based styling
- Custom theme configuration in tailwind.config.ts
- Component-specific styles via className props
- Dark/light mode support with theme variables
- Responsive design using Tailwind breakpoint utilities
- Custom font implementation (Geist) for typography

## Service Implementation

### Backend API Structure
- **Flask Blueprint Architecture**:
  - `/backend/apis/routes.py`: Main application routes
  - `/backend/apis/calendar_routes.py`: Calendar integration endpoints
  - RESTful API design with resource-based URL structure
  - Consistent error response format

### AI Service Implementation
- **Service Module**: `/backend/services/ai_service.py`
  - Direct integration with Anthropic's Claude API
  - Caching strategies (TTL, LRU, pattern-based)
  - Prompt engineering with templated XML formatting
  - Response parsing for structured data extraction
  - Error handling with fallback strategies
  - Performance optimizations for latency-sensitive operations

### Authentication Service
- **Firebase Integration**:
  - Google OAuth authentication flow
  - Custom React context provider (AuthContext.tsx)
  - Token-based authentication
  - User state persistence
  - Protected routes with RouteGuard component
  - Role-based access control
  - Service-side validation of authentication tokens

### Calendar Integration
- **Google Calendar API Integration**:
  - OAuth 2.0 authentication flow
  - Two-way synchronization (tasks ↔ calendar events)
  - Conflict resolution for overlapping events
  - Selective calendar import/export
  - Event metadata preservation
  - Custom API client implementation in calendarApi.ts

## Data Flow Architecture

### State Management
- **Context API Implementation**:
  - AuthContext: User authentication state and methods
  - FormContext: Complex form state with reducer pattern
  - Uses TypeScript for type safety in state management
  - Provides memoized values to prevent unnecessary re-renders

### API Communication Patterns
- **Data Fetching Strategy**:
  - Centralized API client in lib/api.ts and lib/calendarApi.ts
  - Error handling with consistent error response format
  - Optimistic updates for improved user experience
  - Caching for frequently accessed data
  - Retry mechanisms for critical operations

### Task Data Flow
1. User input → Form state → Backend storage
2. AI processing for categorization and decomposition
3. Schedule generation combining tasks and calendar events
4. UI rendering with EditableSchedule component
5. Updates through TaskEditDrawer propagate to state and backend
6. Recurrence handling for repeating tasks

### User Preference Flow
- Preferences stored in FormContext state
- Synchronized with backend for persistence
- Influences AI-generated content through prompt engineering
- Affects UI presentation (layout, color themes, etc.)
- Controls integration behaviors (calendar sync, notifications)

## Design Patterns

### Frontend Patterns
- **Component Composition**: Building complex UIs from simple components
- **Higher-Order Components**: Used for cross-cutting concerns like authentication
- **Custom Hooks**: Encapsulating reusable logic (useForm, useToast)
- **Render Props**: Used in some components for flexible rendering

### Backend Patterns
- **Repository Pattern**: For data access abstraction
- **Service Layer**: Separating business logic from controllers
- **Factory Pattern**: Creating different prompt templates
- **Strategy Pattern**: Different AI processing strategies based on task types
- **Decorator Pattern**: Request validation and authentication checks

### Optimization Strategies
- **Memoization**: React.memo and useMemo for performance
- **Code Splitting**: Dynamic imports for route-based code splitting
- **Caching**: Multiple caching strategies (TTL, LRU, response)
- **Lazy Loading**: Components and images loaded on demand
- **API Response Normalization**: Consistent data structures

## Dependency Analysis

### Frontend Dependencies

#### Core Libraries
- **React 18**: Core UI library
- **Next.js 14.2.11**: React framework with SSR and routing
- **TypeScript 5**: Type system and compiler

#### UI Component Libraries
- **Radix UI**: Low-level UI primitives
- **shadcn/ui**: Component library built on Radix UI
- **Material UI 5.14+**: Component system for some UI elements
- **Framer Motion 11.5.6**: Animation library
- **Evergreen UI 7.1.9**: Supplementary UI components
- **Lucide React 0.441.0**: Icon set

#### Styling
- **Tailwind CSS 3.4.1**: Utility-first CSS framework
- **Emotion**: CSS-in-JS solution
- **tailwind-merge & class-variance-authority**: Utility libraries for CSS

#### Functionality
- **React Beautiful DND 13.1.1**: Drag and drop functionality
- **Dayjs 1.11.10**: Date manipulation library
- **Lodash 4.17.21**: Utility functions
- **UUID 10.0.0**: Unique ID generation

#### Authentication
- **Firebase 11.1.0**: Authentication services
- **Firebase Admin 13.0.1**: Server-side auth verification

### Backend Dependencies

#### Web Framework
- **Flask 2.3.2**: Python web framework
- **Flask-Cors 5.0.0**: Cross-origin resource sharing
- **Gunicorn 21.2.0**: WSGI HTTP server

#### Database
- **MongoDB (pymongo 4.6.1)**: NoSQL database driver
- **dnspython 2.4.2**: DNS utilities for MongoDB connection

#### AI Services
- **Anthropic SDK (≥0.5.0)**: Claude AI API client
- **cachetools**: Caching utilities for AI results

#### Validation & Configuration
- **Pydantic 2.5.2**: Data validation and settings management
- **python-dotenv 1.0.0**: Environment variable management

### Development Dependencies

- **ESLint**: Code linting (version 8.x for frontend, 9.9.0 for root)
- **TypeScript Type Definitions**: Various @types packages
- **PostCSS 8**: CSS transformation tool
- **Tailwind plugins**: Animation and utility extensions

### Dependency Relationships

1. **Authentication Chain**:
   - Firebase Authentication (frontend) ➝ Token Generation
   - Token Verification (backend) ➝ User Session
   - MongoDB User Storage ➝ User Preferences

2. **AI Service Chain**:
   - Frontend Request ➝ Backend API
   - API Routes ➝ AI Service
   - AI Service ➝ Anthropic Claude API
   - Response Processing ➝ Frontend Display

3. **Calendar Integration**:
   - Google OAuth ➝ Token Storage
   - Calendar API Client ➝ Event Retrieval
   - Event Processing ➝ Task Conversion
   - Two-way Synchronization

### Dependency Challenges

1. **Version Management**:
   - Multiple Firebase versions (11.0.2 in root, 11.1.0 in frontend)
   - Different ESLint versions across packages

2. **External Dependencies**:
   - Anthropic Claude API availability and latency
   - Google Calendar API rate limits
   - Firebase authentication service reliability

3. **Integration Complexity**:
   - Coordinating Firebase Auth with backend session management
   - Maintaining calendar sync with conflict resolution
   - Managing environment-specific configuration