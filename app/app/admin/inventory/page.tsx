'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, parseImages, getStockStatus } from '@/lib/utils'

interface Product {
  id: string
  name: string
  price: number
  stock: number
  minOrder: number
  images: string
}

export default function AdminInventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [stockValue, setStockValue] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')

  const load = () => {
    setLoading(true)
    fetch('/api/products?admin=true')
      .then(r => r.json())
      .then(d => {
        const prods = d.products || []
        setProducts(prods)
        const vals: Record<string, number> = {}
        prods.forEach((p: Product) => { vals[p.id] = p.stock })
        setStockValue(vals)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const saveStock = async (id: string) => {
    setSaving(id)
    await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: stockValue[id] }),
    })
    setSaving(null)
    setEditing(null)
    load()
  }

  const filtered = products.filter(p => {
    if (filter === 'out') return p.stock === 0
    if (filter === 'low') return p.stock > 0 && p.stock <= 10
    if (filter === 'ok') return p.stock > 10
    return true
  })

  const outOfStock = products.filter(p => p.stock === 0).length
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= 10).length
  const inStock = products.filter(p => p.stock > 10).length

  return (
    <div>
      <h1 style={{ color: '#e8f4ff', fontWeight: 800, fontSize: 26, marginBottom: 24 }}>🗃️ إدارة المخزون</h1>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'نفذ المخزون', count: outOfStock, color: '#ef4444', icon: '❌', key: 'out' },
          { label: 'مخزون منخفض', count: lowStock, color: '#f59e0b', icon: '⚠️', key: 'low' },
          { label: 'متوفر', count: inStock, color: '#00ff88', icon: '✅', key: 'ok' },
          { label: 'إجمالي المنتجات', count: products.length, color: '#00d4ff', icon: '📦', key: 'all' },
        ].map(({ label, count, color, icon, key }) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            background: filter === key ? `rgba(${color === '#ef4444' ? '239,68,68' : color === '#f59e0b' ? '245,158,11' : color === '#00ff88' ? '0,255,136' : '0,212,255'},0.15)` : 'rgba(13,21,32,0.9)',
            border: `1px solid ${filter === key ? color + '44' : 'rgba(26,58,92,0.5)'}`,
            borderRadius: 14, padding: '16px 14px',
            cursor: 'pointer', textAlign: 'right', transition: 'all 0.3s',
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
            <div style={{ color, fontWeight: 800, fontSize: 22 }}>{count}</div>
            <div style={{ color: '#7fa8c0', fontSize: 12 }}>{label}</div>
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#7fa8c0' }}>جاري التحميل...</div>
      ) : (
        <div style={{ background: 'rgba(13,21,32,0.9)', border: '1px solid rgba(26,58,92,0.5)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="dark-table">
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>السعر</th>
                  <th>الحد الأدنى</th>
                  <th style={{ textAlign: 'center' }}>المخزون الحالي</th>
                  <th style={{ textAlign: 'center' }}>الحالة</th>
                  <th style={{ textAlign: 'center' }}>تحديث المخزون</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(product => {
                  const imgs = parseImages(product.images)
                  const stockStatus = getStockStatus(product.stock)
                  const isEditing = editing === product.id
                  return (
                    <tr key={product.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 44, height: 44, borderRadius: 8, overflow: 'hidden',
                            background: 'rgba(5,10,15,0.8)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            {imgs[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={imgs[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : <span>📱</span>}
                          </div>
                          <span style={{ color: '#e8f4ff', fontWeight: 600, fontSize: 14 }}>{product.name}</span>
                        </div>
                      </td>
                      <td style={{ color: '#00ff88', fontWeight: 700 }}>{formatCurrency(product.price)}</td>
                      <td style={{ color: '#7fa8c0', textAlign: 'center' }}>{product.minOrder}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ color: stockStatus.color, fontWeight: 700, fontSize: 16 }}>{product.stock}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 50, fontSize: 11, fontWeight: 600,
                          background: product.stock === 0 ? 'rgba(239,68,68,0.15)' : product.stock <= 10 ? 'rgba(245,158,11,0.15)' : 'rgba(0,255,136,0.15)',
                          color: stockStatus.color,
                          border: `1px solid ${product.stock === 0 ? 'rgba(239,68,68,0.3)' : product.stock <= 10 ? 'rgba(245,158,11,0.3)' : 'rgba(0,255,136,0.3)'}`,
                        }}>
                          {stockStatus.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                            <input
                              type="number"
                              value={stockValue[product.id] ?? product.stock}
                              onChange={e => setStockValue(prev => ({ ...prev, [product.id]: Number(e.target.value) }))}
                              min={0}
                              style={{
                                width: 72, background: 'rgba(5,10,15,0.9)',
                                border: '1px solid rgba(0,255,136,0.4)',
                                color: '#e8f4ff', borderRadius: 6, padding: '5px 8px',
                                textAlign: 'center', outline: 'none', fontSize: 14,
                              }}
                            />
                            <button onClick={() => saveStock(product.id)} disabled={saving === product.id} style={{
                              background: '#00ff88', border: 'none', color: '#050a0f',
                              borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                            }}>
                              {saving === product.id ? '...' : '✓'}
                            </button>
                            <button onClick={() => { setEditing(null); setStockValue(prev => ({ ...prev, [product.id]: product.stock })) }} style={{
                              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                              color: '#ff6464', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 13,
                            }}>
                              ×
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setEditing(product.id)} style={{
                            background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
                            color: '#00d4ff', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12,
                          }}>
                            ✏️ تعديل
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#7fa8c0' }}>لا توجد منتجات في هذه الفئة</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
