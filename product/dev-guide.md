# Development Guidelines
## Workflow
- Before implementation, thoroughly understand the context from `task.md` 
- If requirements are unclear, ask clarifying questions until confident
- Parse current task requirements, acceptance criteria, and dependencies
- Validate changes against architectural constraints in `architecture.mermaid`

## Code Implementation Approach
- Use task-based development with Test-Driven Development (TDD) principles
- For each task:
  1. Create test files first
  2. Implement code to pass tests
  3. Update status on completion
- Document complex logic with inline comments
- Create reusable helper functions for common operations

## Architecture & Design Principles
- Maintain modular architecture with clear separation of concerns
- Follow SOLID principles
- Ensure new code maintains defined architectural boundaries
- Understand module relationships, data flow patterns, and component dependencies

## Code Style & Patterns

### General Rules
- Keep logic SIMPLE whenever possible
- Do not unnecessarily remove any comments or code
- Implement proper error handling with try/catch (JS) or try/except (Python) blocks
- Consider edge cases, performance optimization, and language/framework best practices

### TypeScript/React Rules
- Use TypeScript strict mode with proper interface/type definitions (avoid 'any')
- Organize imports by: (1) React/3rd-party (2) Components (3) Hooks (4) Types/Utils
- Naming: PascalCase for components, camelCase for functions/variables
- Use functional components with proper type annotations
- Apply Tailwind CSS with shadcn/ui components
- Use @/* import paths (configured in tsconfig.json)
- Document with JSDoc comments

### Python/Flask Rules
- Use Blueprint pattern with clear endpoints
- Implement type annotations using Python typing module
- Naming: snake_case for functions/variables
- Class-based models with validation methods
- Write clear docstrings for functions and classes

## Validation & Error Prevention
- Verify type consistency
- Check for potential null/undefined values
- Validate against business rules
- Ensure comprehensive error handling
- Run tests to validate implementation

## Continuous Improvement
- Update these guidelines as needed to reflect new learnings