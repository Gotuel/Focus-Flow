# FocusFlow

A polished full-stack Todo application built for a portfolio. FocusFlow lets people create, complete, filter, search, and delete tasks through a calm, responsive interface.

## Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Persistence:** local JSON file; ephemeral on Render's free web service
- **Icons:** Lucide React

## Run locally

```bash
npm run install:all
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The API runs on port `3001`.

## Deploy on Render

The included [`render.yaml`](./render.yaml) is a Render Blueprint for a free Render web service (API) and static site (frontend). No database or payment method is required.

Create a Blueprint in Render from this repository. The Blueprint configures the frontend to call the API host. The API stores tasks in a local JSON file and initializes starter tasks if the file is missing. Render's free web service has an ephemeral filesystem, so tasks can be lost whenever the service restarts, redeploys, or spins down. Existing tasks in local `data/todos.json` are not copied to the hosted service.

Free Render web services sleep after 15 minutes without traffic and can take about a minute to wake up. For manual deployments, use the API root directory `server` (plan: Free, build: `npm ci`, start: `npm start`, health check: `/health`) and the frontend root directory `client` (build: `npm ci && npm run build`, publish directory: `dist`). Set `VITE_API_URL` on the frontend to the API's public hostname or URL.

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
