# Documentation Directory

## Purpose
Comprehensive documentation for architecture, development, and deployment. Keep docs task-focused and up-to-date with code changes.

## Quick Commands
- `npm run docs:dev` - Start documentation server (if configured)
- `npm run docs:build` - Build documentation site
- `npm run docs:serve` - Serve built documentation

## Conventions

### Documentation Structure
- `architecture/` - Technical architecture and design decisions
- `development/` - Development guides and setup instructions
- `api/` - API documentation and references
- `deployment/` - Deployment and infrastructure guides

### Writing Guidelines
- Use clear, concise language
- Include code examples
- Link to source files rather than duplicating
- Keep diagrams and visuals simple
- Update docs when code changes

### File Organization
- Use descriptive filenames
- Group related content together
- Use consistent formatting
- Include table of contents for long docs

## Dependencies
- Markdown for documentation
- Mermaid for diagrams (if used)
- Link to source code files
- Reference external documentation

## Documentation Types

### Architecture Docs
- System overview and design decisions
- Component relationships and data flow
- Migration strategies and future plans
- Performance considerations

### Development Docs
- Setup and installation instructions
- Coding standards and conventions
- Testing guidelines and best practices
- Debugging and troubleshooting

### API Docs
- Convex query and mutation reference
- Data type definitions
- Authentication and authorization
- Error handling and responses

## Common Patterns

### Architecture Document
```markdown
# Component Architecture

## Overview
[High-level description]

## Design Decisions
- [Decision 1]: [Rationale]
- [Decision 2]: [Rationale]

## Implementation
[Code examples and patterns]

## Future Considerations
[Planned changes and improvements]
```

### Development Guide
```markdown
# Development Setup

## Prerequisites
- Node.js 18+
- npm 8+

## Installation
```bash
npm install
```

## Configuration
[Environment setup]

## Development Workflow
[How to develop features]
```

## Maintenance
- Review docs monthly
- Update when code changes
- Remove outdated information
- Add new patterns and conventions

## Pitfalls
1. **Don't duplicate code** - Link to source files
2. **Don't skip updates** - Keep docs current
3. **Don't use jargon** - Write for all skill levels
4. **Don't forget examples** - Include code samples
5. **Don't ignore structure** - Organize logically

## Links
- [Architecture Overview](./architecture/)
- [Development Guides](./development/)
- [API Reference](./api/)
- [Deployment Guide](./deployment/)