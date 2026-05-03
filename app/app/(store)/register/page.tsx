'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'

export default function RegisterPage() {
  const { setUser } = useApp()
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'خطأ في إنشاء الحساب')
        return
      }
      setUser(data.user)
      router.push('/store')
    } catch {
      setError('حدث خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      background: 'radial-gradient(ellipse at center, rgba(0,212,255,0.05) 0%, transparent 70%)',
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: 'rgba(13, 21, 32, 0.95)',
        border: '1px solid rgba(26, 58, 92, 0.7)',
        borderRadius: 20, padding: 36,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64,
            background: 'linear-gradient(135deg, #00d4ff, #00ff88)',
            borderRadius: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, margin: '0 auto 16px',
            fontWeight: 900, color: '#050a0f',
          }}>📝</div>
          <h1 style={{ color: '#e8f4ff', fontWeight: 800, fontSize: 22, marginBottom: 6 }}>
            إنشاء حساب جديد
          </h1>
          <p style={{ color: '#7fa8c0', fontSize: 13 }}>انضم إلى المجمع الصيني للاكسسوارات</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { key: 'name', label: 'الاسم الكامل', placeholder: 'اسمك الكامل', type: 'text' },
            { key: 'email', label: 'البريد الإلكتروني', placeholder: 'example@email.com', type: 'email' },
            { key: 'phone', label: 'رقم الهاتف', placeholder: '07XXXXXXXX', type: 'tel' },
            { key: 'password', label: 'كلمة المرور', placeholder: '••••••••', type: 'password' },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label style={{ color: '#7fa8c0', fontSize: 13, marginBottom: 6, display: 'block' }}>
                {label}
              </label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                required={key !== 'phone'}
                className="input-dark"
                dir={key === 'email' ? 'ltr' : undefined}
              />
            </div>
          ))}

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 8, padding: '10px 14px',
              color: '#ff6464', fontSize: 13, textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-neon"
            style={{ marginTop: 4, fontSize: 15, padding: '12px 24px', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'جاري الإنشاء...' : 'إنشاء حساب'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, color: '#7fa8c0', fontSize: 13 }}>
          لديك حساب بالفعل؟{' '}
          <Link href="/login" style={{ color: '#00ff88', fontWeight: 600, textDecoration: 'none' }}>
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  )
}
