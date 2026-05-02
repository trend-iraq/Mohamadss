'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'

interface Stats {
  totalRevenue: number
  totalOrders: number
  topProducts: { name: string; quantity: number; revenue: number }[]
  salesChart: { date: string; amount: number }[]
  allTime: { orders: number; revenue: number }
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [period, setPeriod] = useState('monthly')
  const [products, setProducts] = useState<{ id: string; name: string; stock: number }[]>([])
  const [orders, setOrders] = useState<{ id: string; status: string; total: number; createdAt: string; customerName?: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/reports?period=${period}`).then(r => r.json()),
      fetch('/api/products?admin=true').then(r => r.json()),
      fetch('/api/orders?admin=true').then(r => r.json()),
    ]).then(([r, p, o]) => {
      setStats(r)
      setProducts((p.products || []).sort((a: { stock: number }, b: { stock: number }) => a.stock - b.stock).slice(0, 5))
      setOrders((o.orders || []).slice(0, 5))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [period])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#7fa8c0' }}>
      <p>جاري تحميل البيانات...</p>
    </div>
  )

  const statCards = [
    { label: 'الإيرادات (هذه الفترة)', value: formatCurrency(stats?.totalRevenue || 0), icon: '💰', color: '#00ff88' },
    { label: 'الطلبات (هذه الفترة)', value: String(stats?.totalOrders || 0), icon: '📦', color: '#00d4ff' },
    { label: 'إجمالي الإيرادات', value: formatCurrency(stats?.allTime.revenue || 0), icon: '📊', color: '#f59e0b' },
    { label: 'إجمالي الطلبات', value: String(stats?.allTime.orders || 0), icon: '🛒', color: '#a78bfa' },
  ]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ color: '#e8f4ff', fontWeight: 800, fontSize: 26 }}>📊 لوحة التحكم</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {['daily', 'weekly', 'monthly'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: period === p ? 'rgba(0,255,136,0.2)' : 'transparent',
              border: `1px solid ${period === p ? '#00ff88' : 'rgba(26,58,92,0.5)'}`,
              color: period === p ? '#00ff88' : '#7fa8c0',
            }}>
              {p === 'daily' ? 'يومي' : p === 'weekly' ? 'أسبوعي' : 'شهري'}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        {statCards.map(({ label, value, icon, color }) => (
          <div key={label} style={{
            background: 'rgba(13,21,32,0.9)',
            border: `1px solid ${color}33`,
            borderRadius: 16, padding: '20px 20px',
            transition: 'all 0.3s',
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>
            <div style={{ color, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>{value}</div>
            <div style={{ color: '#7fa8c0', fontSize: 12 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
        {/* Low Stock Alert */}
        <div style={{
          background: 'rgba(13,21,32,0.9)',
          border: '1px solid rgba(26,58,92,0.5)',
          borderRadius: 16, padding: 20,
        }}>
          <h2 style={{ color: '#f59e0b', fontWeight: 700, fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            ⚠️ تنبيه المخزون المنخفض
          </h2>
          {products.length === 0 ? (
            <p style={{ color: '#7fa8c0', fontSize: 13 }}>جميع المنتجات لديها مخزون كافٍ</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {products.map(p => (
                <div key={p.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px',
                  background: 'rgba(5,10,15,0.5)',
                  borderRadius: 8, fontSize: 13,
                }}>
                  <span style={{ color: '#e8f4ff' }}>{p.name}</span>
                  <span style={{
                    color: p.stock === 0 ? '#ef4444' : '#f59e0b',
                    fontWeight: 700,
                  }}>
                    {p.stock === 0 ? 'نفذ' : `${p.stock} قطعة`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Products */}
        <div style={{
          background: 'rgba(13,21,32,0.9)',
          border: '1px solid rgba(26,58,92,0.5)',
          borderRadius: 16, padding: 20,
        }}>
          <h2 style={{ color: '#00d4ff', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
            🏆 أكثر المنتجات مبيعاً
          </h2>
          {!stats?.topProducts || stats.topProducts.length === 0 ? (
            <p style={{ color: '#7fa8c0', fontSize: 13 }}>لا توجد مبيعات في هذه الفترة</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.topProducts.map((p, i) => (
                <div key={p.name} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px', background: 'rgba(5,10,15,0.5)', borderRadius: 8, fontSize: 13,
                }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: '#00d4ff', fontWeight: 700, width: 16 }}>#{i + 1}</span>
                    <span style={{ color: '#e8f4ff' }}>{p.name}</span>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ color: '#00ff88', fontWeight: 700 }}>{p.quantity} قطعة</div>
                    <div style={{ color: '#7fa8c0', fontSize: 11 }}>{formatCurrency(p.revenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div style={{
          background: 'rgba(13,21,32,0.9)',
          border: '1px solid rgba(26,58,92,0.5)',
          borderRadius: 16, padding: 20,
          gridColumn: '1 / -1',
        }}>
          <h2 style={{ color: '#00ff88', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
            📋 أحدث الطلبات
          </h2>
          {orders.length === 0 ? (
            <p style={{ color: '#7fa8c0', fontSize: 13 }}>لا توجد طلبات</p>
          ) : (
            <table className="dark-table">
              <thead>
                <tr>
                  <th>رقم الطلب</th>
                  <th>العميل</th>
                  <th>الإجمالي</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>#{order.id.slice(-8).toUpperCase()}</td>
                    <td>{order.customerName || 'غير محدد'}</td>
                    <td style={{ color: '#00ff88', fontWeight: 700 }}>{formatCurrency(order.total)}</td>
                    <td>
                      <span style={{
                        padding: '3px 10px', borderRadius: 50, fontSize: 11, fontWeight: 600,
                        background: order.status === 'delivered' ? 'rgba(0,255,136,0.15)' :
                          order.status === 'processing' ? 'rgba(245,158,11,0.15)' : 'rgba(0,212,255,0.15)',
                        color: order.status === 'delivered' ? '#00ff88' :
                          order.status === 'processing' ? '#f59e0b' : '#00d4ff',
                        border: `1px solid ${order.status === 'delivered' ? 'rgba(0,255,136,0.3)' :
                          order.status === 'processing' ? 'rgba(245,158,11,0.3)' : 'rgba(0,212,255,0.3)'}`,
                      }}>
                        {order.status === 'new' ? 'جديد' : order.status === 'processing' ? 'قيد المعالجة' : 'تم التسليم'}
                      </span>
                    </td>
                    <td style={{ color: '#7fa8c0', fontSize: 12 }}>
                      {new Date(order.createdAt).toLocaleDateString('ar-IQ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
