# Contributing to Rabbit

Thank you for your interest in contributing to Rabbit! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 8 or higher
- Git
- A code editor (VS Code recommended)

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/rabbit.git
   cd rabbit
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## 📋 Development Guidelines

### Code Standards

- **TypeScript**: Use strict typing, avoid `any` unless absolutely necessary
- **Naming**: Use descriptive names, follow established conventions
- **Formatting**: Use Prettier for consistent formatting
- **Linting**: Follow ESLint rules, fix all warnings and errors

### File Organization

- **Components**: Place in appropriate feature folder under `components/`
- **Business Logic**: Add to `lib/` with proper separation of concerns
- **Types**: Define in `lib/types.ts` or feature-specific type files
- **Tests**: Co-locate with source files or in `tests/` directory

### Commit Messages

Use conventional commit format:

```
type(scope): description

feat(analytics): add YoY comparison metrics
fix(parser): resolve timestamp cross-contamination
docs(readme): update setup instructions
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## 🧪 Testing Requirements

### Unit Tests
- Write tests for all new functions and components
- Aim for >80% code coverage
- Use descriptive test names

### Integration Tests
- Test component interactions
- Verify data flow between modules

### E2E Tests
- Test complete user workflows
- Use Playwright for browser automation
- Keep tests stable and reliable

### Validation Scripts
- Run validation scripts for data integrity
- Ensure analytics calculations are accurate
- Test parser with various input formats

## 📝 Documentation

### Code Documentation
- Document complex functions with JSDoc
- Use clear, descriptive comments
- Explain business logic and algorithms

### README Updates
- Update README.md for new features
- Keep setup instructions current
- Document new environment variables

### CLAUDE.md Files
- Update folder-specific `CLAUDE.md` files when patterns change
- Keep guidance concise and actionable
- Link to detailed docs rather than duplicating content

## 🔄 Pull Request Process

### Before Submitting

1. **Run Quality Checks**
   ```bash
   npm run lint
   npm run type-check
   npm run test
   npm run validate:all
   ```

2. **Test Your Changes**
   - Test in development environment
   - Verify all functionality works
   - Check for regressions

3. **Update Documentation**
   - Update relevant docs
   - Add comments for complex code
   - Update `CLAUDE.md` if needed

### Pull Request Guidelines

1. **Clear Description**
   - Explain what the PR does
   - Reference related issues
   - Include screenshots for UI changes

2. **Small, Focused Changes**
   - One feature or fix per PR
   - Keep changes manageable
   - Avoid large refactoring in single PR

3. **Code Review**
   - Address all review comments
   - Be open to feedback
   - Ask questions if unclear

### Review Process

1. **Automated Checks**
   - All CI checks must pass
   - No linting errors
   - All tests passing

2. **Manual Review**
   - Code follows established patterns
   - Documentation is updated
   - No breaking changes

3. **Architecture Compliance**
   - Follows separation of concerns
   - Maintains type safety
   - Supports migration path

## 🏗️ Architecture Guidelines

### Component Patterns

```typescript
// Component structure
interface ComponentProps {
  data: WatchRecord[]
  filters: FilterOptions
  className?: string
}

export function Component({ data, filters, className }: ComponentProps) {
  // Component implementation
}
```

### Data Flow
1. Components receive data as props
2. Use aggregation functions from `lib/`
3. Apply filters and transformations
4. Render with Recharts or custom UI

### Error Handling
- Use try-catch for async operations
- Implement error boundaries for components
- Provide user-friendly error messages
- Log errors for debugging

## 🐛 Bug Reports

### Before Reporting
1. Check existing issues
2. Verify bug in latest version
3. Test in different browsers
4. Check console for errors

### Bug Report Template
```markdown
**Bug Description**
Clear description of the bug

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- OS: [e.g. macOS, Windows, Linux]
- Browser: [e.g. Chrome, Firefox, Safari]
- Version: [e.g. 1.0.0]

**Additional Context**
Screenshots, logs, etc.
```

## ✨ Feature Requests

### Before Requesting
1. Check existing feature requests
2. Consider if feature fits project scope
3. Think about implementation complexity
4. Consider user impact

### Feature Request Template
```markdown
**Feature Description**
Clear description of the feature

**Use Case**
Why is this feature needed?

**Proposed Solution**
How should this work?

**Alternatives Considered**
Other approaches you've thought about

**Additional Context**
Screenshots, mockups, etc.
```

## 🏷️ Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements to documentation
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention needed
- `priority: high`: Urgent issue
- `priority: medium`: Normal priority
- `priority: low`: Low priority

## 📞 Getting Help

- **Documentation**: Check the `docs/` folder
- **Issues**: Search existing issues
- **Discussions**: Use GitHub Discussions
- **Code Review**: Ask questions in PR comments

## 🎯 Development Focus Areas

### High Priority
- Data integrity and accuracy
- Performance optimization
- User experience improvements
- Test coverage

### Medium Priority
- New analytics features
- UI/UX enhancements
- Documentation improvements
- Developer experience

### Low Priority
- Nice-to-have features
- Experimental features
- Minor optimizations

## 📊 Performance Guidelines

### Bundle Size
- Keep bundle size reasonable
- Use code splitting for large features
- Optimize images and assets
- Monitor bundle size changes

### Runtime Performance
- Use React.memo for expensive components
- Implement proper loading states
- Optimize re-renders
- Use efficient data structures

### Development Performance
- Keep build times fast
- Use fast refresh for development
- Optimize test execution time
- Use efficient development tools

## 🔒 Security Guidelines

### Data Handling
- Never log sensitive data
- Validate all inputs
- Use proper authentication
- Follow security best practices

### Dependencies
- Keep dependencies updated
- Audit for security vulnerabilities
- Use trusted packages
- Minimize attack surface

## 📈 Code Quality Metrics

We track these metrics to maintain code quality:

- **Test Coverage**: >80%
- **Type Coverage**: >95%
- **Lint Errors**: 0
- **Build Time**: <2 minutes
- **Bundle Size**: Monitor for increases

## 🤝 Community Guidelines

### Be Respectful
- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism
- Focus on what's best for the community

### Be Collaborative
- Help others when possible
- Share knowledge and experience
- Work together on solutions
- Celebrate contributions

### Be Professional
- Keep discussions on-topic
- Use appropriate language
- Follow project conventions
- Be patient with newcomers

## 📝 License

By contributing to Rabbit, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Rabbit! 🎉
