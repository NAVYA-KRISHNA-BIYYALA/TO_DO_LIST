import { createClient } from '@/lib/supabase/server';
import TodoApp from '@/components/TodoApp';
import AuthForm from '@/components/AuthForm';

// Server Component: fetches data before the page renders.
// No loading flash — initial HTML already contains todos and categories.
export default async function Home() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  let todos: Todo[] = [];
  let categories: Category[] = [];

  if (user) {
    const [{ data: remoteTodos }, { data: remoteCategories }] = await Promise.all([
      supabase
        .from('todos')
        .select('id, text, completed, category_id, due_date, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('categories')
        .select('id, name, user_id')
        .order('name', { ascending: true }),
    ]);

    todos = (remoteTodos ?? []).map((t) => ({
      id: String(t.id),
      text: t.text,
      completed: t.completed,
      categoryId: t.category_id ?? '',
      dueDate: t.due_date ?? '',
    }));

    categories = (remoteCategories ?? []).map((c) => ({
      id: c.id,
      name: c.name,
    }));
  }

  return (
    <main>
      <AuthForm user={user} />
      {user ? (
        <TodoApp initialTodos={todos} initialCategories={categories} />
      ) : (
        <p>Sign in to manage your tasks.</p>
      )}
    </main>
  );
}

export type Todo = {
  id: string;
  text: string;
  completed: boolean;
  categoryId: string;
  dueDate: string;
};

export type Category = {
  id: string;
  name: string;
};
