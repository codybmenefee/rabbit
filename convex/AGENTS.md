# Convex Agent Notes

- **Internal vs Public functions**
  - Public (authenticated) for user flows: `uploads.create`, `uploads.updateStatus`, `watch_events.create`.
  - Internal (no auth) for jobs: `uploads.listPendingInternal`, `uploads.listFailedInternal`, `uploads.markStatusInternal`, `uploads.getByIdInternal`, `watch_events.createInternal`.

- **Processing actions**
  - `processing.processPendingUploads({ max })` — bulk process pending uploads.
  - `processing.resetFailedUploads()` — requeue failed uploads and clear errors.
  - `processing.processUpload({ uploadId })` — process a single upload.

- **When functions don’t show up**
  - Restart `npx convex dev` or run with `--push`. Ensure the new action appears under Available functions before invoking.


