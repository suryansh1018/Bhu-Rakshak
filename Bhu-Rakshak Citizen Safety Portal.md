# Bhu-Rakshak Citizen Safety Portal

A citizen-first landslide monitoring and incident-response portal for people living in and travelling across Northeast India. **Bhu-Rakshak** combines live rainfall conditions, corridor risk indicators, official bulletins, citizen incident reports, multilingual safety guidance, and an officer workspace in one responsive web application.

> **Safety notice:** This project is an informational decision-support tool. It is not a replacement for official warnings, local authorities, emergency services, or professional geotechnical assessment. In an immediate emergency in India, move away from slopes and call **112**.

## Features

### Citizen portal

- Live monitoring cards for seven Northeast India road corridors
- Risk levels, rainfall totals, forecast lead time, factor-of-safety proxy, and weather context
- Interactive Google Maps view with corridor markers
- India Meteorological Department bulletin ticker
- Corridor-specific WhatsApp sharing
- Multilingual interface and safety assistant content in English, Hindi, Bengali, and Assamese
- `Bhu-Rakshak Saathi` AI assistant with current corridor context
- Browser voice input and text-to-speech support where available
- Incident reporting with optional GPS coordinates and JPEG/PNG/WebP photo upload
- Offline report queue that retries when connectivity returns
- WhatsApp/SMS alert subscription records with consent tracking

### Officer workspace

- Protected `/admin` route with a signed, eight-hour admin session
- Dashboard statistics for reports, users, and sign-ins
- Incident review queue with GPS/photo links and status updates
- AI-assisted incident prioritization and recommended actions
- Sign-in activity audit view
- Admin access through the dedicated password session flow

### Data and transparency

- Server-side Open-Meteo weather and rainfall fetching
- IMD CAP RSS bulletin ingestion
- Transparent corridor risk scoring and factor-of-safety proxy
- Risk snapshot persistence for monitoring history
- Sentinel-1/InSAR integration marked as connector-ready until an approved provider is configured

## Technology stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui, Framer Motion
- **Backend:** Node.js, Express, tRPC 11
- **Database:** MySQL-compatible database with Drizzle ORM and Drizzle Kit
- **Authentication:** Manus OAuth plus a protected admin password session
- **Maps:** Google Maps through the configured map proxy integration
- **AI and media:** Manus built-in LLM, storage, and voice-transcription integrations
- **Testing:** Vitest and TypeScript strict checking

## Project structure

```text
client/
  src/
    components/        Shared UI, maps, assistant, and dashboard components
    pages/Home.tsx     Public citizen portal
    pages/Admin.tsx    Officer workspace
    App.tsx            Client routes and providers
    index.css          Global theme and utility styles
server/
  _core/               Runtime integrations and platform plumbing
  routers.ts           Typed tRPC procedures
  db.ts                Database helpers
  liveData.ts          Weather, rainfall, and bulletin integrations
  adminAuth.ts         Signed admin session implementation
drizzle/
  schema.ts            MySQL schema
  *.sql                Generated migrations
docs/
  live-data-sources.md External data sources and integration notes
shared/
  types.ts             Shared application types
```

## Requirements

- Node.js **20 or newer**
- pnpm **10 or newer**
- MySQL-compatible database (MySQL or TiDB recommended)
- A configured Manus runtime or equivalent credentials for OAuth, LLM, storage, and map proxy features
- A Google Maps-capable project for map display

## Installation

1. Clone the repository and enter the project directory:

   ```bash
   git clone <your-repository-url>
   cd copy-of-bhu-rakshak-citizen-safety-portal
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Create a local `.env` file using the variable block in [`docs/environment.example.md`](./docs/environment.example.md):

   ```bash
   touch .env
   ```

4. Fill in the values in `.env`. Never commit `.env` or production secrets.

5. Generate and apply the database migrations:

   ```bash
   pnpm db:push
   ```

6. Start the development server:

   ```bash
   pnpm dev
   ```

   The application is served at `http://localhost:3000` by default. Set `PORT` to use another port.

## Environment variables

The complete public variable reference is in [`docs/environment.example.md`](./docs/environment.example.md). The most important variables are:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes for persistence | MySQL/TiDB connection string |
| `JWT_SECRET` | Yes in production | Session-cookie signing secret |
| `ADMIN_DASHBOARD_PASSWORD` | Yes for officer access | Password for `/admin` password login |
| `VITE_APP_ID` | Yes with Manus OAuth | OAuth application ID exposed to the client |
| `VITE_OAUTH_PORTAL_URL` | Yes with Manus OAuth | OAuth login portal URL |
| `OAUTH_SERVER_URL` | Yes with Manus OAuth | OAuth server base URL |
| `OWNER_OPEN_ID` | Recommended | Owner account automatically treated as an admin by the user upsert flow |
| `BUILT_IN_FORGE_API_URL` | Yes for AI, maps, storage | Manus built-in API base URL |
| `BUILT_IN_FORGE_API_KEY` | Yes for AI, maps, storage | Server-side Manus built-in API key |
| `VITE_FRONTEND_FORGE_API_URL` | Yes for browser maps | Frontend map proxy URL |
| `VITE_FRONTEND_FORGE_API_KEY` | Yes for browser maps | Frontend map proxy key |
| `PORT` | No | HTTP port; defaults to `3000` |
| `NODE_ENV` | No | `development` or `production` |

Analytics placeholders in `client/index.html` can be configured with `VITE_ANALYTICS_ENDPOINT` and `VITE_ANALYTICS_WEBSITE_ID` if an Umami-compatible analytics service is desired.

## Development commands

```bash
pnpm dev       # Start the watch-mode development server
pnpm check     # Run TypeScript without emitting files
pnpm test      # Run the Vitest suite once
pnpm build     # Build the browser bundle and production server
pnpm start     # Start the production build
pnpm format    # Format source files with Prettier
pnpm db:push   # Generate and apply Drizzle migrations
```

Run the standard verification cycle before opening a pull request:

```bash
pnpm check && pnpm test && pnpm build
```

## Authentication and admin access

The public portal is available without signing in. OAuth sessions are handled by the Manus runtime. The officer workspace is available at `/admin` after the server validates the configured `ADMIN_DASHBOARD_PASSWORD` and sets the signed `bhu_admin_session` cookie.

For a production deployment:

- Use a long, unique admin password managed by a secret manager.
- Set a cryptographically random `JWT_SECRET`.
- Serve the application over HTTPS so secure cookies work correctly.
- Restrict access to production logs and database credentials.
- Replace or remove any default OAuth application settings before publishing.

## Data sources and limitations

The live monitor currently uses:

- [Open-Meteo forecast API](https://api.open-meteo.com/v1/forecast) for weather and rainfall data
- [IMD CAP RSS](https://cap-sources.s3.amazonaws.com/in-imd-en/rss.xml) for public bulletins
- Google Maps through the configured Manus map proxy

See [`docs/live-data-sources.md`](./docs/live-data-sources.md) for the full data-source and provider-readiness notes. Automated outbound SMS/WhatsApp delivery is not enabled by default; the project stores subscriptions and provides WhatsApp click-to-chat sharing. A verified provider such as Meta WhatsApp Cloud API or Twilio must be configured before server-initiated delivery is added.

## Database

The schema is defined in [`drizzle/schema.ts`](./drizzle/schema.ts). The current tables cover:

- Users and roles
- OAuth sign-in audit events
- Alert subscriptions
- Citizen incident reports and uploaded-image references
- Risk snapshots

Generated SQL migrations are kept in [`drizzle/`](./drizzle/). Do not edit generated migrations after they have been applied to a shared database; create a new migration for subsequent schema changes.

## Deployment checklist

1. Provision a MySQL-compatible database.
2. Configure all required environment variables in the hosting platform.
3. Run `pnpm install --frozen-lockfile`.
4. Run `pnpm db:push` as part of the controlled release process.
5. Run `pnpm build`.
6. Start with `pnpm start`.
7. Configure HTTPS, the OAuth callback URL, and any Google Maps/API restrictions.
8. Confirm `/`, `/admin`, live data, incident submission, AI assistant behavior, and admin logout in the deployed environment.

The application is a single Node.js web process. It should not depend on a local filesystem for durable uploads or background workers; use the configured storage provider and an external scheduler/queue for future outbound notification workflows.

## Contributing

1. Create a feature branch.
2. Keep secrets and `.env` files out of Git.
3. Make focused changes and add or update Vitest coverage for server behavior.
4. Run `pnpm check && pnpm test && pnpm build`.
5. Open a pull request with a concise summary, verification results, and screenshots for UI changes.

## License

This project is released under the [MIT License](./LICENSE).
