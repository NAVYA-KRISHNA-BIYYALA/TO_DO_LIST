'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Todo, Category } from '@/app/page';

type Props = {
  initialTodos: Todo[];
  initialCategories: Category[];
};

function formatDate(dateString: string) {
  if (!dateString) return '';
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function isSameDay(dateString: string, ref: Date) {
  const d = new Date(`${dateString}T00:00:00`);
  return d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate();
}

function isFutureDate(dateString: string) {
  const d = new Date(`${dateString}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d > today;
}

export default function TodoApp({ initialTodos, initialCategories }: Props) {
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [todoText, setTodoText] = useState('');
  const [todoDueDate, setTodoDueDate] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');

  // ── Derived lists ──────────────────────────────────────────────────────
  const filteredTodos = todos.filter((todo) => {
    if (todo.completed) return false;
    if (activeCategoryId !== 'all' && todo.categoryId !== activeCategoryId) return false;
    if (searchQuery && !todo.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (activeFilter === 'today') return todo.dueDate && isSameDay(todo.dueDate, new Date());
    if (activeFilter === 'upcoming') return todo.dueDate && isFutureDate(todo.dueDate);
    return true;
  });

  const completedTodos = todos.filter(
    (t) => t.completed &&
      (activeCategoryId === 'all' || t.categoryId === activeCategoryId) &&
      (!searchQuery || t.text.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // ── API helpers ────────────────────────────────────────────────────────
  const refreshFromServer = useCallback(() => router.refresh(), [router]);

  async function addTodo() {
    if (!todoText.trim() || !selectedCategoryId) return;
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: todoText.trim(),
        category_id: selectedCategoryId,
        due_date: todoDueDate || null,
      }),
    });
    if (!res.ok) return;
    const t = await res.json();
    setTodos((prev) => [{
      id: String(t.id),
      text: t.text,
      completed: t.completed,
      categoryId: t.category_id ?? '',
      dueDate: t.due_date ?? '',
    }, ...prev]);
    setTodoText('');
    setTodoDueDate('');
  }

  async function toggleTodo(id: string, current: boolean) {
    const res = await fetch(`/api/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !current }),
    });
    if (!res.ok) return;
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, completed: !current } : t));
  }

  async function deleteTodo(id: string) {
    await fetch(`/api/todos/${id}`, { method: 'DELETE' });
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  async function clearCompleted() {
    const ids = completedTodos.map((t) => t.id);
    await Promise.all(ids.map((id) => fetch(`/api/todos/${id}`, { method: 'DELETE' })));
    setTodos((prev) => prev.filter((t) => !t.completed));
  }

  async function addCategory() {
    if (!categoryName.trim()) return;
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: categoryName.trim() }),
    });
    if (!res.ok) return;
    const c = await res.json();
    setCategories((prev) => [...prev, { id: c.id, name: c.name }]);
    setCategoryName('');
  }

  async function deleteCategory(id: string) {
    await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setTodos((prev) => prev.map((t) => t.categoryId === id ? { ...t, categoryId: '' } : t));
    if (activeCategoryId === id) setActiveCategoryId('all');
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="app-container">
      {/* Search */}
      <input
        id="search-input"
        type="text"
        placeholder="Search tasks…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* Filter tabs */}
      <div className="filter-tabs">
        {(['all', 'today', 'upcoming'] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`tab-button${activeFilter === f ? ' active' : ''}`}
            data-filter={f}
            onClick={() => setActiveFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Category list */}
      <ul id="category-list">
        <li
          className={`category-item${activeCategoryId === 'all' ? ' active' : ''}`}
          onClick={() => setActiveCategoryId('all')}
        >
          <span>All categories</span>
        </li>
        {categories.map((cat) => (
          <li
            key={cat.id}
            className={`category-item${activeCategoryId === cat.id ? ' active' : ''}`}
            onClick={() => setActiveCategoryId(cat.id)}
          >
            <span>{cat.name}</span>
            <span className="category-meta">
              {todos.filter((t) => t.completed && t.categoryId === cat.id).length} done
            </span>
            <button
              type="button"
              aria-label={`Delete ${cat.name}`}
              onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      {/* Add category */}
      <form
        id="category-form"
        onSubmit={(e) => { e.preventDefault(); addCategory(); }}
      >
        <input
          id="category-input"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          placeholder="New category…"
        />
        <button type="submit">Add</button>
      </form>

      {/* Add todo */}
      <form
        id="todo-form"
        onSubmit={(e) => { e.preventDefault(); addTodo(); }}
      >
        <input
          id="todo-input"
          value={todoText}
          onChange={(e) => setTodoText(e.target.value)}
          placeholder="Add a task…"
        />
        <input
          id="todo-date"
          type="date"
          value={todoDueDate}
          onChange={(e) => setTodoDueDate(e.target.value)}
        />
        <select
          id="category-select"
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
        >
          <option value="">— category —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button type="submit">Add</button>
      </form>

      {/* Stats */}
      <span id="remaining-count">
        {filteredTodos.filter((t) => !t.completed).length} of {filteredTodos.length} tasks left
      </span>

      {/* Active todos */}
      <ul id="todo-list">
        {filteredTodos.map((todo) => (
          <li key={todo.id} className="todo-item">
            <label>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id, todo.completed)}
              />
              <div className="todo-item-text">
                <span className="todo-item-title">{todo.text}</span>
                <span className="todo-meta">
                  {categories.find((c) => c.id === todo.categoryId)?.name ?? 'No category'}
                  {todo.dueDate ? ` · ${formatDate(todo.dueDate)}` : ''}
                </span>
              </div>
            </label>
            <button type="button" onClick={() => deleteTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>

      {/* Completed groups */}
      <div id="completed-groups">
        {completedTodos.length === 0 ? (
          <div className="completed-empty">No completed tasks yet.</div>
        ) : (
          categories
            .map((cat) => ({
              cat,
              tasks: completedTodos.filter((t) => t.categoryId === cat.id),
            }))
            .filter(({ tasks }) => tasks.length > 0)
            .map(({ cat, tasks }) => (
              <div key={cat.id} className="completed-group">
                <h3>{cat.name} ({tasks.length})</h3>
                <ul className="completed-group-list">
                  {tasks.map((todo) => (
                    <li key={todo.id} className="completed-group-item">
                      <input
                        type="checkbox"
                        checked
                        onChange={() => toggleTodo(todo.id, todo.completed)}
                      />
                      <span>{todo.text}</span>
                      <span className="completed-meta">
                        {todo.dueDate ? formatDate(todo.dueDate) : 'No due date'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
        )}
      </div>

      <button type="button" id="clear-completed" onClick={clearCompleted}>
        Clear completed
      </button>
    </div>
  );
}
