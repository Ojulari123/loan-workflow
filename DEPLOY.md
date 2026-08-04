# Deploying the Loan Workflow app

This guide leads with a **100% free, no-credit-card** hosting stack. A paid single-provider
alternative (Railway) is noted at the very bottom for anyone who wants it later.

---

## Overview

The repo has three pieces to host:

- **frontend/** — React + Vite single-page app (static build).
- **backend/** — Spring Boot API (raw JDBC to MySQL), packaged with `backend/Dockerfile`.
- **MySQL** — the database the backend talks to.

### Free stack (no credit card required)

| Piece    | Host                          | Notes |
|----------|-------------------------------|-------|
| Frontend | **Vercel** (free)             | Static Vite build. |
| Backend  | **Render** free Web Service   | Builds from `backend/Dockerfile`. Free tier **cold-starts**: sleeps after ~15 min idle, first request wakes it in ~30–60s. |
| MySQL    | **TiDB Cloud Serverless** (free) | MySQL-compatible, TLS-only, listens on port **4000**. **Aiven free MySQL** works the same way as an alternative. |

**Local dev needs zero configuration.** Every env var falls back to the current local
defaults, so `./gradlew bootRun` and `npm run dev` keep working with nothing set. See
[Local development](#local-development) at the bottom.

---

## Step 1 — Free MySQL (TiDB Cloud Serverless)

1. **Create a free cluster.** Sign up at TiDB Cloud and create a **Serverless** cluster
   (free tier, no card). Pick a region near your Render region.
2. **Grab the connection details** from the cluster's **Connect** panel: `host`, `port`,
   `user`, `password`, and `database` (create a database if the console asks you to).
3. **TiDB requires TLS and uses port `4000`.** Set the backend's **`DB_URL`** to the full
   JDBC string TiDB gives you — copy it verbatim and keep its SSL parameter. It looks like:
   ```
   jdbc:mysql://<host>:4000/<database>?sslMode=VERIFY_IDENTITY
   ```
   Because `DB_URL` **takes precedence** in `DBConfig.java`, setting it means you do **not**
   set `DB_HOST` / `DB_PORT` / `DB_NAME`. You still set `DB_USER` and `DB_PASSWORD`
   separately (Step 2).
4. **Load the schema (one-time).** Run the contents of
   `backend/src/main/resources/tables.sql` in TiDB's built-in **SQL console** (paste and
   run), or from a local `mysql` client pointed at the TiDB host. From a client, TiDB's
   TLS means you must include SSL flags, e.g.:
   ```bash
   mysql -h <host> -P 4000 -u <user> -p --ssl-mode=VERIFY_IDENTITY \
     <database> < backend/src/main/resources/tables.sql
   ```
5. **(Optional) Seed demo data.** `backend/seed_demo.sh` seeds through the running REST API
   and also talks to MySQL directly:
   ```bash
   backend/seed_demo.sh <backend-url> <host> 4000 <database> <user> <password>
   #                     API_BASE     DB_HOST DB_PORT DB_NAME  DB_USER DB_PASS
   ```
   Requires `bash`, `curl`, `jq`, `mysql`. Note: the script's `mysql` calls do not pass
   TLS flags, so against TiDB you may need to add SSL options (or run it against a MySQL
   host that allows plain connections). The backend must be deployed and healthy first.

> **Aiven free MySQL (alternative).** Create a free Aiven MySQL service, copy its host /
> port / database / user / password, and set the same **`DB_URL`** JDBC string (Aiven is
> also TLS-only). Everything else in this guide is identical.

---

## Step 2 — Backend on Render

1. In Render, **New → Web Service** and **connect the GitHub repo `Ojulari123/loan-workflow`**.
2. **Root Directory:** `backend` (so the build context and `backend/Dockerfile` are used).
3. **Runtime / Environment:** **Docker** — Render builds the multi-stage Dockerfile
   (Gradle 9.2.1 / JDK 17 → JRE 17, runs the bootJar).
4. **Environment variables:**

   | Variable            | Value |
   |---------------------|-------|
   | `DB_URL`            | The TiDB JDBC string from Step 1.3 (`jdbc:mysql://<host>:4000/<database>?sslMode=VERIFY_IDENTITY`). |
   | `DB_USER`           | TiDB user. |
   | `DB_PASSWORD`       | TiDB password. |
   | `ANTHROPIC_API_KEY` | Your Anthropic key (AI underwriter / copilot). |
   | `CORS_ORIGINS`      | The Vercel URL — fill in **after Step 3**, then redeploy (Step 4). |

   Do **not** set `PORT`. Render injects it and the app already honors it
   (`server.port=${PORT:8080}`).
5. **Deploy**, then copy the public URL, e.g. `https://<name>.onrender.com`. You'll give
   this to Vercel.

> **Cold start.** On the free tier the service sleeps after ~15 min idle; the next request
> takes ~30–60s to wake it. This is expected, not a bug.

---

## Step 3 — Frontend on Vercel

1. **Import the repo** into Vercel (**Add New… → Project**).
2. **Root Directory:** `frontend`.
3. **Framework:** Vite (auto-detected; confirm).
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **Environment variable:** `VITE_API_BASE` = the Render backend URL from Step 2.5
   (e.g. `https://<name>.onrender.com`).
5. **Deploy**, then copy the Vercel URL, e.g. `https://<app>.vercel.app`.

---

## Step 4 — Wire them together

1. On **Render** (backend), set `CORS_ORIGINS` = the Vercel URL from Step 3.5
   (`https://<app>.vercel.app`) and **redeploy** the backend so the change takes effect.
   Multiple origins are comma-separated, e.g. to add a preview domain:
   ```
   CORS_ORIGINS=https://<app>.vercel.app,https://<preview>.vercel.app
   ```
2. On **Vercel** (frontend), confirm `VITE_API_BASE` points at the Render URL. Changing a
   Vercel env var requires a redeploy to take effect.
3. **Test the live site.** Open the Vercel URL. The first API call may be slow while Render
   wakes from cold start (Step 2 note), then it should behave normally.

---

## Environment variable reference

| Variable            | Default (local)         | Where to set in prod | Purpose |
|---------------------|-------------------------|----------------------|---------|
| `DB_URL`            | *(unset)*               | Render               | Full JDBC URL. **Takes precedence** over `DB_HOST`/`DB_PORT`/`DB_NAME` when set. Use the TiDB string. |
| `DB_HOST`           | `localhost`             | Render (only if not using `DB_URL`) | Host used to build the JDBC URL when `DB_URL` is unset. |
| `DB_PORT`           | `3307`                  | Render (only if not using `DB_URL`) | " |
| `DB_NAME`           | `loan_app_db`           | Render (only if not using `DB_URL`) | " |
| `DB_USER`           | `admin`                 | Render               | DB username. |
| `DB_PASSWORD`       | `admin123`              | Render               | DB password. |
| `CORS_ORIGINS`      | `http://localhost:5173` | Render               | Comma-separated allowed origins for `/api/**`. Set to the Vercel URL. |
| `ANTHROPIC_API_KEY` | *(from `backend/.env` locally, git-ignored)* | Render | AI underwriter / copilot key. |
| `PORT`              | `8080`                  | *(injected by Render — do not set)* | App binds to it (`server.port=${PORT:8080}`). |
| `VITE_API_BASE`     | `http://localhost:8080` | Vercel               | Base URL of the backend API. Set to the Render URL. |

When using TiDB via `DB_URL`, you set `DB_URL` + `DB_USER` + `DB_PASSWORD` and leave the
`DB_HOST` / `DB_PORT` / `DB_NAME` trio unset.

---

## Local development

Nothing changes. Every env var defaults to the current local values, so no local config is
needed:

- **Backend:** with nothing set, DB resolves to `jdbc:mysql://localhost:3307/loan_app_db`,
  user `admin` / `admin123`, CORS allows `http://localhost:5173`, and the server binds
  `8080`. `ANTHROPIC_API_KEY` is read from `backend/.env` (git-ignored).
  ```bash
  cd backend && ./gradlew bootRun
  ```
- **Frontend:** `VITE_API_BASE` defaults to `http://localhost:8080`.
  ```bash
  cd frontend && npm install && npm run dev   # http://localhost:5173
  ```

---

## Paid alternative (optional)

If you'd rather not manage two providers or deal with Render's cold start, **Railway** can
host the backend **and** a managed MySQL together in one project (no cold start), for a
paid/usage-based cost. You'd map Railway's MySQL variables into `DB_HOST` / `DB_PORT` /
`DB_NAME` / `DB_USER` / `DB_PASSWORD` (or a single `DB_URL` JDBC string), set
`ANTHROPIC_API_KEY` and `CORS_ORIGINS`, and let Railway inject `PORT`. The frontend still
goes on Vercel with `VITE_API_BASE` pointed at the Railway backend URL.
