'use client'

import { useState, useEffect } from 'react'
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
  notes?: string
  customerName?: string
  customerPhone?: string
  user?: { name: string; email: string; phone: string }
  items: OrderItem[]
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Order | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/orders?admin=true')
      .then(r => r.json())
      .then(d => setOrders(d.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id)
    await fetch(`/api/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setUpdating(null)
    load()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/orders/${id}`, { method: 'DELETE' })
    setDeleteId(null)
    setSelected(null)
    load()
  }

  const printInvoice = (order: Order) => {
    const win = window.open('', '_blank')
    if (!win) return
    const customerName = order.user?.name || order.customerName || 'غير محدد'
    const customerPhone = order.user?.phone || order.customerPhone || 'غير محدد'

    const rows = order.items.map(item => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #eee">${item.product.name}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:center">${item.price.toLocaleString()} د.ع</td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;font-weight:bold;color:#00aa66">${(item.price * item.quantity).toLocaleString()} د.ع</td>
      </tr>
    `).join('')

    win.document.write(`
      <!DOCTYPE html><html lang="ar" dir="rtl">
      <head><meta charset="UTF-8"><title>فاتورة - محمد SS</title>
      <style>
        body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#333}
        .logo{text-align:center;margin-bottom:30px;padding-bottom:20px;border-bottom:3px solid #00aa66}
        .logo h1{color:#00aa66;font-size:30px;margin:0}
        .logo p{color:#666;font-size:13px;margin:4px 0}
        .info{display:flex;justify-content:space-between;margin-bottom:24px;font-size:13px}
        .info-box{background:#f8f8f8;padding:14px 18px;border-radius:8px;border:1px solid #ddd}
        table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px}
        th{background:#00aa66;color:white;padding:12px;text-align:right;font-size:13px}
        .total-row td{font-weight:bold;font-size:16px;padding:14px;background:#f0fff8}
        .footer{text-align:center;color:#888;font-size:12px;margin-top:30px;border-top:1px solid #eee;padding-top:20px}
        @media print{button{display:none!important}}
      </style></head>
      <body>
        <div class="logo">
          <h1>محمد SS - بيع الجملة</h1>
          <p>📍 بغداد - الصنك - قرب ساحة الخيلاني</p>
        </div>
        <div class="info">
          <div class="info-box">
            <strong>رقم الفاتورة:</strong> #${order.id.slice(-8).toUpperCase()}<br>
            <strong>التاريخ:</strong> ${new Date(order.createdAt).toLocaleDateString('ar-IQ')}<br>
            <strong>الحالة:</strong> ${getOrderStatusLabel(order.status)}
          </div>
          <div class="info-box">
            <strong>العميل:</strong> ${customerName}<br>
            <strong>الهاتف:</strong> ${customerPhone}
            ${order.notes ? `<br><strong>ملاحظات:</strong> ${order.notes}` : ''}
          </div>
        </div>
        <table>
          <thead><tr><th>المنتج</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="3" style="text-align:right;padding:14px">المجموع الكلي</td>
              <td style="color:#00aa66;text-align:center;padding:14px">${order.total.toLocaleString()} د.ع</td>
            </tr>
          </tfoot>
        </table>
        <div class="footer">شكراً لتعاملكم معنا - محمد SS</div>
        <div style="text-align:center;margin-top:20px">
          <button onclick="window.print()" style="background:#00aa66;color:white;border:none;padding:12px 30px;border-radius:8px;font-size:15px;cursor:pointer">
            🖨 طباعة الفاتورة
          </button>
        </div>
      </body></html>
    `)
    win.document.close()
  }

  const filtered = orders.filter(o => statusFilter === 'all' || o.status === statusFilter)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ color: '#e8f4ff', fontWeight: 800, fontSize: 26 }}>📦 إدارة الطلبات</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'new', 'processing', 'delivered', 'cancelled'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: statusFilter === s ? 'rgba(0,255,136,0.2)' : 'transparent',
              border: `1px solid ${statusFilter === s ? '#00ff88' : 'rgba(26,58,92,0.5)'}`,
              color: statusFilter === s ? '#00ff88' : '#7fa8c0',
            }}>
              {s === 'all' ? 'الكل' : getOrderStatusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#7fa8c0' }}>جاري التحميل...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(order => {
            const customerName = order.user?.name || order.customerName || 'غير محدد'
            const customerPhone = order.user?.phone || order.customerPhone || 'غير محدد'
            const isSelected = selected?.id === order.id
            return (
              <div key={order.id} style={{
                background: 'rgba(13,21,32,0.9)',
                border: `1px solid ${isSelected ? 'rgba(0,255,136,0.3)' : 'rgba(26,58,92,0.5)'}`,
                borderRadius: 14, padding: 20, transition: 'all 0.3s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: isSelected ? 16 : 0 }}>
                  <div>
                    <div style={{ color: '#7fa8c0', fontSize: 12, marginBottom: 2 }}>
                      {new Date(order.createdAt).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ color: '#e8f4ff', fontWeight: 700 }}>
                      #{order.id.slice(-8).toUpperCase()} — {customerName}
                      {customerPhone !== 'غير محدد' && <span style={{ color: '#7fa8c0', fontSize: 12, marginRight: 8 }}>📞 {customerPhone}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: '#00ff88', fontWeight: 800, fontSize: 16 }}>{formatCurrency(order.total)}</span>
                    <span className={`badge ${getOrderStatusColor(order.status)}`}>{getOrderStatusLabel(order.status)}</span>
                  </div>
                </div>

                {/* Status selector & actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                  <select
                    value={order.status}
                    onChange={e => updateStatus(order.id, e.target.value)}
                    disabled={updating === order.id}
                    style={{
                      background: 'rgba(13,21,32,0.9)', border: '1px solid rgba(26,58,92,0.5)',
                      color: '#e8f4ff', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                    }}
                  >
                    <option value="new">جديد</option>
                    <option value="processing">قيد المعالجة</option>
                    <option value="delivered">تم التسليم</option>
                    <option value="cancelled">ملغى</option>
                  </select>
                  <button onClick={() => setSelected(isSelected ? null : order)} style={{
                    background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
                    color: '#00d4ff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12,
                  }}>
                    {isSelected ? 'إخفاء' : 'التفاصيل'}
                  </button>
                  <button onClick={() => printInvoice(order)} style={{
                    background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)',
                    color: '#00ff88', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12,
                  }}>
                    🖨 طباعة
                  </button>
                  <button onClick={() => setDeleteId(order.id)} style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    color: '#ff6464', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12,
                  }}>
                    🗑 حذف
                  </button>
                </div>

                {/* Details */}
                {isSelected && (
                  <div style={{ marginTop: 16, borderTop: '1px solid rgba(26,58,92,0.4)', paddingTop: 16 }}>
                    {order.notes && (
                      <p style={{ color: '#7fa8c0', fontSize: 13, marginBottom: 12 }}>
                        📝 ملاحظات: {order.notes}
                      </p>
                    )}
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
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'left', fontWeight: 700, color: '#e8f4ff', padding: '14px 16px' }}>
                            المجموع الكلي
                          </td>
                          <td style={{ textAlign: 'center', color: '#00ff88', fontWeight: 800, fontSize: 16, padding: '14px 16px' }}>
                            {formatCurrency(order.total)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: '#7fa8c0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <p>لا توجد طلبات</p>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🗑️</div>
            <h3 style={{ color: '#ff6464', fontWeight: 700, fontSize: 20, marginBottom: 10 }}>حذف الطلب</h3>
            <p style={{ color: '#7fa8c0', marginBottom: 24 }}>هل أنت متأكد من حذف هذا الطلب؟</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setDeleteId(null)} className="btn-outline">إلغاء</button>
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
    </div>
  )
}
