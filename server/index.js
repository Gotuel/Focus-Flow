import 'dotenv/config';
import bcrypt from 'bcryptjs';
import connectPgSimple from 'connect-pg-simple';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import express from 'express';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import pg from 'pg';

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 3001);
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET;
const sessionCookieSameSite = isProduction ? 'none' : 'lax';
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10_000 })
  : null;
const PgSessionStore = connectPgSimple(session);
const sessionStore = pool
  ? new PgSessionStore({ pool, tableName: 'user_sessions', createTableIfMissing: true })
  : null;

if (!pool) {
  throw new Error('DATABASE_URL is required to start the API.');
}
if (isProduction && !sessionSecret) {
  throw new Error('SESSION_SECRET is required in production.');
}

const starterTodos = [
  { title: 'Welcome to FocusFlow', category: 'Personal', priority: 'medium', completed: false },
  { title: 'Plan this week’s priorities', category: 'Work', priority: 'high', completed: true },
  { title: 'Read for 20 minutes', category: 'Learning', priority: 'low', completed: false }
];
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,
  ...(isProduction ? [] : ['http://localhost:5173'])
].filter(Boolean);

app.set('trust proxy', 1);
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
  credentials: true
}));
app.use(express.json({ limit: '10kb' }));
app.use(session({
  name: 'focusflow.sid',
  secret: sessionSecret || randomUUID(),
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: sessionCookieSameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

app.get('/health', (_req, res) => res.json({ status: 'ok', storage: 'postgres' }));

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

function validateCredentials(input, isRegistration = false) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'A JSON object is required.' };
  }
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Enter a valid email address.' };
  }
  if (typeof input.password !== 'string') {
    return { error: 'A password is required.' };
  }
  const passwordLength = [...input.password].length;
  const passwordBytes = Buffer.byteLength(input.password, 'utf8');
  if (isRegistration && (passwordLength < 12 || passwordBytes > 72)) {
    return { error: 'Use a password of at least 12 characters and no more than 72 bytes.' };
  }
  if (!input.password || passwordBytes > 72) {
    return { error: 'Invalid email or password.' };
  }
  return { email, password: input.password };
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => error ? reject(error) : resolve());
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => error ? reject(error) : resolve());
  });
}

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Please sign in to continue.' });
  }
  next();
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Please try again in 15 minutes.' }
});

app.post('/api/auth/register', authLimiter, asyncHandler(async (req, res) => {
  const { email, password, error } = validateCredentials(req.body, true);
  if (error) return res.status(400).json({ message: error });

  const passwordHash = await bcrypt.hash(password, 12);
  const client = await pool.connect();
  let user;
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email',
      [randomUUID(), email, passwordHash]
    );
    user = result.rows[0];
    for (const todo of starterTodos) {
      await client.query(
        'INSERT INTO todos (id, user_id, title, category, priority, completed) VALUES ($1, $2, $3, $4, $5, $6)',
        [randomUUID(), user.id, todo.title, todo.category, todo.priority, todo.completed]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    throw error;
  } finally {
    client.release();
  }

  await regenerateSession(req);
  req.session.userId = user.id;
  await saveSession(req);
  res.status(201).json({ user: { id: user.id, email: user.email } });
}));

app.post('/api/auth/login', authLimiter, asyncHandler(async (req, res) => {
  const { email, password, error } = validateCredentials(req.body);
  if (error) return res.status(400).json({ message: error });

  const { rows } = await pool.query(
    'SELECT id, email, password_hash FROM users WHERE email = $1',
    [email]
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  await regenerateSession(req);
  req.session.userId = user.id;
  await saveSession(req);
  res.json({ user: { id: user.id, email: user.email } });
}));

app.get('/api/auth/me', asyncHandler(async (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const { rows } = await pool.query(
    'SELECT id, email FROM users WHERE id = $1',
    [req.session.userId]
  );
  if (!rows.length) {
    req.session.userId = null;
    return res.json({ user: null });
  }
  res.json({ user: rows[0] });
}));

app.post('/api/auth/logout', requireAuth, (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie('focusflow.sid', {
      httpOnly: true,
      secure: isProduction,
      sameSite: sessionCookieSameSite
    });
    res.status(204).end();
  });
});

app.get('/api/todos', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, title, category, priority, completed, created_at AS "createdAt" FROM todos WHERE user_id = $1 ORDER BY created_at DESC',
    [req.session.userId]
  );
  res.json(rows);
}));

app.post('/api/todos', requireAuth, asyncHandler(async (req, res) => {
  const { fields, error } = validateTodoFields(req.body);
  if (error) return res.status(400).json({ message: error });
  const { rows } = await pool.query(
    'INSERT INTO todos (id, user_id, title, category, priority, completed) VALUES ($1, $2, $3, $4, $5, FALSE) RETURNING id, title, category, priority, completed, created_at AS "createdAt"',
    [randomUUID(), req.session.userId, fields.title, fields.category, fields.priority]
  );
  res.status(201).json(rows[0]);
}));

app.patch('/api/todos/:id', requireAuth, asyncHandler(async (req, res) => {
  const { fields, error } = validateTodoFields(req.body, true);
  if (error) return res.status(400).json({ message: error });
  const assignments = [];
  const values = [];
  for (const [key, value] of Object.entries(fields)) {
    values.push(value);
    assignments.push(`${key} = $${values.length}`);
  }
  values.push(req.params.id, req.session.userId);
  const { rows } = await pool.query(
    `UPDATE todos SET ${assignments.join(', ')} WHERE id = $${values.length - 1} AND user_id = $${values.length} RETURNING id, title, category, priority, completed, created_at AS "createdAt"`,
    values
  );
  if (!rows.length) return res.status(404).json({ message: 'Todo not found.' });
  res.json(rows[0]);
}));

app.delete('/api/todos/:id', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query(
    'DELETE FROM todos WHERE id = $1 AND user_id = $2',
    [req.params.id, req.session.userId]
  );
  if (!result.rowCount) return res.status(404).json({ message: 'Todo not found.' });
  res.status(204).end();
}));

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
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
  await pool.query(`
    ALTER TABLE todos
    ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS todos_user_created_idx ON todos (user_id, created_at DESC)');
}

app.use((error, _req, res, _next) => {
  console.error('API request failed.', error);
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500 ? error.status : 500;
  res.status(status).json({ message: status === 400 ? 'Invalid JSON request body.' : 'The server could not process the request.' });
});

async function start() {
  await initializeDatabase();
  app.listen(port, () => console.log(`FocusFlow API listening on port ${port}`));
}

start().catch((error) => {
  console.error('Could not initialize the API database.', error);
  process.exit(1);
});
