import cors from 'cors';
import express from 'express';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = process.env.PORT || 3001;
const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const dataDir = join(root, 'data');
const dataFile = join(dataDir, 'todos.json');

app.use(cors());
app.use(express.json());

const starterTodos = [
  { id: '1', title: 'Welcome to FocusFlow', category: 'Personal', priority: 'medium', completed: false, createdAt: new Date().toISOString() },
  { id: '2', title: 'Plan this week’s priorities', category: 'Work', priority: 'high', completed: true, createdAt: new Date().toISOString() },
  { id: '3', title: 'Read for 20 minutes', category: 'Learning', priority: 'low', completed: false, createdAt: new Date().toISOString() }
];

async function readTodos() {
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(dataFile)) {
    await writeFile(dataFile, JSON.stringify(starterTodos, null, 2));
    return starterTodos;
  }
  return JSON.parse(await readFile(dataFile, 'utf8'));
}

const saveTodos = (todos) => writeFile(dataFile, JSON.stringify(todos, null, 2));

app.get('/api/todos', async (_req, res) => res.json(await readTodos()));

app.post('/api/todos', async (req, res) => {
  const { title, category = 'Personal', priority = 'medium' } = req.body;
  if (!title?.trim()) return res.status(400).json({ message: 'A title is required.' });
  const todos = await readTodos();
  const todo = { id: crypto.randomUUID(), title: title.trim(), category, priority, completed: false, createdAt: new Date().toISOString() };
  todos.unshift(todo);
  await saveTodos(todos);
  res.status(201).json(todo);
});

app.patch('/api/todos/:id', async (req, res) => {
  const todos = await readTodos();
  const index = todos.findIndex((todo) => todo.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Todo not found.' });
  todos[index] = { ...todos[index], ...req.body, id: todos[index].id };
  await saveTodos(todos);
  res.json(todos[index]);
});

app.delete('/api/todos/:id', async (req, res) => {
  const todos = await readTodos();
  const nextTodos = todos.filter((todo) => todo.id !== req.params.id);
  if (nextTodos.length === todos.length) return res.status(404).json({ message: 'Todo not found.' });
  await saveTodos(nextTodos);
  res.status(204).end();
});

app.listen(port, () => console.log(`FocusFlow API listening on http://localhost:${port}`));
