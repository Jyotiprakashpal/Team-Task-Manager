# Railway Deployment Guide

This project is ready for Railway as a single full-stack service. Express serves both the REST API and the built React frontend.

## Required Railway Setup

1. Push the project to GitHub.
2. In Railway, create a new project from the GitHub repository.
3. Add a volume mounted at `/data`.
4. Add environment variables:

```text
DATABASE_URL=file:/data/dev.db
JWT_SECRET=<use-a-long-random-secret>
NODE_ENV=production
```

Do not set `VITE_API_URL` on Railway unless you want to point the frontend to a separate API service. When omitted, the frontend uses `/api`, which is correct for this single-service deployment.

## Railway Commands

Railway reads these files automatically:

- `railway.json`
- `nixpacks.toml`

Build command:

```bash
npm run build
```

Start command:

```bash
npm run start:railway
```

The start command runs `npm run db:push` first, then starts Express. This is intentional because the Railway volume is available at runtime.

## Verify Live Deployment

After deployment, open:

```text
https://your-railway-domain.up.railway.app/api/health
```

Expected response:

```json
{ "ok": true, "name": "Team Task Manager API" }
```

Then open the Railway app URL in a browser and sign up for a new account.

## Submission Items

- Live URL: Railway public domain
- GitHub repo: pushed repository URL
- README: included
- Demo video: record signup, project creation, member add, task assignment, status change, and dashboard
