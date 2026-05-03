'use client'

import { useState, useEffect } from 'react'

interface Category {
  id: string
  name: string
  icon: string | null
  sortOrder: number
  isActive: boolean
  _count: { products: number }
}

const emptyForm = { name: '', icon: '', sortOrder: 0 }

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/categories')
      .then(r => r.json())
      .then(d => setCategories(d.categories || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditCat(null)
    setForm({ ...emptyForm })
    setShowModal(true)
  }

  const openEdit = (cat: Category) => {
    setEditCat(cat)
    setForm({ name: cat.name, icon: cat.icon || '', sortOrder: cat.sortOrder })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const url = editCat ? `/api/categories/${editCat.id}` : '/api/categories'
      const method = editCat ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), icon: form.icon || null, sortOrder: Number(form.sortOrder) }),
      })
      if (res.ok) { setShowModal(false); load() }
    } catch { /* empty */ }
    setSaving(false)
  }

  const toggleActive = async (cat: Category) => {
    await fetch(`/api/categories/${cat.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !cat.isActive }),
    })
    load()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    setDeleteId(null)
    load()
  }

  const ICON_SUGGESTIONS = ['📱', '🎧', '🔋', '🖥️', '⌚', '📷', '🎮', '💻', '🔌', '🛡️', '🎵', '💡']

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ color: '#e8f4ff', fontWeight: 800, fontSize: 26 }}>🗂️ إدارة الأقسام</h1>
        <button onClick={openAdd} className="btn-neon" style={{ fontSize: 14 }}>+ إضافة قسم</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#7fa8c0' }}>جاري التحميل...</div>
      ) : categories.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#7fa8c0' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🗂️</div>
          <p style={{ fontSize: 16, marginBottom: 8 }}>لا توجد أقسام بعد</p>
          <p style={{ fontSize: 13 }}>أضف أقساماً لتنظيم المنتجات</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {categories.map(cat => (
            <div key={cat.id} style={{
              background: 'rgba(13,21,32,0.9)',
              border: `1px solid ${cat.isActive ? 'rgba(26,58,92,0.5)' : 'rgba(239,68,68,0.2)'}`,
              borderRadius: 12, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0,
              }}>
                {cat.icon || '📁'}
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ color: '#e8f4ff', fontWeight: 700, fontSize: 15 }}>{cat.name}</div>
                <div style={{ color: '#7fa8c0', fontSize: 12, marginTop: 2 }}>
                  {cat._count.products} منتج · الترتيب: {cat.sortOrder}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                  padding: '4px 12px', borderRadius: 50, fontSize: 11, fontWeight: 600,
                  background: cat.isActive ? 'rgba(0,255,136,0.15)' : 'rgba(239,68,68,0.15)',
                  color: cat.isActive ? '#00ff88' : '#ff6464',
                  border: `1px solid ${cat.isActive ? 'rgba(0,255,136,0.3)' : 'rgba(239,68,68,0.3)'}`,
                }}>
                  {cat.isActive ? 'نشط' : 'مخفي'}
                </span>
                <button onClick={() => openEdit(cat)} style={{
                  background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.3)',
                  color: '#00d4ff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12,
                }}>✏️ تعديل</button>
                <button onClick={() => toggleActive(cat)} style={{
                  background: cat.isActive ? 'rgba(239,68,68,0.1)' : 'rgba(0,255,136,0.1)',
                  border: `1px solid ${cat.isActive ? 'rgba(239,68,68,0.3)' : 'rgba(0,255,136,0.3)'}`,
                  color: cat.isActive ? '#ff6464' : '#00ff88',
                  borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12,
                }}>
                  {cat.isActive ? '🙈 إخفاء' : '👁 إظهار'}
                </button>
                <button onClick={() => setDeleteId(cat.id)} style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#ff6464', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12,
                }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box" style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ color: '#e8f4ff', fontWeight: 700, fontSize: 20 }}>
                {editCat ? '✏️ تعديل القسم' : '➕ إضافة قسم جديد'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#7fa8c0', fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ color: '#7fa8c0', fontSize: 13, display: 'block', marginBottom: 6 }}>اسم القسم *</label>
                <input className="input-dark" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="مثال: إكسسوارات آيفون" />
              </div>

              <div>
                <label style={{ color: '#7fa8c0', fontSize: 13, display: 'block', marginBottom: 8 }}>الأيقونة (رمز تعبيري)</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  {ICON_SUGGESTIONS.map(ico => (
                    <button key={ico} onClick={() => setForm(p => ({ ...p, icon: ico }))} style={{
                      width: 40, height: 40, borderRadius: 8, fontSize: 20, cursor: 'pointer',
                      background: form.icon === ico ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${form.icon === ico ? 'rgba(0,255,136,0.5)' : 'rgba(26,58,92,0.4)'}`,
                    }}>{ico}</button>
                  ))}
                </div>
                <input className="input-dark" value={form.icon}
                  onChange={e => setForm(p => ({ ...p, icon: e.target.value }))}
                  placeholder="أو اكتب رمزاً تعبيرياً" style={{ fontSize: 18 }} />
              </div>

              <div>
                <label style={{ color: '#7fa8c0', fontSize: 13, display: 'block', marginBottom: 6 }}>ترتيب العرض</label>
                <input className="input-dark" type="number" value={form.sortOrder}
                  onChange={e => setForm(p => ({ ...p, sortOrder: Number(e.target.value) }))}
                  placeholder="0" min={0} />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button onClick={() => setShowModal(false)} className="btn-outline" style={{ fontSize: 14 }}>إلغاء</button>
                <button onClick={handleSave} disabled={saving || !form.name.trim()} className="btn-neon"
                  style={{ fontSize: 14, opacity: (saving || !form.name.trim()) ? 0.7 : 1 }}>
                  {saving ? 'جاري الحفظ...' : editCat ? 'حفظ التعديلات' : 'إضافة القسم'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🗂️</div>
            <h3 style={{ color: '#ff6464', fontWeight: 700, fontSize: 20, marginBottom: 10 }}>حذف القسم</h3>
            <p style={{ color: '#7fa8c0', marginBottom: 24 }}>
              سيتم إزالة هذا القسم من جميع المنتجات. لا يمكن التراجع.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setDeleteId(null)} className="btn-outline" style={{ fontSize: 14 }}>إلغاء</button>
              <button onClick={() => handleDelete(deleteId)} style={{
                background: '#ef4444', border: 'none', color: 'white',
                padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600,
              }}>تأكيد الحذف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
