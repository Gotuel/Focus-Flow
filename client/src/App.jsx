import { useEffect, useMemo, useState } from 'react';
import { Check, Circle, ListFilter, LoaderCircle, LogOut, Plus, Search, Trash2 } from 'lucide-react';

const categories = ['All', 'Work', 'Personal', 'Learning'];
const priorities = ['low', 'medium', 'high'];
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const apiBaseUrl = configuredApiUrl
  ? (/^https?:\/\//i.test(configuredApiUrl) ? configuredApiUrl : `https://${configuredApiUrl}`).replace(/\/+$/, '')
  : '';

const api = async (path, options) => {
  const response = await fetch(`${apiBaseUrl}/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!response.ok && response.status !== 204) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.message || 'Something went wrong.');
  }
  return response.status === 204 ? null : response.json();
};

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Personal');
  const [priority, setPriority] = useState('medium');
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [todoError, setTodoError] = useState('');

  useEffect(() => {
    let active = true;
    api('/auth/me')
      .then(async ({ user: currentUser }) => {
        if (!active) return;
        setUser(currentUser);
        if (currentUser) {
          setLoading(true);
          const items = await api('/todos');
          if (active) setTodos(items);
        }
      })
      .catch((error) => {
        if (active) setAuthError(error.message);
      })
      .finally(() => {
        if (active) {
          setAuthLoading(false);
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, []);

  const visibleTodos = useMemo(
    () => todos.filter((todo) =>
      (filter === 'All' || todo.category === filter)
      && todo.title.toLowerCase().includes(query.toLowerCase())
    ),
    [todos, filter, query]
  );
  const done = todos.filter((todo) => todo.completed).length;
  const progress = todos.length ? Math.round((done / todos.length) * 100) : 0;

  async function submitAuth(event) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError('');
    try {
      const { user: signedInUser } = await api(`/auth/${authMode === 'register' ? 'register' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      const items = await api('/todos');
      setUser(signedInUser);
      setTodos(items);
      setPassword('');
      setTodoError('');
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    setAuthError('');
    try {
      await api('/auth/logout', { method: 'POST' });
      setUser(null);
      setTodos([]);
      setEmail('');
      setPassword('');
    } catch (error) {
      setAuthError(error.message);
    }
  }

  async function addTodo(event) {
    event.preventDefault();
    if (!title.trim()) return;
    setTodoError('');
    try {
      const todo = await api('/todos', {
        method: 'POST',
        body: JSON.stringify({ title, category, priority })
      });
      setTodos((items) => [todo, ...items]);
      setTitle('');
    } catch (error) {
      setTodoError(error.message);
    }
  }

  async function toggleTodo(todo) {
    setTodoError('');
    try {
      const updated = await api(`/todos/${todo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: !todo.completed })
      });
      setTodos((items) => items.map((item) => item.id === todo.id ? updated : item));
    } catch (error) {
      setTodoError(error.message);
    }
  }

  async function deleteTodo(id) {
    setTodoError('');
    try {
      await api(`/todos/${id}`, { method: 'DELETE' });
      setTodos((items) => items.filter((item) => item.id !== id));
    } catch (error) {
      setTodoError(error.message);
    }
  }

  if (authLoading) {
    return <main className="auth-shell"><div className="empty"><LoaderCircle className="spin" /> Loading FocusFlow…</div></main>;
  }

  if (!user) {
    return <main className="auth-shell">
      <div className="auth-brand"><span className="brand-mark"><Check size={20} strokeWidth={3} /></span><span>FocusFlow</span></div>
      <form className="auth-card" onSubmit={submitAuth}>
        <p className="eyebrow">YOUR PRIVATE SPACE</p>
        <h1>{authMode === 'register' ? 'Create your account' : 'Welcome back'}</h1>
        <p className="auth-description">Your tasks are private and only visible after you sign in.</p>
        {authError && <p className="form-error" role="alert">{authError}</p>}
        <label>Email address
          <input
            type="email"
            autoComplete="email"
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>Password
          <input
            type="password"
            autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
            minLength={authMode === 'register' ? 12 : undefined}
            maxLength={72}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {authMode === 'register' && <p className="password-hint">Use at least 12 characters.</p>}
        <button className="auth-submit" type="submit" disabled={authBusy}>
          {authBusy ? 'Please wait…' : authMode === 'register' ? 'Create account' : 'Sign in'}
        </button>
        <p className="auth-switch">
          {authMode === 'register' ? 'Already have an account?' : 'New to FocusFlow?'}
          {' '}
          <button type="button" onClick={() => {
            setAuthMode(authMode === 'register' ? 'login' : 'register');
            setAuthError('');
          }}>
            {authMode === 'register' ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </form>
    </main>;
  }

  return <main className="app-shell">
    <section className="hero">
      <div className="brand"><span className="brand-mark"><Check size={20} strokeWidth={3} /></span><span>FocusFlow</span></div>
      <div className="account-bar"><span>{user.email}</span><button onClick={signOut}><LogOut size={15} /> Sign out</button></div>
      <div className="hero-copy"><p className="eyebrow">YOUR DAILY SYSTEM</p><h1>Make space for<br /><em>what matters.</em></h1><p>Organize your day, focus on the next right thing, and enjoy the satisfying progress.</p></div>
      <div className="progress-card"><div className="progress-top"><span>Today’s progress</span><strong>{progress}%</strong></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><p>{done} of {todos.length} tasks complete</p></div>
    </section>
    <section className="content">
      {authError && <p className="form-error" role="alert">{authError}</p>}
      <form className="new-task" onSubmit={addTodo}>
        <Circle size={21} /><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs to be done?" aria-label="New task" />
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Category">{categories.slice(1).map((name) => <option key={name}>{name}</option>)}</select>
        <select value={priority} onChange={(event) => setPriority(event.target.value)} aria-label="Priority">{priorities.map((name) => <option key={name} value={name}>{name} priority</option>)}</select>
        <button type="submit"><Plus size={18} /> Add task</button>
      </form>
      {todoError && <p className="form-error" role="alert">{todoError}</p>}
      <div className="toolbar"><div className="filters">{categories.map((item) => <button className={filter === item ? 'active' : ''} key={item} onClick={() => setFilter(item)}>{item}<span>{item === 'All' ? todos.length : todos.filter((todo) => todo.category === item).length}</span></button>)}</div><label className="search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" /></label></div>
      <div className="task-heading"><div><p className="eyebrow">TASKS</p><h2>{filter === 'All' ? 'All tasks' : filter}</h2></div><span>{visibleTodos.filter((todo) => !todo.completed).length} remaining</span></div>
      <div className="task-list">{loading ? <div className="empty"><LoaderCircle className="spin" /> Loading your tasks…</div> : visibleTodos.length ? visibleTodos.map((todo) => <article className={`task ${todo.completed ? 'completed' : ''}`} key={todo.id}><button className="check" onClick={() => toggleTodo(todo)} aria-label={`Mark ${todo.title} as ${todo.completed ? 'incomplete' : 'complete'}`}>{todo.completed && <Check size={14} strokeWidth={3} />}</button><div className="task-text"><h3>{todo.title}</h3><div><span className={`tag ${todo.category.toLowerCase()}`}>{todo.category}</span><span className={`priority ${todo.priority}`}>{todo.priority}</span></div></div><button className="delete" onClick={() => deleteTodo(todo.id)} aria-label={`Delete ${todo.title}`}><Trash2 size={18} /></button></article>) : <div className="empty"><ListFilter size={28} />No tasks found. Add one above!</div>}</div>
    </section>
    <footer>Built with React & Node.js by OTAKAYA Abbé Gotuel <span> . </span> A focused place for your day</footer>
  </main>;
}
