# Environment variable reference

Copy the block below into a local `.env` file and replace placeholder values. The `.env` file is ignored by Git and must never be committed.

```dotenv
# Runtime
NODE_ENV=development
PORT=3000

# Database (MySQL or TiDB)
DATABASE_URL=mysql://user:password@localhost:3306/bhu_rakshak

# Session and officer access
JWT_SECRET=replace-with-a-long-random-session-secret
ADMIN_DASHBOARD_PASSWORD=replace-with-a-strong-admin-password

# Manus OAuth
VITE_APP_ID=your-manus-oauth-app-id
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im
OAUTH_SERVER_URL=https://api.manus.im
OWNER_OPEN_ID=your-owner-open-id

# Manus built-in APIs (server-side: LLM, storage, maps, voice, data API)
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=replace-with-server-side-api-key

# Manus map proxy (browser-visible values; use restricted credentials)
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=replace-with-frontend-map-key

# Optional Umami-compatible analytics placeholders referenced by client/index.html
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=
```

For production, use the hosting provider's secret manager instead of committing a file. Generate a random `JWT_SECRET`, use a unique `ADMIN_DASHBOARD_PASSWORD`, and restrict any browser-visible map key by origin and API scope.
