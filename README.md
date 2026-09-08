# FocusFlow

A polished full-stack Todo application built for a portfolio. FocusFlow lets people create, complete, filter, search, and delete tasks through a calm, responsive interface.

## Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Persistence:** a local JSON file (created automatically in `data/todos.json`)
- **Icons:** Lucide React

## Run locally

```bash
npm run install:all
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The API runs on port `3001`.

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
