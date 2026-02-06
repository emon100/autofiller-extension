'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Package, Plus, Edit2, Trash2, Save, X, Search, Coins, User } from 'lucide-react';

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

interface CreditUser {
  userId: string;
  email: string;
  displayName: string;
  balance: number;
  lifetimeUsed: number;
  updatedAt: string;
  subscription: { planId: string; status: string; expiresAt: string } | null;
}

const emptyProduct: Partial<Product> = {
  paddle_product_id: '',
  paddle_price_id: '',
  name: '',
  description: '',
  type: 'one_time',
  credits: null,
  price_amount: 0,
  price_currency: 'USD',
  billing_cycle: 'one_time',
  is_active: true,
  display_order: 0,
  features: [],
};

export default function AdminClient({ initialProducts, user }: AdminClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState<Partial<Product>>(emptyProduct);

  // Credit management state
  const [creditEmail, setCreditEmail] = useState('');
  const [creditUser, setCreditUser] = useState<CreditUser | null>(null);
  const [creditSearching, setCreditSearching] = useState(false);
  const [creditError, setCreditError] = useState('');
  const [newBalance, setNewBalance] = useState<number>(0);
  const [creditReason, setCreditReason] = useState('');
  const [creditSaving, setCreditSaving] = useState(false);
  const [creditSuccess, setCreditSuccess] = useState('');

  const supabase = createClient();

  // Credit management handlers
  const handleCreditSearch = async () => {
    if (!creditEmail.trim()) return;
    setCreditSearching(true);
    setCreditError('');
    setCreditUser(null);
    setCreditSuccess('');

    try {
      const res = await fetch(`/api/admin/credits?email=${encodeURIComponent(creditEmail.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        setCreditError(data.error || 'Search failed');
        return;
      }

      setCreditUser(data);
      setNewBalance(data.balance);
    } catch {
      setCreditError('Network error');
    } finally {
      setCreditSearching(false);
    }
  };

  const handleCreditSave = async () => {
    if (!creditUser) return;
    setCreditSaving(true);
    setCreditError('');
    setCreditSuccess('');

    try {
      const res = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: creditUser.userId,
          newBalance,
          reason: creditReason || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setCreditError(data.error || 'Update failed');
        return;
      }

      setCreditSuccess(`Credits updated: ${data.oldBalance} → ${data.newBalance}`);
      setCreditUser({ ...creditUser, balance: data.newBalance });
      setCreditReason('');
    } catch {
      setCreditError('Network error');
    } finally {
      setCreditSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!addForm.name || !addForm.paddle_product_id || !addForm.paddle_price_id) {
      alert('Name, Paddle Product ID, and Paddle Price ID are required');
      return;
    }

    const { data, error } = await supabase
      .from('products')
      .insert(addForm)
      .select()
      .single();

    if (error) {
      alert('Failed to create product: ' + error.message);
      return;
    }

    setProducts([...products, data]);
    setAdding(false);
    setAddForm(emptyProduct);
  };

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
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
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
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Products</h2>
            <button
              onClick={() => { setAdding(true); setAddForm(emptyProduct); }}
              disabled={adding}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          </div>

          {/* Add Product Form */}
          {adding && (
            <div className="border-b border-gray-200 bg-blue-50 px-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Starter Pack"
                    value={addForm.name || ''}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="e.g. For active job seekers"
                    value={addForm.description || ''}
                    onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Paddle Product ID *</label>
                  <input
                    type="text"
                    placeholder="pro_..."
                    value={addForm.paddle_product_id || ''}
                    onChange={(e) => setAddForm({ ...addForm, paddle_product_id: e.target.value })}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Paddle Price ID *</label>
                  <input
                    type="text"
                    placeholder="pri_..."
                    value={addForm.paddle_price_id || ''}
                    onChange={(e) => setAddForm({ ...addForm, paddle_price_id: e.target.value })}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={addForm.type || 'one_time'}
                    onChange={(e) => setAddForm({ ...addForm, type: e.target.value as any })}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                  >
                    <option value="one_time">One Time</option>
                    <option value="subscription">Subscription</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Billing Cycle</label>
                  <select
                    value={addForm.billing_cycle || 'one_time'}
                    onChange={(e) => setAddForm({ ...addForm, billing_cycle: e.target.value as any })}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                  >
                    <option value="one_time">One Time</option>
                    <option value="month">Monthly</option>
                    <option value="year">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Price (cents)</label>
                  <input
                    type="number"
                    placeholder="999 = $9.99"
                    value={addForm.price_amount || ''}
                    onChange={(e) => setAddForm({ ...addForm, price_amount: parseInt(e.target.value) || 0 })}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Credits (empty = unlimited)</label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={addForm.credits ?? ''}
                    onChange={(e) => setAddForm({ ...addForm, credits: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={addForm.display_order || 0}
                    onChange={(e) => setAddForm({ ...addForm, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Features (comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Fast filling, AI powered"
                    value={(addForm.features || []).join(', ')}
                    onChange={(e) => setAddForm({ ...addForm, features: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleAdd}
                  className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  <Save className="h-4 w-4" />
                  Create Product
                </button>
                <button
                  onClick={() => { setAdding(false); setAddForm(emptyProduct); }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                {addForm.price_amount ? (
                  <span className="text-sm text-gray-500">
                    Price preview: ${((addForm.price_amount || 0) / 100).toFixed(2)}
                  </span>
                ) : null}
              </div>
            </div>
          )}

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

        {/* User Credits Management */}
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-6">
            <Coins className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">User Credits Management</h2>
          </div>

          {/* Search */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                placeholder="Enter user email..."
                value={creditEmail}
                onChange={(e) => setCreditEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreditSearch()}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleCreditSearch}
              disabled={creditSearching || !creditEmail.trim()}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {creditSearching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Error */}
          {creditError && (
            <div className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
              {creditError}
            </div>
          )}

          {/* Success */}
          {creditSuccess && (
            <div className="mt-3 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">
              {creditSuccess}
            </div>
          )}

          {/* User Info & Edit */}
          {creditUser && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {creditUser.displayName || creditUser.email}
                  </div>
                  <div className="text-sm text-gray-500">{creditUser.email}</div>
                  <div className="text-xs text-gray-400 mt-0.5">ID: {creditUser.userId}</div>
                </div>
                <div className="text-right">
                  {creditUser.subscription ? (
                    <span className="inline-block rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                      Unlimited ({creditUser.subscription.planId})
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div className="rounded-lg bg-white p-3 border border-gray-200">
                  <div className="text-2xl font-bold text-gray-900">{creditUser.balance}</div>
                  <div className="text-xs text-gray-500">Current Balance</div>
                </div>
                <div className="rounded-lg bg-white p-3 border border-gray-200">
                  <div className="text-2xl font-bold text-gray-900">{creditUser.lifetimeUsed}</div>
                  <div className="text-xs text-gray-500">Lifetime Used</div>
                </div>
                <div className="rounded-lg bg-white p-3 border border-gray-200">
                  <div className="text-2xl font-bold text-gray-900">
                    {creditUser.updatedAt
                      ? new Date(creditUser.updatedAt).toLocaleDateString()
                      : '-'}
                  </div>
                  <div className="text-xs text-gray-500">Last Updated</div>
                </div>
              </div>

              {/* Edit Credits */}
              <div className="mt-4 flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Set Balance
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newBalance}
                    onChange={(e) => setNewBalance(parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-[2]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bug compensation, manual top-up..."
                    value={creditReason}
                    onChange={(e) => setCreditReason(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleCreditSave}
                  disabled={creditSaving || newBalance === creditUser.balance}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {creditSaving ? 'Saving...' : 'Update'}
                </button>
              </div>
              {newBalance !== creditUser.balance && (
                <div className="mt-2 text-xs text-gray-500">
                  Change: {creditUser.balance} → {newBalance} ({newBalance - creditUser.balance >= 0 ? '+' : ''}{newBalance - creditUser.balance})
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
