const SUPABASE_URL = 'https://supabase.com/dashboard/project/ntzwaaebnjubsohsarcv'; // Replace with your URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50endhYWVibmp1YnNvaHNhcmN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NDQ3MTksImV4cCI6MjA5NTIyMDcxOX0.wS14WYwbKsM8zcrdnKNn7v2yOVjCxqKtBK6y_CxgO2A'; // Replace with your anon key

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
const searchQueryInput = searchInput;

const TODO_STORAGE_KEY = 'simple-todo-list-todos';
const CATEGORY_STORAGE_KEY = 'simple-todo-list-categories';
let todos = [];
let categories = [];
let activeCategoryId = 'all';
let activeFilter = 'all';
let searchQuery = '';

function saveTodos() {
  localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
}

function saveCategories() {
  localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(categories));
}

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

function updateStats(filteredTodos) {
  const remaining = filteredTodos.filter(todo => !todo.completed).length;
  const total = filteredTodos.length;
  remainingCount.textContent = `${remaining} of ${total} tasks left`;
}

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
  return todos.filter(todo => {
    if (!todo.completed) return false;
    if (activeCategoryId !== 'all' && todo.categoryId !== activeCategoryId) return false;
    return matchesSearch(todo);
  });
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

function addTodo(text, categoryId, dueDate) {
  if (!text.trim() || !categoryId) return;

  todos.unshift({
    id: Date.now().toString(),
    text: text.trim(),
    completed: false,
    categoryId,
    dueDate: dueDate || '',
  });

  saveTodos();
  renderTodos();
}

function toggleTodo(id) {
  todos = todos.map(todo => todo.id === id ? { ...todo, completed: !todo.completed } : todo);
  saveTodos();
  renderTodos();
}

function removeTodo(id) {
  todos = todos.filter(todo => todo.id !== id);
  saveTodos();
  renderTodos();
}

function clearCompleted() {
  todos = todos.filter(todo => !todo.completed);
  saveTodos();
  renderTodos();
}

function addCategory(name) {
  const trimmed = name.trim();
  if (!trimmed) return;

  categories.push({ id: Date.now().toString(), name: trimmed });
  saveCategories();
  renderCategories();
}

function removeCategory(id) {
  todos = todos.filter(todo => todo.categoryId !== id);
  categories = categories.filter(category => category.id !== id);
  if (activeCategoryId === id) activeCategoryId = 'all';
  saveCategories();
  saveTodos();
  renderCategories();
  renderTodos();
}

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

function loadData() {
  const storedTodos = localStorage.getItem(TODO_STORAGE_KEY);
  const storedCategories = localStorage.getItem(CATEGORY_STORAGE_KEY);
  categories = storedCategories ? JSON.parse(storedCategories) : [];
  todos = storedTodos ? JSON.parse(storedTodos) : [];

  if (!categories.length) {
    categories = [
      { id: 'inbox', name: 'Inbox' },
      { id: 'work', name: 'Work' },
      { id: 'personal', name: 'Personal' },
    ];
    saveCategories();
  }
}

todoForm.addEventListener('submit', event => {
  event.preventDefault();
  const taskText = todoInput.value;
  const categoryId = categorySelect.value || categories[0]?.id;
  const dueDate = todoDateInput.value;
  addTodo(taskText, categoryId, dueDate);
  todoInput.value = '';
  todoDateInput.value = '';
  todoInput.focus();
});

searchQueryInput.addEventListener('input', event => {
  searchQuery = event.target.value;
  renderTodos();
});

categoryForm.addEventListener('submit', event => {
  event.preventDefault();
  addCategory(categoryInput.value);
  categoryInput.value = '';
  categoryInput.focus();
});

clearCompletedButton.addEventListener('click', clearCompleted);
filterTabs.forEach(button => {
  button.addEventListener('click', () => setFilter(button.dataset.filter));
});

window.addEventListener('DOMContentLoaded', () => {
  loadData();
  renderCategories();
  renderTodos();
});
