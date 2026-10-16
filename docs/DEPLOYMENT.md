# Free hosting for testing

## Render: entire website, API and database

`render.yaml` defines a Docker web service and a PostgreSQL database using free plans. The Spring Boot service serves the built Vue frontend, so no separate frontend hosting or CORS setup is required.

1. Make this source available in your GitHub repository/branch.
2. Sign in to Render and choose **New → Blueprint**.
3. Connect `alamgirHyder/ToolMavo`, select the branch containing this implementation, and use `render.yaml`.
4. Confirm both resources show **Free** before creating them. Do not choose a paid plan to proceed.
5. Wait for the build and database migration to complete. Open the service's generated HTTPS URL and check `/api/health` returns `UP`.
6. Test an image conversion, a PDF operation, invoice saving and the contact form.

Free Render services can sleep when idle. The initial request after sleeping can take time. Free database availability, expiration and retention depend on Render's current offer; inspect the dashboard's expiry date and limits before relying on it. This is a test deployment, not permanent database hosting. No cloud deployment has been verified until a URL has been created and checked.

## Netlify: frontend plus an external backend

Netlify cannot run the Spring Boot Java server or PostgreSQL database. Deploy the full application to Render first (or another Java Docker host with PostgreSQL), then:

1. Import the repository/implementation branch into Netlify.
2. The root `netlify.toml` configures the frontend build and publish directory.
3. Set `BACKEND_URL` to the HTTPS **origin** of the deployed Spring Boot service, such as `https://your-service.onrender.com` (no path).
4. Deploy. The build generates a same-origin `/api/*` proxy to that backend.
5. Test invoice saving and the contact form on the Netlify URL.

The Netlify build intentionally fails if no backend URL is supplied. Never put database passwords or hosting tokens in `BACKEND_URL`, frontend variables or committed files. The database credentials remain on the backend host.

Actual publication requires a hosting account connection. This workspace has no connected Netlify or Render credentials. Account credentials must be supplied through a secure hosting integration, never in chat.
