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

The included [`render.yaml`](./render.yaml) is a Render Blueprint for a free Render web service (API) and static site (frontend). For persistent PostgreSQL storage without a paid plan, create a free project on [Neon](https://neon.com/) first; its Free plan requires no credit card. Copy the PostgreSQL connection string with SSL enabled (`sslmode=require`).

Then create a Blueprint in Render from this repository and provide the Neon connection string when prompted for `DATABASE_URL`. The Blueprint configures the frontend to call the API host. The API creates the `todos` table and starter tasks automatically when it first connects to an empty database. Existing tasks in local `data/todos.json` are not copied to the hosted database; migrate any tasks you want to keep before switching over.

Free Render web services sleep after 15 minutes without traffic and can take about a minute to wake up. Neon Free has usage and storage limits; check its current plan terms. Neither provider requires a paid plan for this setup. For manual deployments, use the API root directory `server` (plan: Free, build: `npm ci`, start: `npm start`, health check: `/health`) and the frontend root directory `client` (build: `npm ci && npm run build`, publish directory: `dist`). Set `DATABASE_URL` on the API to the Neon connection string and `VITE_API_URL` on the frontend to the API's public hostname or URL.

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
