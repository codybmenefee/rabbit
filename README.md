git clone https://github.com/codybmenefee/rabbit
npm run dev
npm run build        # Build for production
# Rabbit

Minimal YouTube analytics dashboard built with Next.js.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:4000`.

## Structure

- `app/`, `components/`, `lib/`, `public/` – core app
- `convex/` – backend queries/schema (optional)
- `meta/` – documentation, guides, tests

For detailed docs, see the files under `meta/`.

## Uploading Your Watch History

1. Navigate to `/upload` to access the secure upload workflow.
2. Drag and drop or browse for your Google Takeout `watch-history.html` file.
3. Set `BLOB_READ_WRITE_TOKEN` in `.env.local` so the API route can authenticate with Vercel Blob Storage.
4. We store the file in Vercel Blob storage and return the blob URL, path, timestamp, and size.

Blob access defaults to private. The ingestion pipeline automatically processes uploaded files, extracting:

- **Video Details**: Title, YouTube ID, full URL
- **Channel Info**: Title, URL, and stable channel ID (when available from `/channel/` links)
- **Timestamps**: Watched-at times parsed to ISO 8601 UTC, handling common timezone abbreviations (CDT, PST, etc.)
- **Raw Data**: Original HTML snippets preserved for auditability

Files are processed asynchronously by a Convex cron job, upserting videos, channels, and watch events with proper uniqueness constraints.
