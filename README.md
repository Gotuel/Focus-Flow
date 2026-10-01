# FocusFlow

A polished full-stack Todo application built for a portfolio. FocusFlow lets people create, complete, filter, search, and delete tasks through a calm, responsive interface.

## Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Persistence:** PostgreSQL
- **Icons:** Lucide React

## Run locally

```bash
npm run install:all
npm run dev
```

Before starting the app, create a free PostgreSQL project on [Neon](https://neon.com/) and copy `server/.env.example` to `server/.env`. Set `DATABASE_URL` to your Neon connection string and `SESSION_SECRET` to a long random value. Keep `server/.env` private; it is ignored by Git.

Open [http://localhost:5173](http://localhost:5173). The API runs on port `3001`.

## Deploy on Render

The included [`render.yaml`](./render.yaml) is a Render Blueprint for a free Render web service (API) and static site (frontend). The app uses a free Neon PostgreSQL database; no paid plan is required.

Create a free PostgreSQL project on [Neon](https://neon.com/), then set `DATABASE_URL` on the Render API service to its pooled connection string. Set `SESSION_SECRET` to a long random value and `FRONTEND_ORIGIN` to the deployed frontend's exact HTTPS origin. The Blueprint includes the frontend/API host link and security configuration. The API creates its account, session, and task tables automatically. Existing tasks in local `data/todos.json` and previously shared online tasks are not assigned to any account and remain private from registered users.

Users register with an email and a password of at least 12 characters. Their task lists are stored separately in PostgreSQL. Free Render web services sleep after 15 minutes without traffic and can take about a minute to wake up. For manual deployments, use the API root directory `server` (plan: Free, build: `npm ci`, start: `npm start`, health check: `/health`) and the frontend root directory `client` (build: `npm ci && npm run build`, publish directory: `dist`). Set `DATABASE_URL`, `SESSION_SECRET`, and `FRONTEND_ORIGIN` on the API; set `VITE_API_URL` on the frontend to the API's public hostname or URL.

## Features

- Create a task with a category and priority
- Mark tasks complete or incomplete
- Filter by category and search by title
- Delete tasks
- Live daily-progress indicator
- Responsive layout

## Structure

```
client/     # React interface
server/     # Express REST API
data/       # Local task data, generated at first launch
```
