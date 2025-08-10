# Development Directory

This directory contains development artifacts, logs, and temporary files that are not part of the main application but are useful during development and debugging.

## Contents

- `reports/` - Generated development reports
- `logs/` - Development and debug logs
- Development scripts and utilities
- Temporary validation files

## Usage

This directory is typically ignored by version control and should not contain production code. Files here are meant for:

- Development debugging
- Temporary analysis scripts
- Generated reports and logs
- Agent development artifacts

## Cleanup

Periodically clean this directory to remove outdated artifacts:

```bash
# Remove old logs (older than 30 days)
find .dev/logs -type f -mtime +30 -delete

# Remove old reports (older than 90 days)  
find .dev/reports -type f -mtime +90 -delete
```