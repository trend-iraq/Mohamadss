'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

interface AdminUser { id: string; name: string; email: string; role: string }

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
        if (!d.user || d.user.role !== 'admin') router.push('/login')
        else setUser(d.user)
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050a0f', color: '#00ff88' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
        <p>جاري التحقق من الصلاحيات...</p>
      </div>
    </div>
  )

  if (!user) return null

  const sidebarContent = (
    <>
      {/* Logo */}
      <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(26,58,92,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#00ff88,#00d4ff)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#050a0f' }}>M</div>
          <div>
            <div style={{ color: '#00ff88', fontWeight: 800, fontSize: 14 }}>محمد SS</div>
            <div style={{ color: '#7fa8c0', fontSize: 11 }}>لوحة التحكم</div>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(false)} style={{ background: 'transparent', border: 'none', color: '#7fa8c0', fontSize: 22, cursor: 'pointer', display: 'none' }} className="sidebar-close">✕</button>
      </div>
      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {NAV.map(({ href, label, icon }) => (
          <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
            className={`sidebar-item ${pathname === href ? 'active' : ''}`}>
            <span style={{ fontSize: 18 }}>{icon}</span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      {/* User */}
      <div style={{ padding: 16, borderTop: '1px solid rgba(26,58,92,0.5)' }}>
        <p style={{ color: '#e8f4ff', fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{user.name}</p>
        <p style={{ color: '#7fa8c0', fontSize: 11, marginBottom: 12 }}>{user.email}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/store" style={{ flex: 1, textAlign: 'center', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88', borderRadius: 8, padding: '7px 0', fontSize: 12, textDecoration: 'none' }}>المتجر</Link>
          <button onClick={logout} style={{ flex: 1, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ff6464', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>خروج</button>
        </div>
      </div>
    </>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#050a0f', flexDirection: 'row-reverse' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200 }} />
      )}

      {/* Desktop Sidebar */}
      <div className="admin-sidebar" style={{
        width: 240, flexShrink: 0,
        background: 'rgba(13,21,32,0.98)',
        borderLeft: '1px solid rgba(26,58,92,0.5)',
        display: 'flex', flexDirection: 'column',
        height: '100vh', position: 'sticky', top: 0,
      }}>
        {sidebarContent}
      </div>

      {/* Mobile Sidebar Drawer */}
      <div className="admin-drawer" style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 260, zIndex: 300,
        background: 'rgba(13,21,32,0.99)',
        borderLeft: '1px solid rgba(26,58,92,0.5)',
        display: 'flex', flexDirection: 'column',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease',
      }}>
        <button onClick={() => setSidebarOpen(false)} style={{ position: 'absolute', top: 16, left: 16, background: 'transparent', border: 'none', color: '#7fa8c0', fontSize: 24, cursor: 'pointer', zIndex: 10 }}>✕</button>
        {sidebarContent}
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '100vh' }}>
        {/* Mobile Top Bar */}
        <div className="admin-topbar" style={{
          display: 'none', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'rgba(13,21,32,0.98)',
          borderBottom: '1px solid rgba(26,58,92,0.5)',
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'transparent', border: 'none', color: '#00ff88', fontSize: 26, cursor: 'pointer', lineHeight: 1 }}>☰</button>
          <span style={{ color: '#00ff88', fontWeight: 800, fontSize: 15 }}>محمد SS - لوحة التحكم</span>
          <Link href="/store" style={{ color: '#7fa8c0', fontSize: 12, textDecoration: 'none' }}>المتجر</Link>
        </div>

        <main style={{ flex: 1, overflow: 'auto', padding: '20px 16px' }}>
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="admin-bottom-nav" style={{
          display: 'none',
          background: 'rgba(13,21,32,0.98)',
          borderTop: '1px solid rgba(26,58,92,0.5)',
          padding: '8px 4px 12px',
          justifyContent: 'space-around', alignItems: 'center',
          position: 'sticky', bottom: 0,
        }}>
          {NAV.slice(0, 5).map(({ href, label, icon }) => (
            <Link key={href} href={href} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              textDecoration: 'none', padding: '4px 6px', borderRadius: 8,
              background: pathname === href ? 'rgba(0,255,136,0.1)' : 'transparent',
              minWidth: 52,
            }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span style={{ fontSize: 9, color: pathname === href ? '#00ff88' : '#7fa8c0', fontWeight: pathname === href ? 700 : 400 }}>{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
