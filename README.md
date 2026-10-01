# FocusFlow

A polished full-stack Todo application built for a portfolio. FocusFlow lets people create, complete, filter, search, and delete tasks through a calm, responsive interface.

## Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Persistence:** PostgreSQL in production; local JSON fallback for development
- **Icons:** Lucide React

## Run locally

```bash
npm run install:all
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The API runs on port `3001`.

## Deploy on Render

The included [`render.yaml`](./render.yaml) is a Render Blueprint that defines the API, frontend, and PostgreSQL database. In Render, create a new Blueprint from this repository and review the PostgreSQL plan and region before applying it. Select a plan with persistent storage for production; free database plans may have storage or lifetime limits.

The Blueprint connects the API to PostgreSQL using its internal connection URL and configures the static frontend to call the API host. The API creates the `todos` table and starter tasks automatically when it first connects to an empty database. Existing tasks in local `data/todos.json` are not copied to the hosted database; migrate any tasks you want to keep before switching over.

For manual deployments, use the API root directory `server` (build: `npm ci`, start: `npm start`, health check: `/health`) and the frontend root directory `client` (build: `npm ci && npm run build`, publish directory: `dist`). Set `DATABASE_URL` on the API and `VITE_API_URL` on the frontend to the API's public hostname or URL.

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
