# General Development Rules
- Use task-based development approach
- Before implementing code:
    - If requirements for a task in task.md are unclear or you feel like you don't have full context, keep asking necessary clarifying questions until confident.
<!-- - For each task: write tests, implement code, run tests -->
- When implementing code:
    - Document complex logic with inline comments
    - Modular architecture with clear separation of concerns
    - Create reusable helper functions for common operations
    - Always consider the following:
        - Do not unnecessarily remove any comments or code.
        - Error handling
        - Edge cases
        - Performance optimization
        - Best practices for [language/framework]
        - Generate the code with clear comments explaining the logic.
<!-- - When tests pass:
  - Update task.md (mark task as complete)
  - Update memory.md with current state
  - Fix any warnings/errors
  - Stop and open a new chat for next task -->

## Frontend Development Rules (TypeScript/React)
- Use TypeScript strict mode with proper interface/type definitions
- Imports: Group by (1)React/3rd-party (2)Components (3)Hooks (4)Types/Utils
- Naming: PascalCase for components, camelCase for functions/variables
- Components: Functional components with proper type annotations
- Styling: Tailwind CSS with shadcn/ui components
- Error handling: try/catch blocks with toast notifications
- Path aliases: Use @/* import paths (configured in tsconfig.json)

## Backend Developmen Rules (Python/Flask)
- Route organization: Blueprint pattern with clear endpoints
- Type annotations: Use Python typing module
- Naming: snake_case for functions/variables
- Error handling: try/except blocks with consistent error responses
- Models: Class-based with validation methods
- Documentation: Clear docstrings for functions and classes

# Memory Management
- Keep memory.md up-to-date with project state based on completed tasks in task.md
- Include technical decisions and context needed between sessions
- Do not annotate task completion in memory.md. It will be tracked in task.md

# Update development guidelines
- If necessary, update this file development-guidelines.md to reflect anything you've learned while working on the project.