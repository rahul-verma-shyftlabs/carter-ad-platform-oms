# Core OMS frontend (extracted from Ad Platform Dashboard)

This Next.js 14 Pages Router app contains only Core OMS:

- Carter CRM
- Kanban Board
- Salesforce / Monday integrations
- Tickets, leads, contacts, opportunities

## Local

```bash
cp .env.example .env.local
yarn install
yarn dev
```

App runs on `http://localhost:3001`.

Standalone boot uses `OMS_DEV_USER_ID` + `OMS_DEV_RMN_TOKEN`, or `/dev/session`.

## Cookieless embed

Parent (Ad Platform Dashboard) loads this app in an iframe and hands off `{ token, userId }` via `postMessage`.

This app never reads `rmn_token` cookies. Session lives in memory.

OAuth (Salesforce / Monday) opens a popup on this origin, then posts tokens back. No `Set-Cookie`.

## Cutover

Dashboard flag: `NEXT_PUBLIC_CORE_OMS_IFRAME_ENABLED=true` plus `NEXT_PUBLIC_OMS_EMBED_URL`.
While the flag is false, dashboard still renders in-app CRM.
