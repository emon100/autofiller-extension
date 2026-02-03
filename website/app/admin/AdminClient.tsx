'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Package, Plus, Edit2, Trash2, Save, X } from 'lucide-react';

interface Product {
  id: string;
  paddle_product_id: string;
  paddle_price_id: string;
  name: string;
  description: string;
  type: 'one_time' | 'subscription';
  credits: number | null;
  price_amount: number;
  price_currency: string;
  billing_cycle: 'month' | 'year' | 'one_time';
  is_active: boolean;
  display_order: number;
  features: string[];
}

interface AdminClientProps {
  initialProducts: Product[];
  user: any;
}

export default function AdminClient({ initialProducts, user }: AdminClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});

  const supabase = createClient();

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setEditForm(product);
  };

  const handleSave = async () => {
    if (!editingId) return;

    const { error } = await supabase
      .from('products')
      .update(editForm)
      .eq('id', editingId);

    if (error) {
      alert('Failed to update product');
      return;
    }

    setProducts(products.map(p => p.id === editingId ? { ...p, ...editForm } : p));
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Failed to delete product');
      return;
    }

    setProducts(products.filter(p => p.id !== id));
  };

  const handleToggleActive = async (product: Product) => {
    const { error } = await supabase
      .from('products')
      .update({ is_active: !product.is_active })
      .eq('id', product.id);

    if (error) {
      alert('Failed to update product');
      return;
    }

    setProducts(products.map(p =>
      p.id === product.id ? { ...p, is_active: !p.is_active } : p
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
              <p className="text-sm text-gray-600">Logged in as {user.email}</p>
            </div>
            <a
              href="/"
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Back to Website
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-xl border border-gray-200 bg-white">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Product</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Price</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Credits</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id} className={!product.is_active ? 'opacity-50' : ''}>
                  {editingId === product.id ? (
                    <>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full rounded border border-gray-300 px-2 py-1"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={editForm.type || ''}
                          onChange={(e) => setEditForm({ ...editForm, type: e.target.value as any })}
                          className="rounded border border-gray-300 px-2 py-1"
                        >
                          <option value="one_time">One Time</option>
                          <option value="subscription">Subscription</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          value={editForm.price_amount || 0}
                          onChange={(e) => setEditForm({ ...editForm, price_amount: parseInt(e.target.value) })}
                          className="w-24 rounded border border-gray-300 px-2 py-1"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          value={editForm.credits || 0}
                          onChange={(e) => setEditForm({ ...editForm, credits: parseInt(e.target.value) || null })}
                          className="w-24 rounded border border-gray-300 px-2 py-1"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">Editing...</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={handleSave}
                          className="mr-2 rounded p-1 text-green-600 hover:bg-green-50"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditForm({}); }}
                          className="rounded p-1 text-gray-600 hover:bg-gray-50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">{product.paddle_price_id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {product.type === 'one_time' ? 'One Time' : 'Subscription'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">
                          ${(product.price_amount / 100).toFixed(2)}
                          {product.type === 'subscription' && ` /${product.billing_cycle}`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {product.credits ? `${product.credits} credits` : 'Unlimited'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleActive(product)}
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            product.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {product.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEdit(product)}
                          className="mr-2 rounded p-1 text-blue-600 hover:bg-blue-50"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="rounded p-1 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {products.length === 0 && (
            <div className="py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-600">No products found</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-6">
          <h3 className="font-semibold text-blue-900">How to add new products</h3>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-blue-700">
            <li>Create products and prices in Paddle Dashboard</li>
            <li>Insert them into the database using SQL or add a form here</li>
            <li>Make sure the paddle_price_id matches exactly</li>
            <li>Set is_active to true to show on pricing page</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
