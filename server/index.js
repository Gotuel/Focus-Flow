import cors from 'cors';
import { randomUUID } from 'node:crypto';
import express from 'express';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const app = express();
const port = process.env.PORT || 3001;
const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const dataDir = process.env.DATA_DIR || join(root, 'data');
const dataFile = join(dataDir, 'todos.json');
const { Pool } = pg;
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;

app.use(cors());
app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', storage: pool ? 'postgres' : 'json' }));

const starterTodos = [
  { id: '1', title: 'Welcome to FocusFlow', category: 'Personal', priority: 'medium', completed: false, createdAt: new Date().toISOString() },
  { id: '2', title: 'Plan this week’s priorities', category: 'Work', priority: 'high', completed: true, createdAt: new Date().toISOString() },
  { id: '3', title: 'Read for 20 minutes', category: 'Learning', priority: 'low', completed: false, createdAt: new Date().toISOString() }
];

const toTodo = (row) => ({
  id: row.id,
  title: row.title,
  category: row.category,
  priority: row.priority,
  completed: row.completed,
  createdAt: row.created_at
});

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

function validateTodoFields(input, partial = false) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'A JSON object is required.' };
  }

  const fields = {};
  if (!partial || Object.hasOwn(input, 'title')) {
    if (typeof input.title !== 'string' || !input.title.trim()) {
      return { error: 'A title is required.' };
    }
    fields.title = input.title.trim();
  }
  if (Object.hasOwn(input, 'category') || !partial) {
    const category = input.category ?? 'Personal';
    if (!['Work', 'Personal', 'Learning'].includes(category)) {
      return { error: 'Category must be Work, Personal, or Learning.' };
    }
    fields.category = category;
  }
  if (Object.hasOwn(input, 'priority') || !partial) {
    const priority = input.priority ?? 'medium';
    if (!['low', 'medium', 'high'].includes(priority)) {
      return { error: 'Priority must be low, medium, or high.' };
    }
    fields.priority = priority;
  }
  if (partial && Object.hasOwn(input, 'completed')) {
    if (typeof input.completed !== 'boolean') {
      return { error: 'Completed must be a boolean.' };
    }
    fields.completed = input.completed;
  }
  if (partial && Object.keys(fields).length === 0) {
    return { error: 'No supported fields to update.' };
  }
  return { fields };
}

async function initializeDatabase() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  const { rows: [{ count }] } = await pool.query('SELECT COUNT(*)::int AS count FROM todos');
  if (count === 0) {
    for (const todo of starterTodos) {
      await pool.query(
        'INSERT INTO todos (id, title, category, priority, completed, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
        [todo.id, todo.title, todo.category, todo.priority, todo.completed, todo.createdAt]
      );
    }
  }
}

async function readTodos() {
  if (pool) {
    const { rows } = await pool.query('SELECT * FROM todos ORDER BY created_at DESC');
    return rows.map(toTodo);
  }
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(dataFile)) {
    await writeFile(dataFile, JSON.stringify(starterTodos, null, 2));
    return starterTodos;
  }
  return JSON.parse(await readFile(dataFile, 'utf8'));
}

const saveTodos = (todos) => writeFile(dataFile, JSON.stringify(todos, null, 2));

app.get('/api/todos', asyncHandler(async (_req, res) => res.json(await readTodos())));

app.post('/api/todos', asyncHandler(async (req, res) => {
  const { fields, error } = validateTodoFields(req.body);
  if (error) return res.status(400).json({ message: error });
  const todo = { id: randomUUID(), ...fields, completed: false, createdAt: new Date().toISOString() };
  if (pool) {
    const { rows } = await pool.query(
      'INSERT INTO todos (id, title, category, priority, completed, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [todo.id, todo.title, todo.category, todo.priority, todo.completed, todo.createdAt]
    );
    return res.status(201).json(toTodo(rows[0]));
  }
  const todos = await readTodos();
  todos.unshift(todo);
  await saveTodos(todos);
  res.status(201).json(todo);
}));

app.patch('/api/todos/:id', asyncHandler(async (req, res) => {
  const { fields, error } = validateTodoFields(req.body, true);
  if (error) return res.status(400).json({ message: error });
  if (pool) {
    const values = [];
    const assignments = [];
    for (const [key, value] of Object.entries(fields)) {
      values.push(value);
      assignments.push(`${key} = $${values.length}`);
    }
    values.push(req.params.id);
    const { rows } = await pool.query(`UPDATE todos SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
    if (!rows.length) return res.status(404).json({ message: 'Todo not found.' });
    return res.json(toTodo(rows[0]));
  }
  const todos = await readTodos();
  const index = todos.findIndex((todo) => todo.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Todo not found.' });
  todos[index] = { ...todos[index], ...fields, id: todos[index].id };
  await saveTodos(todos);
  res.json(todos[index]);
}));

app.delete('/api/todos/:id', asyncHandler(async (req, res) => {
  if (pool) {
    const result = await pool.query('DELETE FROM todos WHERE id = $1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ message: 'Todo not found.' });
    return res.status(204).end();
  }
  const todos = await readTodos();
  const nextTodos = todos.filter((todo) => todo.id !== req.params.id);
  if (nextTodos.length === todos.length) return res.status(404).json({ message: 'Todo not found.' });
  await saveTodos(nextTodos);
  res.status(204).end();
}));

app.use((error, _req, res, _next) => {
  console.error('API request failed.', error);
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500 ? error.status : 500;
  res.status(status).json({ message: status === 400 ? 'Invalid JSON request body.' : 'The server could not process the request.' });
});

async function start() {
  try {
    await initializeDatabase();
    app.listen(port, () => console.log(`FocusFlow API listening on http://localhost:${port}`));
  } catch (error) {
    console.error('Could not initialize the database.', error);
    process.exit(1);
  }
}

start();
