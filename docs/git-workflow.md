# Git Workflow for Rabbit Project

This document contains information about the Git repository and common workflows for the Rabbit YouTube History Analyzer project.

## Repository Information

- **GitHub Repository**: [https://github.com/codybmenefee/rabbit](https://github.com/codybmenefee/rabbit)
- **Owner**: @codybmenefee

## Setting Up the Repository

### First-time Setup

```bash
# Clone the repository
git clone https://github.com/codybmenefee/rabbit.git

# Navigate to the project directory
cd rabbit

# Set up Git user information (if not already configured)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Configuration

The repository follows these branch conventions:
- `main`: Main development branch, should always be stable
- Feature branches: Create for new features (format: `feature/feature-name`)
- Bug fix branches: Create for bug fixes (format: `fix/bug-name`)

## Common Workflows

### Starting Work on a New Feature

```bash
# Ensure you have the latest code
git pull origin main

# Create a new feature branch
git checkout -b feature/new-feature-name

# Make your changes...

# Add and commit your changes
git add .
git commit -m "feat: add new feature description"

# Push your branch to GitHub
git push origin feature/new-feature-name

# When ready, create a pull request on GitHub
```

### Making Quick Changes to Main

```bash
# Ensure you have the latest code
git pull origin main

# Make your changes...

# Add and commit your changes
git add .
git commit -m "fix: resolve issue description"

# Push to main
git push origin main
```

### Commit Message Conventions

We follow a simplified version of Conventional Commits:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `refactor:` for code changes that neither fix bugs nor add features
- `test:` for adding or modifying tests
- `chore:` for maintenance tasks

## GitHub Actions and CI/CD

Currently, the repository uses basic GitHub features without advanced CI/CD pipelines. As the project grows, we may implement:
- Automated testing
- Linting checks
- Deployment workflows

## Branch Protection

The `main` branch does not currently have protection rules enabled. If needed, we can set up:
- Required pull request reviews
- Required status checks
- Restrictions on force pushing 