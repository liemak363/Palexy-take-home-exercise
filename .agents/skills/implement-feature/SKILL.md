# Implement Feature

Implement the requested feature while preserving the project's existing
requirements, architecture, conventions, and behavior.

## Before implementation

1. Read `docs/problem.md` if it exists.
2. Read relevant project documentation and inspect the existing codebase.
3. If `docs/architecture.md`, `docs/decisions.md`, or `docs/progress.md`
   exists, use them as additional context.
4. If project context or previous decisions are provided in the prompt,
   treat them as authoritative for the current task.
5. Identify existing code that should be reused or extended.

## Planning

Before coding:

- Understand the feature's inputs, outputs, dependencies, and constraints.
- Identify the files/modules that need to change.
- Consider important edge cases and existing behavior that must be preserved.
- If an important requirement is ambiguous, state a reasonable assumption.

Keep the implementation focused on the requested feature.
Avoid unrelated refactoring or speculative functionality.

## Implementation

- Follow the existing architecture and coding conventions.
- Prefer extending existing abstractions over creating parallel implementations.
- Keep business logic separate from infrastructure/UI concerns where the
  existing architecture supports this.
- Preserve existing behavior unless the feature requires changing it.

## Validation

After implementation:

- Add or update meaningful tests, especially for business logic and edge cases.
- Run relevant tests, type checks, linting, or build commands.
- Review the final diff for unintended changes.
- Verify that the feature works with the existing application.

## Completion

Report:

- What was implemented.
- Files/modules changed.
- Tests and validation performed.
- Important assumptions or limitations.