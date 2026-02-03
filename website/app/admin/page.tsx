import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminClient from './AdminClient';

export default async function AdminPage() {
  const supabase = createClient();

  // 检查用户是否登录
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 检查是否是管理员
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!adminUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">You don't have permission to access this page.</p>
          <a href="/" className="mt-4 inline-block text-blue-600 hover:underline">
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  // 获取所有产品
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('display_order', { ascending: true });

  return <AdminClient initialProducts={products || []} user={user} />;
}
