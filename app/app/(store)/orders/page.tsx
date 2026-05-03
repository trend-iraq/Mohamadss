'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { formatCurrency, getOrderStatusLabel, getOrderStatusColor } from '@/lib/utils'

interface OrderItem {
  id: string
  quantity: number
  price: number
  product: { name: string }
}
interface Order {
  id: string
  status: string
  total: number
  createdAt: string
  notes: string
  items: OrderItem[]
}

export default function OrdersPage() {
  const { user, loadingUser } = useApp()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Order | null>(null)

  useEffect(() => {
    if (!loadingUser && !user) {
      router.push('/login')
      return
    }
    if (user) {
      fetch('/api/orders')
        .then(r => r.json())
        .then(d => setOrders(d.orders || []))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [user, loadingUser, router])

  const printInvoice = (order: Order) => {
    const win = window.open('', '_blank')
    if (!win) return
    const items = order.items.map(i =>
      `<tr>
        <td style="padding:10px;border-bottom:1px solid #eee">${i.product.name}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:center">${i.price.toLocaleString()} د.ع</td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:center">${(i.price * i.quantity).toLocaleString()} د.ع</td>
      </tr>`
    ).join('')

    win.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة - المجمع الصيني</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #00aa66; padding-bottom: 20px; }
          .header h1 { color: #00aa66; font-size: 28px; margin: 0; }
          .header p { color: #666; margin: 4px 0; }
          .info { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .info div { font-size: 13px; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #00aa66; color: white; padding: 10px; text-align: right; }
          .total-row { background: #f0fff8; font-weight: bold; font-size: 16px; }
          .total-row td { padding: 14px 10px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>المجمع الصيني للاكسسوارات</h1>
          <p>📍 بغداد - الصنك - قرب ساحة الخيلاني</p>
        </div>
        <div class="info">
          <div>
            <strong>رقم الفاتورة:</strong> ${order.id.slice(-8).toUpperCase()}<br>
            <strong>حالة الطلب:</strong> ${getOrderStatusLabel(order.status)}
          </div>
          <div style="text-align:left">
            <strong>التاريخ:</strong> ${new Date(order.createdAt).toLocaleDateString('ar-IQ')}<br>
            ${order.notes ? `<strong>ملاحظات:</strong> ${order.notes}` : ''}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>المنتج</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>${items}</tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="3" style="text-align:right;padding:14px 10px">المجموع الكلي</td>
              <td style="color:#00aa66;text-align:center;padding:14px 10px">${order.total.toLocaleString()} د.ع</td>
            </tr>
          </tfoot>
        </table>
        <div style="text-align:center;margin-top:30px">
          <button onclick="window.print()" style="background:#00aa66;color:white;border:none;padding:12px 30px;border-radius:8px;font-size:16px;cursor:pointer">
            🖨 طباعة الفاتورة
          </button>
        </div>
      </body>
      </html>
    `)
    win.document.close()
  }

  if (loading || loadingUser) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7fa8c0' }}>
        <p>جاري تحميل الطلبات...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ color: '#e8f4ff', fontWeight: 800, fontSize: 28, marginBottom: 24 }}>
        📦 طلباتي
      </h1>

      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#7fa8c0' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>📭</div>
          <p>لا توجد طلبات بعد</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.map(order => (
            <div key={order.id} style={{
              background: 'rgba(13,21,32,0.9)',
              border: '1px solid rgba(26,58,92,0.5)',
              borderRadius: 14, padding: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                <div>
                  <p style={{ color: '#7fa8c0', fontSize: 12, marginBottom: 2 }}>
                    {new Date(order.createdAt).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <p style={{ color: '#e8f4ff', fontWeight: 700, fontSize: 15 }}>
                    طلب #{order.id.slice(-8).toUpperCase()}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`badge ${getOrderStatusColor(order.status)}`}>
                    {getOrderStatusLabel(order.status)}
                  </span>
                  <span style={{ color: '#00ff88', fontWeight: 800, fontSize: 16 }}>
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setSelected(selected?.id === order.id ? null : order)}
                  className="btn-outline"
                  style={{ fontSize: 13, padding: '6px 14px' }}
                >
                  {selected?.id === order.id ? 'إخفاء التفاصيل' : 'التفاصيل'}
                </button>
                <button
                  onClick={() => printInvoice(order)}
                  style={{
                    background: 'rgba(0,212,255,0.1)',
                    border: '1px solid rgba(0,212,255,0.3)',
                    color: '#00d4ff',
                    padding: '6px 14px', borderRadius: 8,
                    cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  }}
                >
                  🖨 طباعة الفاتورة
                </button>
              </div>

              {selected?.id === order.id && (
                <div style={{ marginTop: 14, borderTop: '1px solid rgba(26,58,92,0.4)', paddingTop: 14 }}>
                  <table className="dark-table">
                    <thead>
                      <tr>
                        <th>المنتج</th>
                        <th style={{ textAlign: 'center' }}>الكمية</th>
                        <th style={{ textAlign: 'center' }}>سعر الوحدة</th>
                        <th style={{ textAlign: 'center' }}>الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map(item => (
                        <tr key={item.id}>
                          <td>{item.product.name}</td>
                          <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ textAlign: 'center' }}>{formatCurrency(item.price)}</td>
                          <td style={{ textAlign: 'center', color: '#00ff88', fontWeight: 700 }}>
                            {formatCurrency(item.price * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
