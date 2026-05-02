'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

interface ReportsData {
  period: string
  totalRevenue: number
  totalOrders: number
  topProducts: { name: string; quantity: number; revenue: number }[]
  salesChart: { date: string; amount: number }[]
  allTime: { orders: number; revenue: number }
}

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null)
  const [period, setPeriod] = useState('monthly')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/reports?period=${period}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  const chartData = data?.salesChart.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric' }),
  })) || []

  const topProdData = data?.topProducts.map(p => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + '...' : p.name,
    كمية: p.quantity,
    إيراد: p.revenue,
  })) || []

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ color: '#e8f4ff', fontWeight: 800, fontSize: 26 }}>📈 التقارير والإحصائيات</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { value: 'daily', label: 'اليوم' },
            { value: 'weekly', label: 'الأسبوع' },
            { value: 'monthly', label: 'الشهر' },
          ].map(({ value, label }) => (
            <button key={value} onClick={() => setPeriod(value)} style={{
              padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: period === value ? 'rgba(0,255,136,0.2)' : 'transparent',
              border: `1px solid ${period === value ? '#00ff88' : 'rgba(26,58,92,0.5)'}`,
              color: period === value ? '#00ff88' : '#7fa8c0',
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#7fa8c0' }}>جاري تحميل التقارير...</div>
      ) : !data ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#7fa8c0' }}>لا توجد بيانات</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
            {[
              { label: `إيرادات ${period === 'daily' ? 'اليوم' : period === 'weekly' ? 'الأسبوع' : 'الشهر'}`, value: formatCurrency(data.totalRevenue), icon: '💰', color: '#00ff88' },
              { label: 'طلبات الفترة', value: String(data.totalOrders), icon: '📦', color: '#00d4ff' },
              { label: 'إجمالي الإيرادات', value: formatCurrency(data.allTime.revenue), icon: '🏦', color: '#f59e0b' },
              { label: 'إجمالي الطلبات', value: String(data.allTime.orders), icon: '🛒', color: '#a78bfa' },
            ].map(({ label, value, icon, color }) => (
              <div key={label} style={{
                background: 'rgba(13,21,32,0.9)',
                border: `1px solid ${color}33`,
                borderRadius: 14, padding: 20,
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
                <div style={{ color, fontWeight: 800, fontSize: 18, marginBottom: 4 }}>{value}</div>
                <div style={{ color: '#7fa8c0', fontSize: 12 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Sales Chart */}
          {chartData.length > 0 && (
            <div style={{ background: 'rgba(13,21,32,0.9)', border: '1px solid rgba(26,58,92,0.5)', borderRadius: 16, padding: 24 }}>
              <h2 style={{ color: '#00ff88', fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
                📊 مخطط المبيعات
              </h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,92,0.4)" />
                  <XAxis dataKey="date" tick={{ fill: '#7fa8c0', fontSize: 11 }} axisLine={{ stroke: 'rgba(26,58,92,0.5)' }} />
                  <YAxis tick={{ fill: '#7fa8c0', fontSize: 11 }} axisLine={{ stroke: 'rgba(26,58,92,0.5)' }}
                    tickFormatter={(v: number) => (v / 1000).toFixed(0) + 'K'} />
                  <Tooltip
                    contentStyle={{ background: '#0d1520', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 8, color: '#e8f4ff' }}
                    formatter={(v) => [formatCurrency(Number(v)), 'الإيرادات']}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#00ff88" strokeWidth={2} dot={{ fill: '#00ff88', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Products Chart */}
          {topProdData.length > 0 && (
            <div style={{ background: 'rgba(13,21,32,0.9)', border: '1px solid rgba(26,58,92,0.5)', borderRadius: 16, padding: 24 }}>
              <h2 style={{ color: '#00d4ff', fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
                🏆 أكثر المنتجات مبيعاً
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topProdData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,92,0.4)" />
                  <XAxis type="number" tick={{ fill: '#7fa8c0', fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#e8f4ff', fontSize: 11 }} width={100} />
                  <Tooltip contentStyle={{ background: '#0d1520', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 8, color: '#e8f4ff' }} />
                  <Bar dataKey="كمية" fill="#00d4ff" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>

              {/* Table */}
              <div style={{ marginTop: 20 }}>
                <table className="dark-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>المنتج</th>
                      <th style={{ textAlign: 'center' }}>الكمية المباعة</th>
                      <th style={{ textAlign: 'center' }}>الإيراد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProducts.map((p, i) => (
                      <tr key={p.name}>
                        <td style={{ color: '#00d4ff', fontWeight: 700 }}>{i + 1}</td>
                        <td>{p.name}</td>
                        <td style={{ textAlign: 'center', color: '#00d4ff', fontWeight: 700 }}>{p.quantity}</td>
                        <td style={{ textAlign: 'center', color: '#00ff88', fontWeight: 700 }}>{formatCurrency(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.totalOrders === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#7fa8c0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
              <p>لا توجد بيانات مبيعات في هذه الفترة</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
