'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
}

const NAV = [
  { href: '/admin', label: 'الرئيسية', icon: '📊' },
  { href: '/admin/products', label: 'المنتجات', icon: '📱' },
  { href: '/admin/orders', label: 'الطلبات', icon: '📦' },
  { href: '/admin/inventory', label: 'المخزون', icon: '🗃️' },
  { href: '/admin/reports', label: 'التقارير', icon: '📈' },
  { href: '/admin/users', label: 'المستخدمون', icon: '👥' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (!d.user || d.user.role !== 'admin') {
          router.push('/login')
        } else {
          setUser(d.user)
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#050a0f', color: '#00ff88',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
          <p>جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const Sidebar = () => (
    <div style={{
      width: 240, flexShrink: 0,
      background: 'rgba(13, 21, 32, 0.98)',
      borderLeft: '1px solid rgba(26, 58, 92, 0.5)',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid rgba(26, 58, 92, 0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40,
            background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
            borderRadius: 10, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#050a0f',
          }}>M</div>
          <div>
            <div style={{ color: '#00ff88', fontWeight: 800, fontSize: 14 }}>محمد SS</div>
            <div style={{ color: '#7fa8c0', fontSize: 11 }}>لوحة التحكم</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {NAV.map(({ href, label, icon }) => {
          const isActive = pathname === href
          return (
            <Link key={href} href={href} className={`sidebar-item ${isActive ? 'active' : ''}`}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User & Logout */}
      <div style={{
        padding: '16px', borderTop: '1px solid rgba(26, 58, 92, 0.5)',
      }}>
        <p style={{ color: '#e8f4ff', fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{user.name}</p>
        <p style={{ color: '#7fa8c0', fontSize: 11, marginBottom: 12 }}>{user.email}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/store" style={{
            flex: 1, textAlign: 'center',
            background: 'rgba(0,255,136,0.1)',
            border: '1px solid rgba(0,255,136,0.3)',
            color: '#00ff88', borderRadius: 8,
            padding: '7px 0', fontSize: 12, textDecoration: 'none',
          }}>
            المتجر
          </Link>
          <button onClick={logout} style={{
            flex: 1,
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#ff6464', borderRadius: 8,
            cursor: 'pointer', fontSize: 12,
          }}>
            خروج
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: '#050a0f',
      flexDirection: 'row-reverse',
    }}>
      {/* Mobile header */}
      <div style={{
        display: 'none',
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(13,21,32,0.98)',
        borderBottom: '1px solid rgba(26,58,92,0.5)',
        padding: '12px 16px',
        alignItems: 'center', justifyContent: 'space-between',
      }} className="mobile-header">
        <span style={{ color: '#00ff88', fontWeight: 800 }}>محمد SS - لوحة التحكم</span>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
          background: 'transparent', border: 'none', color: '#00ff88', fontSize: 24, cursor: 'pointer',
        }}>☰</button>
      </div>

      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main style={{
        flex: 1, overflow: 'auto',
        padding: '24px',
        maxHeight: '100vh',
      }}>
        {children}
      </main>
    </div>
  )
}
