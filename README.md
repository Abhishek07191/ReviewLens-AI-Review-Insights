# ReviewLens – AI Review Insights

ReviewLens is a full-stack customer-review analytics app for online store owners. Upload a CSV of customer reviews to clean and deduplicate the data, analyze each unique review with Gemini, and explore sentiment, themes, product comparisons, rating mismatches, and optional reply suggestions.

The application does not ship fabricated review data or precomputed analytics. The `data/reviews.csv` file is a header-only import template because the assessment’s exact 30-review dataset was not included in the repository or prompt. Replace it with the supplied assessment CSV when available.

## Features

- CSV uploads with required-column validation, malformed/empty-row handling, optional ratings, and a 5 MB limit.
- Unicode-preserving review cleaning for English, Hindi, Hinglish, and emoji; HTML tags are removed before review text is returned to the browser.
- SHA-256 deduplication of normalized review text. All original review IDs and rows are retained; identical text is analyzed once.
- Persistent SQLite analysis cache, cache-hit and Gemini-call tracking.
- Gemini JSON output validated with Zod; invalid model output gets one retry, and 429/5xx failures use bounded exponential backoff.
- Reviews processed in batches of at most five concurrent model requests.
- Responsive dashboard with sentiment and product charts, complaint/praise topics, filters, product analytics, and rating/sentiment agreement.
- Suggested replies are generated only after a user clicks **Suggest reply**. Replies are empathetic and must not promise a refund or replacement.
- Gemini credentials remain on the server. An upload with no configured key receives an explicit API error.

## Technology

| Area | Stack |
| --- | --- |
| Client | React, TypeScript, Vite, Tailwind CSS v4, Lucide React, Recharts, Axios |
| Server | Node.js, Express 5, TypeScript, SQLite (`better-sqlite3`) |
| AI | Official Google GenAI SDK (`@google/genai`), Gemini |
| Validation | Zod |
| CSV | `csv-parse` |
| Tests | Vitest, Supertest |

## Architecture

```text
Browser (React)
  └── Axios → Vite /api proxy in development
        └── Express API
              ├── CSV parser, validator, and HTML sanitizer
              ├── SQLite reviews, upload metadata, analysis cache, and usage events
              └── Gemini analysis / on-demand reply generation
```

The client uses `VITE_API_URL` when set; otherwise it requests `/api`. During development Vite proxies `/api` to `http://localhost:3001`. The Express app exposes dashboard and review endpoints and keeps all API credentials server-side.

## Folder structure

```text
client/
  src/
    components/       Reusable dashboard, chart, upload, and review components
    hooks/            Review and dashboard data loading
    pages/            Overview, Reviews, Products, and Settings
    services/         Typed Axios API client
    types/            API response types
    App.tsx
    main.tsx
server/
  src/
    controllers/      HTTP request handlers
    database/         SQLite schema and connection setup
    middleware/       API error handling
    routes/           Express routers
    services/         CSV, upload/cache, Gemini, and analytics logic
    types/
    utils/
    app.ts
    server.ts
  tests/
data/
  reviews.csv         Header-only upload template; assessment rows not supplied
.env.example
package.json          npm workspace scripts
```

## Requirements and installation

- Node.js 22.12+ (Node 24 recommended)
- npm 10+
- A Gemini API key for live analysis and reply generation

Install all workspace dependencies from the repository root:

```bash
npm install
```

Create a local environment file and add your Gemini API key:

```bash
cp .env.example .env
```

```dotenv
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
SQLITE_PATH=./data/reviewlens.sqlite
GEMINI_API_KEY=your_server_side_key
GEMINI_MODEL=gemini-2.5-flash
MAX_UPLOAD_SIZE_MB=5
```

Keep `.env` private; it is ignored by Git. Never put the Gemini key in a `VITE_*` variable or client source. The key is loaded by the server from the repository-root `.env` file or the server process environment.

## Run the application

Start the client and API together:

```bash
npm run dev
```

- Web app: `http://localhost:5173`
- API health: `http://localhost:3001/api/health`

The Vite development server proxies API requests to Express. For a separate frontend/API deployment, set `VITE_API_URL` to the API base URL ending in `/api` and configure `CLIENT_ORIGIN` on the server.

## CSV format

The canonical columns are:

```csv
review_id,product,rating,review_text
```

`review_id`, `product`, and `review_text` are required. The rating column or an individual rating may be absent; missing, non-numeric, or out-of-range ratings are stored as unknown. Header aliases such as `id`, `product_name`, `review`, `text`, `comment`, `stars`, and `score` are supported. Uploads accept `.csv` files up to the configured size.

The assessment specified an exact 30-review CSV and an R012 prompt-injection example, but that dataset was not supplied with this workspace. The included CSV is intentionally header-only; no substitute reviews or analytical results have been invented. When the original is provided, put its rows in `data/reviews.csv` and upload it in the browser.

## AI prompt and prompt-injection protection

Analysis calls are made only from the backend using `@google/genai`. The system instruction defines the classification task and says review text is untrusted data, never instructions. Review text is passed separately as JSON content in the user message, not interpolated into the system instruction. Gemini is asked for strict JSON with exactly `sentiment`, `topics`, `summary`, and `needs_reply`; Zod independently rejects malformed JSON, extra keys, unsupported sentiments/topics, and invalid field types before data is saved.

Prompt text cannot override the system instructions. This strategy is designed to classify a review by its actual product experience even if the review also contains commands or prompt text. Because the supplied R012 row is unavailable, its real model classification has not been run or verified here.

Reply generation uses a separate, click-triggered request and system instruction. It tells Gemini to treat review/product fields as untrusted and to avoid promises of refunds, replacements, credits, or actions already taken. Generated reply content is validated and displayed as text, not HTML.

## Caching, batching, and retries

- Review text is normalized with Unicode NFKC, English-locale lowercase, and whitespace folding; SHA-256 of that value is the persistent cache key. Punctuation, Hindi characters, and emoji are preserved.
- Duplicate hashes within one upload are analyzed once while every original row and review ID remains available in the table.
- Completed analyses are read from SQLite on re-upload. Only uncached or previously failed unique reviews are sent to Gemini.
- At most five unique reviews are processed concurrently. The application does not submit a full 30-review file as one prompt or launch 30 concurrent requests.
- Gemini requests have a 15-second timeout and SDK-level automatic retries are disabled. HTTP 429/5xx responses get at most three total attempts with exponential backoff. Invalid JSON/schema output gets one additional generation attempt. Exhausted analyses are persisted as `analysis_failed`.
- API-call events, cache hits, and processing duration are stored for the dashboard. No AI call is reported as successful unless a valid response was received.

## API endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | API health check |
| `GET` | `/api/dashboard` | Latest-upload analytics and usage stats |
| `GET` | `/api/reviews` | Latest-upload reviews; optional `product`, `sentiment`, `topic`, `limit`, `offset` |
| `POST` | `/api/reviews/upload` | Validate, persist, deduplicate, and analyze a CSV upload |
| `POST` | `/api/reviews/:recordId/reply-suggestion` | Generate a reply for one analyzed review marked as needing a reply |

## Testing and quality checks

Run the backend tests, both workspace builds, client lint, and dependency audit:

```bash
npm test
npm run build
npm run lint
npm audit
```

The Vitest/Supertest suite covers CSV cleaning and required headers, Unicode/HTML handling, missing and invalid ratings, duplicate IDs and hashes, file validation, persistent cache hits, Gemini schema validation, invalid-response retry, 429 backoff, five-request concurrency, analysis failure persistence, dashboard calculations/filters, missing API-key errors, and click-only reply generation.

These automated tests use injected model responses and do not make real Gemini requests. Live AI behavior requires a valid `GEMINI_API_KEY`; without it, the upload API returns `503` rather than pretending analysis succeeded.

## Screenshots

The dashboard is responsive and was visually checked in the local browser at desktop and narrow viewport widths. Screenshots are not committed yet; add reviewed captures here when available.

## Known limitations

- The exact assessment dataset was not present, so `data/reviews.csv` is only a header template and actual R012 classification remains unverified.
- This is a single-workspace assessment application; authentication, multi-tenant isolation, and role permissions are not implemented.
- Upload analysis runs synchronously in the request, so large files or slow upstream responses can take time. The upload size is capped.
- Gemini sentiment/topic/summary quality depends on the configured model and customer language/context; human review is recommended.
- The production host should provide HTTPS, a reverse proxy for the API, backups for SQLite, and an appropriate data-retention policy.

## Future improvements

- Add authenticated workspaces and role-based access.
- Move long-running analysis to a durable background queue with progress events.
- Support export, date-range comparisons, and per-upload history.
- Add model-evaluation fixtures from the original assessment dataset and confidence/calibration monitoring.
- Add deployment-specific screenshots and Docker Compose.

## AI coding tools

GitHub Copilot (Copilot SDK in VS Code) was used as an implementation assistant. The project code, tests, and generated insights remain reviewable; no live Gemini result is claimed without an API key and successful model response.
