'use client'

import { useState, useEffect, useRef } from 'react'
import { formatCurrency, parseImages, getStockStatus } from '@/lib/utils'

interface Category {
  id: string
  name: string
  icon: string | null
}

interface Product {
  id: string
  name: string
  description: string
  price: number
  stock: number
  minOrder: number
  images: string
  video?: string
  isActive: boolean
  categoryId: string | null
}

const emptyForm = {
  name: '', description: '', price: '', stock: '', minOrder: '1',
  images: [] as string[], video: '', isActive: true, categoryId: '',
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [previewImg, setPreviewImg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/products?admin=true').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
    ]).then(([pd, cd]) => {
      setProducts(pd.products || [])
      setCategories(cd.categories || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditProduct(null)
    setForm({ ...emptyForm })
    setShowModal(true)
  }

  const openEdit = async (p: Product) => {
    setEditProduct(p)
    setShowModal(true)
    // Fetch full product data (list returns only first image)
    const res = await fetch(`/api/products/${p.id}`)
    const data = await res.json()
    const full = data.product || p
    setForm({
      name: full.name,
      description: full.description || '',
      price: String(full.price),
      stock: String(full.stock),
      minOrder: String(full.minOrder),
      images: parseImages(full.images),
      video: full.video || '',
      isActive: full.isActive,
      categoryId: full.categoryId || '',
    })
  }

  const handleUpload = async (files: FileList, type: 'image' | 'video') => {
    if (!files.length) return
    setUploading(true)
    const fd = new FormData()
    Array.from(files).forEach(f => fd.append('files', f))
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (type === 'image') {
        setForm(prev => ({ ...prev, images: [...prev.images, ...data.urls] }))
      } else {
        setForm(prev => ({ ...prev, video: data.urls[0] }))
      }
    } catch { /* empty */ }
    setUploading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const body = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      stock: Number(form.stock),
      minOrder: Number(form.minOrder),
      images: form.images,
      video: form.video || null,
      isActive: form.isActive,
      categoryId: form.categoryId || null,
    }
    try {
      const url = editProduct ? `/api/products/${editProduct.id}` : '/api/products'
      const method = editProduct ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setShowModal(false)
        load()
      } else {
        const d = await res.json()
        setError(d.error || 'فشل الحفظ')
      }
    } catch {
      setError('خطأ في الاتصال بالخادم')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    setDeleteId(null)
    load()
  }

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ color: '#e8f4ff', fontWeight: 800, fontSize: 26 }}>📱 إدارة المنتجات</h1>
        <button onClick={openAdd} className="btn-neon" style={{ fontSize: 14 }}>
          + إضافة منتج
        </button>
      </div>

      {/* Search */}
      <input
        className="input-dark"
        placeholder="🔍 البحث عن منتج..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ maxWidth: 400, marginBottom: 20 }}
      />

      {/* Products Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#7fa8c0' }}>جاري التحميل...</div>
      ) : (
        <div style={{ background: 'rgba(13,21,32,0.9)', border: '1px solid rgba(26,58,92,0.5)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="dark-table">
              <thead>
                <tr>
                  <th>الصورة</th>
                  <th>المنتج</th>
                  <th>السعر</th>
                  <th>المخزون</th>
                  <th>الحد الأدنى</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(product => {
                  const imgs = parseImages(product.images)
                  const stockStatus = getStockStatus(product.stock)
                  return (
                    <tr key={product.id}>
                      <td>
                        <div style={{
                          width: 50, height: 50, borderRadius: 8,
                          background: 'rgba(5,10,15,0.8)',
                          overflow: 'hidden', cursor: imgs[0] ? 'pointer' : 'default',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                          onClick={() => imgs[0] && setPreviewImg(imgs[0])}
                        >
                          {imgs[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imgs[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : <span style={{ fontSize: 20 }}>📱</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#e8f4ff', fontSize: 14 }}>{product.name}</div>
                        {product.description && (
                          <div style={{ color: '#7fa8c0', fontSize: 11, marginTop: 2 }}>
                            {product.description.slice(0, 40)}...
                          </div>
                        )}
                      </td>
                      <td style={{ color: '#00ff88', fontWeight: 700 }}>{formatCurrency(product.price)}</td>
                      <td style={{ color: stockStatus.color, fontWeight: 600 }}>
                        {product.stock} <span style={{ fontSize: 11 }}>({stockStatus.label})</span>
                      </td>
                      <td style={{ color: '#7fa8c0' }}>{product.minOrder}</td>
                      <td>
                        <span style={{
                          padding: '4px 10px', borderRadius: 50, fontSize: 11, fontWeight: 600,
                          background: product.isActive ? 'rgba(0,255,136,0.15)' : 'rgba(239,68,68,0.15)',
                          color: product.isActive ? '#00ff88' : '#ff6464',
                          border: `1px solid ${product.isActive ? 'rgba(0,255,136,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        }}>
                          {product.isActive ? 'نشط' : 'مخفي'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEdit(product)} style={{
                            background: 'rgba(0,212,255,0.15)',
                            border: '1px solid rgba(0,212,255,0.3)',
                            color: '#00d4ff', borderRadius: 6,
                            padding: '5px 10px', cursor: 'pointer', fontSize: 12,
                          }}>
                            ✏️ تعديل
                          </button>
                          <button onClick={() => setDeleteId(product.id)} style={{
                            background: 'rgba(239,68,68,0.15)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            color: '#ff6464', borderRadius: 6,
                            padding: '5px 10px', cursor: 'pointer', fontSize: 12,
                          }}>
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#7fa8c0' }}>لا توجد منتجات</div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box" style={{ maxWidth: 680 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ color: '#e8f4ff', fontWeight: 700, fontSize: 20 }}>
                {editProduct ? '✏️ تعديل المنتج' : '➕ إضافة منتج جديد'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{
                background: 'transparent', border: 'none', color: '#7fa8c0', fontSize: 24, cursor: 'pointer',
              }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Name */}
              <div>
                <label style={{ color: '#7fa8c0', fontSize: 13, display: 'block', marginBottom: 6 }}>اسم المنتج *</label>
                <input className="input-dark" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="اسم المنتج" />
              </div>

              {/* Description */}
              <div>
                <label style={{ color: '#7fa8c0', fontSize: 13, display: 'block', marginBottom: 6 }}>الوصف</label>
                <textarea className="input-dark" rows={3} value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="وصف المنتج..." style={{ resize: 'vertical' }} />
              </div>

              {/* Category */}
              {categories.length > 0 && (
                <div>
                  <label style={{ color: '#7fa8c0', fontSize: 13, display: 'block', marginBottom: 6 }}>القسم</label>
                  <select className="input-dark" value={form.categoryId}
                    onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}
                    style={{ cursor: 'pointer' }}>
                    <option value="">بدون قسم</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Price, Stock, MinOrder */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ color: '#7fa8c0', fontSize: 13, display: 'block', marginBottom: 6 }}>السعر (IQD) *</label>
                  <input className="input-dark" type="number" value={form.price}
                    onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label style={{ color: '#7fa8c0', fontSize: 13, display: 'block', marginBottom: 6 }}>الكمية في المخزون</label>
                  <input className="input-dark" type="number" value={form.stock}
                    onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label style={{ color: '#7fa8c0', fontSize: 13, display: 'block', marginBottom: 6 }}>الحد الأدنى للطلب</label>
                  <input className="input-dark" type="number" value={form.minOrder}
                    onChange={e => setForm(p => ({ ...p, minOrder: e.target.value }))} placeholder="1" min={1} />
                </div>
              </div>

              {/* Images */}
              <div>
                <label style={{ color: '#7fa8c0', fontSize: 13, display: 'block', marginBottom: 8 }}>الصور</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  {form.images.map((img, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" style={{
                        width: 80, height: 80, objectFit: 'cover', borderRadius: 8,
                        border: '1px solid rgba(26,58,92,0.5)',
                      }} />
                      <button onClick={() => setForm(p => ({ ...p, images: p.images.filter((_, idx) => idx !== i) }))}
                        style={{
                          position: 'absolute', top: -6, left: -6,
                          background: '#ef4444', border: 'none', color: 'white',
                          width: 20, height: 20, borderRadius: '50%', cursor: 'pointer', fontSize: 12,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>×</button>
                    </div>
                  ))}
                  <button onClick={() => fileRef.current?.click()} style={{
                    width: 80, height: 80,
                    background: 'rgba(0,255,136,0.08)', border: '2px dashed rgba(0,255,136,0.3)',
                    borderRadius: 8, cursor: 'pointer', color: '#00ff88',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4, fontSize: 12,
                  }}>
                    {uploading ? '⏳' : <>📷<span>رفع صورة</span></>}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" multiple hidden
                    onChange={e => e.target.files && handleUpload(e.target.files, 'image')} />
                </div>
              </div>

              {/* Video */}
              <div>
                <label style={{ color: '#7fa8c0', fontSize: 13, display: 'block', marginBottom: 6 }}>
                  فيديو (اختياري)
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input-dark" value={form.video} onChange={e => setForm(p => ({ ...p, video: e.target.value }))} placeholder="رابط الفيديو أو ارفع ملف" style={{ flex: 1 }} />
                  <button onClick={() => videoRef.current?.click()} style={{
                    background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
                    color: '#00d4ff', borderRadius: 8, padding: '0 14px', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap',
                  }}>
                    📹 رفع
                  </button>
                  <input ref={videoRef} type="file" accept="video/*" hidden
                    onChange={e => e.target.files && handleUpload(e.target.files, 'video')} />
                </div>
              </div>

              {/* Active toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ color: '#7fa8c0', fontSize: 13 }}>حالة المنتج:</label>
                <button onClick={() => setForm(p => ({ ...p, isActive: !p.isActive }))} style={{
                  padding: '6px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  background: form.isActive ? 'rgba(0,255,136,0.15)' : 'rgba(239,68,68,0.15)',
                  border: `1px solid ${form.isActive ? 'rgba(0,255,136,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  color: form.isActive ? '#00ff88' : '#ff6464',
                }}>
                  {form.isActive ? '✓ نشط' : '✗ مخفي'}
                </button>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={() => setShowModal(false)} className="btn-outline" style={{ fontSize: 14 }}>
                  إلغاء
                </button>
                <button onClick={handleSave} disabled={saving || !form.name || !form.price} className="btn-neon" style={{ fontSize: 14, opacity: (saving || !form.name || !form.price) ? 0.7 : 1 }}>
                  {saving ? 'جاري الحفظ...' : editProduct ? 'حفظ التعديلات' : 'إضافة المنتج'}
                </button>
              </div>
              {error && (
                <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(255,59,48,0.12)', border: '1px solid rgba(255,59,48,0.3)', borderRadius: 8, color: '#ff6b6b', fontSize: 13, textAlign: 'center' }}>
                  ⚠️ {error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🗑️</div>
            <h3 style={{ color: '#ff6464', fontWeight: 700, fontSize: 20, marginBottom: 10 }}>حذف المنتج</h3>
            <p style={{ color: '#7fa8c0', marginBottom: 24 }}>هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setDeleteId(null)} className="btn-outline" style={{ fontSize: 14 }}>إلغاء</button>
              <button onClick={() => handleDelete(deleteId)} style={{
                background: '#ef4444', border: 'none', color: 'white',
                padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600,
              }}>
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview */}
      {previewImg && (
        <div className="modal-overlay" onClick={() => setPreviewImg(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewImg} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12 }} />
        </div>
      )}
    </div>
  )
}
