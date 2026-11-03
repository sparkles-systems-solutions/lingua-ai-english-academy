# Cloudflare deployment guide

This repository contains two separate deployables:

- Frontend: the repository root, deployed as a static site.
- Backend: `backend/`, deployed as the Worker `lingua-academy-api`.

Do not deploy the repository root as a Worker with the root directory set to `.` and the command `npx wrangler deploy`. That causes Wrangler to infer a static-assets Worker and is not the API deployment.

## Backend Worker settings

Create a separate Worker in Cloudflare Dashboard:

- Worker name: `lingua-academy-api`
- Repository: `sparkles-systems-solutions/lingua-ai-english-academy`
- Root directory: `/` (repository root)
- Deploy command: `npx wrangler deploy --config backend/wrangler.toml`
- Build command: leave empty

The config file declares the Worker entry point at `backend/src/index.js` (relative to the config) and the existing D1 database binding:

- Binding variable: `DB`
- Database: `lingua-academy-db`

If the dashboard offers a Root directory field that must be set to `backend`, use deploy command `npx wrangler deploy` instead. Do not combine Root directory `backend` with `--config backend/wrangler.toml`.

## Verify after deployment

Open these paths on the Worker URL:

- `/api/v1/health` should return HTTP 200 and identify `lingua-academy-api`.
- `/api/v1/health/database` should return HTTP 200, `database: connected`, and the current application table count.

A 503 response from the database health route means the D1 binding is missing or the database query failed. Do not recreate or delete the existing D1 database.

## Static asset safety

The root static deployment uses `.assetsignore` to exclude backend source, migrations, tests, internal docs, and GitHub workflow files from public static assets. Keep this file in place.

## Operational safety

- Do not store Cloudflare API tokens in this repository.
- Do not enable paid services or D1 read replication for this setup.
- Do not change or delete unrelated D1 databases.
- A successful GitHub UAT run tests the repository's automated checks; it does not prove that the live Worker or D1 binding works.

## Optional GitHub Actions deployment

A manual deployment workflow is available at `.github/workflows/deploy-api.yml`. It deploys only the API Worker and does not deploy the frontend.

Before using it, add these two repository Actions secrets in GitHub:

- `CLOUDFLARE_API_TOKEN`: a Cloudflare API token with the minimum Workers Scripts edit/deploy and D1 binding read permissions required for this Worker.
- `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account ID (not a token).

Never put either value in a source file, commit, issue, or chat message. After adding the secrets, open GitHub Actions, select **Deploy Lingua Academy API**, and run **Run workflow** on `main`.

This workflow is manual-only. It will stop safely with a clear error if either secret is missing. The deployment still needs the existing D1 binding to be present in `backend/wrangler.toml` and the selected Cloudflare account. Check the Worker URL health routes after deployment.
