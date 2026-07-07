# GitHub Pages Demo

## Purpose

This path publishes the current React/Vite dashboard as a shareable static demo on GitHub Pages.

The Pages build intentionally leaves `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY` empty. That keeps the app in local fallback/demo mode and prevents the shared URL from connecting to company backend, Supabase, or real operational data.

## Share URL

Repository: `https://github.com/SSG87-pos/work-dashborad`

Expected Pages URL after deployment:

```text
https://ssg87-pos.github.io/work-dashborad/
```

## Deployment

Workflow file:

```text
.github/workflows/pages-demo.yml
```

The workflow runs when either condition is met:

- push to `codex/company-self-hosted-supabase-refresh`
- manual run from GitHub Actions with `workflow_dispatch`

If GitHub asks for a Pages source, choose `GitHub Actions` in the repository Pages settings.

## Local Verification

Use the project package manager path from `AGENTS.md`:

```bash
/Users/seulgi/Library/pnpm/bin/pnpm run build:pages-demo
```

To preview the built static app locally:

```bash
./node_modules/.bin/vite preview --host 127.0.0.1 --port 4173
```

## Boundaries

- This is a demo-data/static frontend share link.
- Visitor changes are stored only in that visitor's browser localStorage.
- Do not enter real company secrets or operational records in the Pages demo.
- Company runtime should still use a FastAPI/Supabase/PostgreSQL environment with explicit `VITE_API_BASE_URL` or approved backend configuration.
