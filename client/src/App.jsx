import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Circle, ListFilter, LoaderCircle, Plus, Search, Trash2 } from 'lucide-react';

const categories = ['All', 'Work', 'Personal', 'Learning'];
const priorities = ['low', 'medium', 'high'];

const api = async (path, options) => {
  const response = await fetch(`/api${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!response.ok && response.status !== 204) throw new Error('Something went wrong.');
  return response.status === 204 ? null : response.json();
};

export default function App() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Personal');
  const [priority, setPriority] = useState('medium');
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');

  useEffect(() => { api('/todos').then(setTodos).catch(console.error).finally(() => setLoading(false)); }, []);
  const visibleTodos = useMemo(() => todos.filter((todo) => (filter === 'All' || todo.category === filter) && todo.title.toLowerCase().includes(query.toLowerCase())), [todos, filter, query]);
  const done = todos.filter((todo) => todo.completed).length;
  const progress = todos.length ? Math.round((done / todos.length) * 100) : 0;

  async function addTodo(event) {
    event.preventDefault();
    if (!title.trim()) return;
    const todo = await api('/todos', { method: 'POST', body: JSON.stringify({ title, category, priority }) });
    setTodos((items) => [todo, ...items]); setTitle('');
  }
  async function toggleTodo(todo) {
    const updated = await api(`/todos/${todo.id}`, { method: 'PATCH', body: JSON.stringify({ completed: !todo.completed }) });
    setTodos((items) => items.map((item) => item.id === todo.id ? updated : item));
  }
  async function deleteTodo(id) {
    await api(`/todos/${id}`, { method: 'DELETE' });
    setTodos((items) => items.filter((item) => item.id !== id));
  }

  return <main className="app-shell">
    <section className="hero">
      <div className="brand"><span className="brand-mark"><Check size={20} strokeWidth={3} /></span><span>FocusFlow</span></div>
      <div className="hero-copy"><p className="eyebrow">YOUR DAILY SYSTEM</p><h1>Make space for<br /><em>what matters.</em></h1><p>Organize your day, focus on the next right thing, and enjoy the satisfying progress.</p></div>
      <div className="progress-card"><div className="progress-top"><span>Today’s progress</span><strong>{progress}%</strong></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><p>{done} of {todos.length} tasks complete</p></div>
    </section>
    <section className="content">
      <form className="new-task" onSubmit={addTodo}>
        <Circle size={21} /><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" aria-label="New task" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">{categories.slice(1).map((name) => <option key={name}>{name}</option>)}</select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority">{priorities.map((name) => <option key={name} value={name}>{name} priority</option>)}</select>
        <button type="submit"><Plus size={18} /> Add task</button>
      </form>
      <div className="toolbar"><div className="filters">{categories.map((item) => <button className={filter === item ? 'active' : ''} key={item} onClick={() => setFilter(item)}>{item}<span>{item === 'All' ? todos.length : todos.filter(t => t.category === item).length}</span></button>)}</div><label className="search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tasks" /></label></div>
      <div className="task-heading"><div><p className="eyebrow">TASKS</p><h2>{filter === 'All' ? 'All tasks' : filter}</h2></div><span>{visibleTodos.filter(t => !t.completed).length} remaining</span></div>
      <div className="task-list">{loading ? <div className="empty"><LoaderCircle className="spin" /> Loading your tasks…</div> : visibleTodos.length ? visibleTodos.map((todo) => <article className={`task ${todo.completed ? 'completed' : ''}`} key={todo.id}><button className="check" onClick={() => toggleTodo(todo)} aria-label={`Mark ${todo.title} as ${todo.completed ? 'incomplete' : 'complete'}`}>{todo.completed && <Check size={14} strokeWidth={3} />}</button><div className="task-text"><h3>{todo.title}</h3><div><span className={`tag ${todo.category.toLowerCase()}`}>{todo.category}</span><span className={`priority ${todo.priority}`}>{todo.priority}</span></div></div><button className="delete" onClick={() => deleteTodo(todo.id)} aria-label={`Delete ${todo.title}`}><Trash2 size={18} /></button></article>) : <div className="empty"><ListFilter size={28} />No tasks found. Add one above!</div>}</div>
    </section>
    <footer>Built with React & Node.js <span>·</span> A focused place for your day</footer>
  </main>;
}
