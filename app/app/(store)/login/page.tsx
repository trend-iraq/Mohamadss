'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'

export default function LoginPage() {
  const { setUser } = useApp()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'خطأ في تسجيل الدخول')
        return
      }
      setUser(data.user)
      router.push(data.user.role === 'admin' ? '/admin' : '/store')
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
      background: 'radial-gradient(ellipse at center, rgba(0,255,136,0.05) 0%, transparent 70%)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'rgba(13, 21, 32, 0.95)',
        border: '1px solid rgba(26, 58, 92, 0.7)',
        borderRadius: 20,
        padding: 36,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64,
            background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
            borderRadius: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, margin: '0 auto 16px',
            fontWeight: 900, color: '#050a0f',
          }}>M</div>
          <h1 style={{ color: '#e8f4ff', fontWeight: 800, fontSize: 22, marginBottom: 6 }}>
            تسجيل الدخول
          </h1>
          <p style={{ color: '#7fa8c0', fontSize: 13 }}>المجمع الصيني للاكسسوارات</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ color: '#7fa8c0', fontSize: 13, marginBottom: 6, display: 'block' }}>
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              className="input-dark"
              dir="ltr"
              style={{ textAlign: 'left' }}
            />
          </div>
          <div>
            <label style={{ color: '#7fa8c0', fontSize: 13, marginBottom: 6, display: 'block' }}>
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="input-dark"
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 8, padding: '10px 14px',
              color: '#ff6464', fontSize: 13,
              textAlign: 'center',
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
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, color: '#7fa8c0', fontSize: 13 }}>
          ليس لديك حساب؟{' '}
          <Link href="/register" style={{ color: '#00ff88', fontWeight: 600, textDecoration: 'none' }}>
            إنشاء حساب
          </Link>
        </div>

        <div style={{
          marginTop: 20, padding: '12px 16px',
          background: 'rgba(0, 212, 255, 0.08)',
          border: '1px solid rgba(0, 212, 255, 0.2)',
          borderRadius: 10, fontSize: 12, color: '#7fa8c0',
          textAlign: 'center',
        }}>
          <strong style={{ color: '#00d4ff' }}>بيانات الأدمن للتجربة:</strong><br />
          admin@mohamadss.com / admin123
        </div>
      </div>
    </div>
  )
}
