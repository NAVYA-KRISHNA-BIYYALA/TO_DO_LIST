// Main app logic with Supabase integration and localStorage fallback
// Uses global `supabase` client created in supabaseClient.js

const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const todoDateInput = document.getElementById('todo-date');
const searchInput = document.getElementById('search-input');
const todoList = document.getElementById('todo-list');
const completedGroups = document.getElementById('completed-groups');
const remainingCount = document.getElementById('remaining-count');
const clearCompletedButton = document.getElementById('clear-completed');
const categoryForm = document.getElementById('category-form');
const categoryInput = document.getElementById('category-input');
const categoryList = document.getElementById('category-list');
const categorySelect = document.getElementById('category-select');
const filterTabs = document.querySelectorAll('.filter-tabs .tab-button');
const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('auth-email');
const sendLinkBtn = document.getElementById('send-link');
const userInfo = document.getElementById('user-info');
const userEmailSpan = document.getElementById('user-email');
const signOutBtn = document.getElementById('sign-out');

const TODO_STORAGE_KEY = 'simple-todo-list-todos';
const CATEGORY_STORAGE_KEY = 'simple-todo-list-categories';
let todos = [];
let categories = [];
let activeCategoryId = 'all';
let activeFilter = 'all';
let searchQuery = '';
let currentUser = null;

// --- utility functions ---
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function isSameDay(dateString, compareDate) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.getFullYear() === compareDate.getFullYear() &&
         date.getMonth() === compareDate.getMonth() &&
         date.getDate() === compareDate.getDate();
}

function isFutureDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

// --- persistence helpers ---
function saveLocalCategories() {
  localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(categories));
}

function saveLocalTodos() {
  localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
}

async function fetchRemoteCategories() {
  const { data, error } = await window.supabase.from('categories').select('*').order('name', { ascending: true });
  if (error) throw error;
  return data;
}

async function fetchRemoteTodos() {
  const { data, error } = await window.supabase.from('todos').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// --- rendering ---
function matchesSearch(todo) {
  return !searchQuery || todo.text.toLowerCase().includes(searchQuery.toLowerCase());
}

function getFilteredTodos() {
  return todos.filter(todo => {
    if (todo.completed) return false;
    if (activeCategoryId !== 'all' && todo.categoryId !== activeCategoryId) return false;
    if (!matchesSearch(todo)) return false;

    if (activeFilter === 'today') {
      return todo.dueDate && isSameDay(todo.dueDate, new Date());
    }

    if (activeFilter === 'upcoming') {
      return todo.dueDate && isFutureDate(todo.dueDate);
    }

    return true;
  });
}

function getCompletedTasks() {
  return todos.filter(todo => todo.completed && (activeCategoryId === 'all' || todo.categoryId === activeCategoryId) && matchesSearch(todo));
}

function renderCategories() {
  categoryList.innerHTML = '';
  categorySelect.innerHTML = '';

  const allItem = document.createElement('li');
  allItem.className = `category-item${activeCategoryId === 'all' ? ' active' : ''}`;
  allItem.innerHTML = '<span>All categories</span>';
  allItem.addEventListener('click', () => selectCategory('all'));
  categoryList.append(allItem);

  categories.forEach(category => {
    const completedCount = todos.filter(todo => todo.completed && todo.categoryId === category.id).length;
    const item = document.createElement('li');
    item.className = `category-item${activeCategoryId === category.id ? ' active' : ''}`;
    item.innerHTML = `<span>${category.name}</span><span class="category-meta">${completedCount} done</span><button type="button" aria-label="Delete ${category.name}">×</button>`;
    item.querySelector('button').addEventListener('click', () => removeCategory(category.id));
    item.addEventListener('click', event => {
      if (event.target.tagName !== 'BUTTON') selectCategory(category.id);
    });
    categoryList.append(item);

    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
    categorySelect.append(option);
  });
}

function renderCompletedGroups() {
  const completed = getCompletedTasks();
  completedGroups.innerHTML = '';

  if (!completed.length) {
    const empty = document.createElement('div');
    empty.className = 'completed-empty';
    empty.textContent = 'No completed tasks yet.';
    completedGroups.append(empty);
    return;
  }

  const groups = categories.reduce((acc, category) => {
    const tasks = completed.filter(todo => todo.categoryId === category.id);
    if (tasks.length) acc.push({ category, tasks });
    return acc;
  }, []);

  groups.forEach(group => {
    const wrapper = document.createElement('div');
    wrapper.className = 'completed-group';

    const title = document.createElement('h3');
    title.textContent = `${group.category.name} (${group.tasks.length})`;

    const list = document.createElement('ul');
    list.className = 'completed-group-list';

    group.tasks.forEach(todo => {
      const item = document.createElement('li');
      item.className = 'completed-group-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.addEventListener('change', () => toggleTodo(todo.id));

      const titleWrap = document.createElement('span');
      titleWrap.textContent = todo.text;

      const meta = document.createElement('span');
      meta.className = 'completed-meta';
      meta.textContent = todo.dueDate ? formatDate(todo.dueDate) : 'No due date';

      item.append(checkbox, titleWrap, meta);
      list.append(item);
    });

    wrapper.append(title, list);
    completedGroups.append(wrapper);
  });
}

function renderTodos() {
  const filtered = getFilteredTodos();
  todoList.innerHTML = '';

  filtered.forEach(todo => {
    const item = document.createElement('li');
    item.className = 'todo-item';

    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.completed;
    checkbox.addEventListener('change', () => toggleTodo(todo.id));

    const textWrap = document.createElement('div');
    textWrap.className = 'todo-item-text';

    const title = document.createElement('span');
    title.className = 'todo-item-title';
    title.textContent = todo.text;

    const meta = document.createElement('span');
    meta.className = 'todo-meta';
    const categoryName = categories.find(cat => cat.id === todo.categoryId)?.name || 'No category';
    meta.textContent = `${categoryName}${todo.dueDate ? ' · ' + formatDate(todo.dueDate) : ''}`;

    textWrap.append(title, meta);
    label.append(checkbox, textWrap);

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.textContent = 'Delete';
    removeButton.addEventListener('click', () => removeTodo(todo.id));

    item.append(label, removeButton);
    todoList.append(item);
  });

  updateStats(filtered);
  renderCompletedGroups();
}

function updateStats(filteredTodos) {
  const remaining = filteredTodos.filter(todo => !todo.completed).length;
  const total = filteredTodos.length;
  remainingCount.textContent = `${remaining} of ${total} tasks left`;
}

// --- CRUD operations with remote fallback ---
async function loadData() {
  if (window.supabase && currentUser) {
    try {
      const remoteCats = await fetchRemoteCategories();
      categories = remoteCats.map(c => ({ id: c.id, name: c.name }));
    } catch (err) {
      console.warn('Failed to fetch categories from Supabase, using local', err);
      const storedCategories = localStorage.getItem(CATEGORY_STORAGE_KEY);
      categories = storedCategories ? JSON.parse(storedCategories) : [];
    }

    try {
      const remoteTodos = await fetchRemoteTodos();
      todos = remoteTodos.map(t => ({ id: t.id.toString(), text: t.text, completed: t.completed, categoryId: t.category_id, dueDate: t.due_date || '' }));
    } catch (err) {
      console.warn('Failed to fetch todos from Supabase, using local', err);
      const stored = localStorage.getItem(TODO_STORAGE_KEY);
      todos = stored ? JSON.parse(stored) : [];
    }
  } else {
    const storedCategories = localStorage.getItem(CATEGORY_STORAGE_KEY);
    categories = storedCategories ? JSON.parse(storedCategories) : [];

    const stored = localStorage.getItem(TODO_STORAGE_KEY);
    todos = stored ? JSON.parse(stored) : [];

    if (!categories.length) {
      categories = [
        { id: 'inbox', name: 'Inbox' },
        { id: 'work', name: 'Work' },
        { id: 'personal', name: 'Personal' },
      ];
      saveLocalCategories();
    }
  }
}

async function addCategory(name) {
  const trimmed = name.trim();
  if (!trimmed) return;

  if (window.supabase && currentUser) {
    const { data, error } = await window.supabase.from('categories').insert([{ name: trimmed }]).select();
    if (error) {
      console.error('Failed to create category', error);
      return;
    }
    categories.push({ id: data[0].id, name: data[0].name });
    renderCategories();
    return;
  }

  categories.push({ id: Date.now().toString(), name: trimmed });
  saveLocalCategories();
  renderCategories();
}

async function removeCategory(id) {
  if (window.supabase && currentUser) {
    await window.supabase.from('todos').delete().eq('category_id', id);
    await window.supabase.from('categories').delete().eq('id', id);
    // reload remote data
    await loadData();
    renderCategories();
    renderTodos();
    return;
  }

  todos = todos.filter(todo => todo.categoryId !== id);
  categories = categories.filter(category => category.id !== id);
  if (activeCategoryId === id) activeCategoryId = 'all';
  saveLocalCategories();
  saveLocalTodos();
  renderCategories();
  renderTodos();
}

async function addTodo(text, categoryId, dueDate) {
  if (!text.trim() || !categoryId) return;

  if (window.supabase && currentUser) {
    const { data, error } = await window.supabase.from('todos').insert([{
      user_id: currentUser.id,
      text: text.trim(),
      completed: false,
      category_id: categoryId,
      due_date: dueDate || null,
    }]).select();

    if (error) {
      console.error('Failed to insert todo', error);
      return;
    }

    const t = data[0];
    todos.unshift({ id: t.id.toString(), text: t.text, completed: t.completed, categoryId: t.category_id, dueDate: t.due_date || '' });
    renderTodos();
    return;
  }

  todos.unshift({
    id: Date.now().toString(),
    text: text.trim(),
    completed: false,
    categoryId,
    dueDate: dueDate || '',
  });

  saveLocalTodos();
  renderTodos();
}

async function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;

  if (window.supabase && currentUser) {
    const { error } = await window.supabase.from('todos').update({ completed: !todo.completed }).eq('id', id);
    if (error) {
      console.error('Failed to toggle todo', error);
      return;
    }
    todo.completed = !todo.completed;
    renderTodos();
    return;
  }

  todos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
  saveLocalTodos();
  renderTodos();
}

async function removeTodo(id) {
  if (window.supabase && currentUser) {
    await window.supabase.from('todos').delete().eq('id', id);
    todos = todos.filter(t => t.id !== id);
    renderTodos();
    return;
  }

  todos = todos.filter(todo => todo.id !== id);
  saveLocalTodos();
  renderTodos();
}

async function clearCompleted() {
  if (window.supabase && currentUser) {
    await window.supabase.from('todos').delete().eq('completed', true).eq('user_id', currentUser.id);
    // reload
    await loadData();
    renderTodos();
    return;
  }

  todos = todos.filter(todo => !todo.completed);
  saveLocalTodos();
  renderTodos();
}

// --- category selection and filter ---
function selectCategory(id) {
  activeCategoryId = id;
  renderCategories();
  renderTodos();
}

function setFilter(filterKey) {
  activeFilter = filterKey;
  filterTabs.forEach(button => {
    button.classList.toggle('active', button.dataset.filter === filterKey);
  });
  renderTodos();
}

// --- auth ---
async function handleAuthState() {
  if (!window.supabase) return;

  const { data } = await window.supabase.auth.getUser();
  currentUser = data?.user || null;

  if (currentUser) {
    userInfo.hidden = false;
    userEmailSpan.textContent = currentUser.email;
  } else {
    userInfo.hidden = true;
    userEmailSpan.textContent = '';
  }
}

async function sendLoginLink(email) {
  if (!window.supabase) return;
  const { error } = await window.supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + window.location.pathname },
  });
  if (error) {
    alert('Failed to send login link: ' + error.message);
    return;
  }
  alert('Check your email for a login link.');
}

// --- load / initialize ---
searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  renderTodos();
});

sendLinkBtn.addEventListener('click', async (e) => {
  const email = authEmail.value.trim();
  if (!email) return alert('Enter your email');
  await sendLoginLink(email);
});

signOutBtn.addEventListener('click', async () => {
  if (!window.supabase) return;
  await window.supabase.auth.signOut();
  currentUser = null;
  await loadData();
  renderCategories();
  renderTodos();
  await handleAuthState();
});

categoryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  await addCategory(categoryInput.value);
  categoryInput.value = '';
});

// wire filter tabs
filterTabs.forEach(button => {
  button.addEventListener('click', () => setFilter(button.dataset.filter));
});

// initial load
window.addEventListener('DOMContentLoaded', async () => {
  // listen for auth changes
  if (window.supabase) {
    const { data: { subscription } } = window.supabase.auth.onAuthStateChange(async (_event, session) => {
      currentUser = session?.user || null;
      await handleAuthState();
      await loadData();
      renderCategories();
      renderTodos();
    });
  }

  await handleAuthState();
  await loadData();
  renderCategories();
  renderTodos();
});
