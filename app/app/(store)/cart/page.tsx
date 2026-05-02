'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { formatCurrency } from '@/lib/utils'

export default function CartPage() {
  const { cart, cartTotal, updateQuantity, removeFromCart, clearCart, user } = useApp()
  const router = useRouter()
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [orderId, setOrderId] = useState('')

  const handleOrder = async () => {
    if (cart.length === 0) return
    if (!user && !customerName) {
      setError('يرجى إدخال اسمك أو تسجيل الدخول')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({ productId: i.productId, quantity: i.quantity })),
          customerName: user ? user.name : customerName,
          customerPhone,
          notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'فشل في إرسال الطلب')
        return
      }
      setOrderId(data.order.id)
      setSuccess(true)
      clearCart()
    } catch {
      setError('حدث خطأ في الاتصال')
    } finally {
      setSubmitting(false)
    }
  }

  const sendWhatsApp = () => {
    const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '9647700000000'
    const lines = [
      '🛒 *طلب جديد - محمد SS*',
      `👤 العميل: ${user?.name || customerName}`,
      `📞 الهاتف: ${customerPhone || 'غير محدد'}`,
      '',
      '*المنتجات:*',
      ...cart.map(i => `• ${i.name} × ${i.quantity} = ${formatCurrency(i.price * i.quantity)}`),
      '',
      `💰 *الإجمالي: ${formatCurrency(cartTotal)}*`,
      notes ? `\n📝 ملاحظات: ${notes}` : '',
    ].join('\n')
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(lines)}`, '_blank')
  }

  if (success) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        background: 'radial-gradient(ellipse at center, rgba(0,255,136,0.08) 0%, transparent 70%)',
      }}>
        <div style={{
          maxWidth: 480, width: '100%', textAlign: 'center',
          background: 'rgba(13,21,32,0.95)',
          border: '1px solid rgba(0,255,136,0.3)',
          borderRadius: 20, padding: 40,
          boxShadow: '0 0 40px rgba(0,255,136,0.1)',
        }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>✅</div>
          <h2 style={{ color: '#00ff88', fontWeight: 800, fontSize: 24, marginBottom: 12 }}>
            تم إرسال طلبك بنجاح!
          </h2>
          <p style={{ color: '#7fa8c0', marginBottom: 8 }}>رقم الطلب:</p>
          <p style={{
            color: '#00d4ff', fontWeight: 700, fontSize: 14,
            fontFamily: 'monospace', background: 'rgba(0,212,255,0.1)',
            padding: '8px 16px', borderRadius: 8, marginBottom: 24,
          }}>
            {orderId}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/store')}
              className="btn-neon"
            >
              العودة للمتجر
            </button>
            <button
              onClick={() => router.push('/orders')}
              className="btn-outline"
            >
              طلباتي
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (cart.length === 0) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}>
        <div style={{ textAlign: 'center', color: '#7fa8c0' }}>
          <div style={{ fontSize: 80, marginBottom: 20 }}>🛒</div>
          <h2 style={{ color: '#e8f4ff', fontWeight: 700, fontSize: 22, marginBottom: 12 }}>
            السلة فارغة
          </h2>
          <p style={{ marginBottom: 24 }}>لم تضف أي منتجات بعد</p>
          <button onClick={() => router.push('/store')} className="btn-neon">
            تصفح المنتجات
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ color: '#e8f4ff', fontWeight: 800, fontSize: 28, marginBottom: 28 }}>
        🛒 سلة الطلبات
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 24 }}>
        {/* Cart Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cart.map(item => (
            <div key={item.productId} style={{
              background: 'rgba(13,21,32,0.9)',
              border: '1px solid rgba(26,58,92,0.5)',
              borderRadius: 14, padding: 16,
              display: 'flex', gap: 16, alignItems: 'center',
              flexWrap: 'wrap',
            }}>
              {/* Image */}
              <div style={{
                width: 80, height: 80, borderRadius: 10,
                background: 'rgba(5,10,15,0.8)',
                overflow: 'hidden', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 32 }}>📱</span>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 140 }}>
                <h3 style={{ color: '#e8f4ff', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                  {item.name}
                </h3>
                <p style={{ color: '#00ff88', fontWeight: 700, fontSize: 15 }}>
                  {formatCurrency(item.price)} / قطعة
                </p>
              </div>

              {/* Quantity */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button className="qty-btn" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                  −
                </button>
                <span style={{ color: '#e8f4ff', fontWeight: 700, fontSize: 16, minWidth: 28, textAlign: 'center' }}>
                  {item.quantity}
                </span>
                <button className="qty-btn" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                  +
                </button>
              </div>

              {/* Total */}
              <div style={{ minWidth: 120, textAlign: 'left' }}>
                <div style={{ color: '#00d4ff', fontWeight: 800, fontSize: 15 }}>
                  {formatCurrency(item.price * item.quantity)}
                </div>
                <div style={{ color: '#7fa8c0', fontSize: 11 }}>
                  {item.quantity} × {formatCurrency(item.price)}
                </div>
              </div>

              {/* Remove */}
              <button
                onClick={() => removeFromCart(item.productId)}
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#ff6464', borderRadius: 8,
                  padding: '6px 12px', cursor: 'pointer', fontSize: 18,
                  transition: 'all 0.2s',
                }}
              >
                🗑
              </button>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div style={{
          background: 'rgba(13,21,32,0.9)',
          border: '1px solid rgba(26,58,92,0.5)',
          borderRadius: 16, padding: 24,
          height: 'fit-content',
          position: 'sticky', top: 80,
        }}>
          <h2 style={{ color: '#e8f4ff', fontWeight: 700, fontSize: 18, marginBottom: 20 }}>
            ملخص الطلب
          </h2>

          {/* Items summary */}
          <div style={{ borderBottom: '1px solid rgba(26,58,92,0.5)', paddingBottom: 16, marginBottom: 16 }}>
            {cart.map(item => (
              <div key={item.productId} style={{
                display: 'flex', justifyContent: 'space-between',
                marginBottom: 8, fontSize: 13, color: '#7fa8c0',
              }}>
                <span>{item.name} ×{item.quantity}</span>
                <span style={{ color: '#e8f4ff' }}>{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 18, fontWeight: 800, marginBottom: 20,
            color: '#00ff88',
          }}>
            <span>الإجمالي</span>
            <span>{formatCurrency(cartTotal)}</span>
          </div>

          {/* Customer info if not logged in */}
          {!user && (
            <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                className="input-dark"
                placeholder="اسمك الكامل *"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />
              <input
                className="input-dark"
                placeholder="رقم الهاتف"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                type="tel"
              />
            </div>
          )}

          <textarea
            className="input-dark"
            placeholder="ملاحظات إضافية (اختياري)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            style={{ marginBottom: 16, resize: 'none' }}
          />

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '10px 14px', color: '#ff6464',
              fontSize: 13, textAlign: 'center', marginBottom: 12,
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleOrder}
            disabled={submitting}
            className="btn-neon"
            style={{ width: '100%', marginBottom: 10, fontSize: 15, padding: '12px', opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? 'جاري الإرسال...' : '✅ تأكيد الطلب'}
          </button>

          <button
            onClick={sendWhatsApp}
            style={{
              width: '100%', padding: 12,
              background: 'rgba(37, 211, 102, 0.15)',
              border: '1px solid rgba(37, 211, 102, 0.4)',
              color: '#25d366', borderRadius: 8,
              cursor: 'pointer', fontSize: 14, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <span>📲</span>
            إرسال عبر واتساب
          </button>
        </div>
      </div>
    </div>
  )
}
