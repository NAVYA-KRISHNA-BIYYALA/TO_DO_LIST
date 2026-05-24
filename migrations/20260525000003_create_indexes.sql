-- Migration: 20260525000003_create_indexes
-- Performance indexes for common query patterns.

-- Todos filtered or sorted by user (most common access pattern)
CREATE INDEX IF NOT EXISTS idx_todos_user_id
  ON todos (user_id);

-- Todos filtered by category
CREATE INDEX IF NOT EXISTS idx_todos_category_id
  ON todos (category_id);

-- Due-date range queries (upcoming / today filter)
CREATE INDEX IF NOT EXISTS idx_todos_due_date
  ON todos (due_date)
  WHERE due_date IS NOT NULL;

-- Categories lookup by user (also covers public lookup via IS NULL)
CREATE INDEX IF NOT EXISTS idx_categories_user_id
  ON categories (user_id);
