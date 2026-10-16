# ToolMavo

A working Vue 3 website based on the supplied [HTML prototype](design/layout.html), with a Java 21 / Spring Boot API and PostgreSQL storage. The original teal design, six categories, 30 tools, responsive navigation, search, and company pages are implemented.

![Desktop website](docs/home-desktop.png)

## Features

- **Images:** compression to JPEG, resize, JPG → WebP, WebP → JPG, PNG → JPG, centered crop. Preview and download results. JPEG output uses a white background for transparency.
- **PDF:** merge in selection order, extract selected pages, images → PDF, PDF pages → JPG, reorder selected pages, text watermark. Page selection accepts `1,3-5,2`. Split produces one PDF of selected pages; JPG exports have separate download buttons.
- **Calculators:** freelance rate, profit margin, markup, VAT added to net amount, discount, break-even. Invalid inputs produce useful errors.
- **Text:** Unicode character and word counts, case conversion, duplicate-line removal, corresponding-line comparison.
- **Developer:** JSON formatting/validation, Unicode Base64 encoding/decoding, URL encoding/decoding, cryptographic UUID v4 generation.
- **Business:** downloadable QR codes, invoice preview/save/print to PDF, UTM links preserving existing URL parameters.
- **Contact:** validated messages stored in PostgreSQL. Email delivery is not configured.

Files and utility inputs are processed in the browser, not uploaded to the API. Only invoice and contact submissions are stored. File limits: 25 MB per file, 30 files, 100 MB combined. Encrypted PDFs are unsupported; JPG rendering exports up to 30 selected pages. Invoice/contact records are private to database operators: there is deliberately no unauthenticated record-listing endpoint.

## Deploy for testing

See [free Render deployment instructions](docs/DEPLOYMENT.md). The root `render.yaml` defines the complete website and PostgreSQL on free test plans. Netlify configuration is also included for use with a separately deployed backend.

## Quick start with Docker

Requires Docker and Docker Compose v2.

```bash
cp .env.example .env
# Edit .env: choose a strong unique DATABASE_PASSWORD for deployment.
docker compose up --build -d
curl --fail http://localhost:8080/api/health
```

The app serves the production Vue build and API from port **8080**. PostgreSQL is bound to loopback port **5432** and stored in the named `postgres_data` volume. `docker compose down` retains data; `docker compose down -v` deletes it. Changing the password after initialization also requires updating the database role password; changing `.env` alone does not change an existing PostgreSQL role.

## Local development

Requires Node.js **22.12+ or 24**, npm, **JDK 21** (not only a JRE), Maven **3.9+**, and PostgreSQL **17** (or Docker for the database).

```bash
cp .env.example .env
# Terminal 1, project root:
docker compose up -d db

# Terminal 2:
cd backend
# Defaults match .env.example; export DATABASE_PASSWORD if changed.
mvn spring-boot:run

# Terminal 3:
cd frontend
npm ci
npm run dev
```

Vite runs on port **5173**, proxying `/api` to port **8080**. No CORS configuration is needed. For a remote database set `DATABASE_URL` to a PostgreSQL **JDBC** URL, plus `DATABASE_USER` and `DATABASE_PASSWORD`. Flyway creates the schema on startup; Hibernate validates it. `PORT` changes the backend listener.

## Build and test

```bash
./scripts/build.sh
java -jar backend/target/toolmavo-1.0.0.jar
```

The frontend must be built before packaging the backend; Maven copies `frontend/dist` into the application JAR.

```bash
cd frontend
npm test                    # six calculation, text, encoding and URL tests
npm run build
# Start backend and frontend before browser tests.
CHROMIUM_PATH=/usr/bin/chromium npx playwright test
# On machines without Chromium, install Playwright Chromium, then set
# CHROMIUM_PATH to its executable (or adjust playwright.config.js).

cd ../backend
mvn test                    # seven API, persistence and validation tests
```

Backend tests use H2's PostgreSQL compatibility mode. Browser integration and API smoke checks also run against real PostgreSQL during development. `TEST_BASE_URL` can point browser tests at the packaged app to test production assets.

## Cloud workspace

Each task already has an isolated checkout; use `/workspace/ToolMavo` directly without a new Git worktree.

```bash
./scripts/cloud-install.sh  # JDK, Maven, proxy-aware dependency setup, tests, build
./scripts/cloud-start.sh    # starts database and packaged app in foreground
```

The cloud installer uses workspace caches because the default home-directory caches are unavailable. Maven uses the platform HTTPS proxy and system Java truststore, retaining TLS verification. Startup defaults are for local development only. Live processes must be restarted after environment restoration. Database volume backups must be managed independently of repository snapshots.

## API

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/health` | Verifies a database query and returns status |
| POST | `/api/contact` | Stores `{name,email,message}`, returns ID and timestamp |
| POST | `/api/invoices` | Stores `{client,email,description,quantity,rate,currency}`, calculates and returns total and receipt |

Currencies: USD, EUR, GBP, PKR. Invoice rates/quantities accept at most two decimal places. Totals are calculated on the server with decimal arithmetic and HALF_UP rounding. Unknown request properties and invalid input receive HTTP 400.

## Before public launch

The website works locally; deployment and domain configuration are not included. Configure HTTPS, production database credentials, backups, retention/deletion procedures, monitoring, and public endpoint abuse protection at your hosting edge. Add reviewed operator/legal details to the privacy and terms pages. Contact requests currently persist in the database without email notifications or an admin inbox. Invoice saves create new immutable receipts rather than editing previous records; print or download the receipt for your records. There are no accounts, payment integrations, tax compliance guarantees, or email delivery claims.

See [mobile screenshot](docs/home-mobile.png) and the original [prototype](design/layout.html).
