'use client'

import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

export default function Navbar() {
  const { user, cartCount, cartTotal, logout } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <nav style={{
        background: 'rgba(13,21,32,0.97)',
        borderBottom: '1px solid rgba(0,255,136,0.15)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 58 }}>

          {/* Logo */}
          <Link href="/store" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{
              width: 36, height: 36,
              background: 'linear-gradient(135deg,#00ff88,#00d4ff)',
              borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 900, color: '#050a0f',
            }}>中</div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ color: '#00ff88', fontWeight: 800, fontSize: 13 }}>المجمع الصيني</div>
              <div style={{ color: '#7fa8c0', fontSize: 10 }}>اكسسوارات بالجملة</div>
            </div>
          </Link>

          {/* Cart + Hamburger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/cart" style={{
              position: 'relative',
              background: 'rgba(0,255,136,0.1)',
              border: '1px solid rgba(0,255,136,0.3)',
              borderRadius: 10, padding: cartCount > 0 ? '7px 12px' : '7px 14px',
              display: 'flex', alignItems: 'center', gap: 6,
              textDecoration: 'none', color: '#00ff88', fontSize: 13, fontWeight: 700,
            }}>
              <span>🛒</span>
              {cartCount > 0 && (
                <>
                  <span style={{ fontSize: 12 }}>{formatCurrency(cartTotal)}</span>
                  <span style={{
                    position: 'absolute', top: -7, right: -7,
                    background: '#00ff88', color: '#050a0f',
                    borderRadius: '50%', width: 18, height: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 900,
                  }}>{cartCount}</span>
                </>
              )}
            </Link>

            <button onClick={() => setMenuOpen(true)} style={{
              background: 'rgba(0,255,136,0.08)',
              border: '1px solid rgba(0,255,136,0.2)',
              borderRadius: 9, width: 40, height: 40,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 5, cursor: 'pointer', flexShrink: 0,
            }}>
              <span style={{ width: 18, height: 2, background: '#00ff88', borderRadius: 2, display: 'block' }} />
              <span style={{ width: 13, height: 2, background: '#00ff88', borderRadius: 2, display: 'block' }} />
              <span style={{ width: 18, height: 2, background: '#00ff88', borderRadius: 2, display: 'block' }} />
            </button>
          </div>
        </div>
      </nav>

      {/* Overlay */}
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 998,
        }} />
      )}

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 270, zIndex: 999,
        background: '#0d1520',
        borderLeft: '1px solid rgba(0,255,136,0.15)',
        transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-10px 0 40px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(26,58,92,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#00ff88,#00d4ff)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#050a0f' }}>中</div>
            <div>
              <div style={{ color: '#00ff88', fontWeight: 800, fontSize: 13 }}>المجمع الصيني</div>
              <div style={{ color: '#7fa8c0', fontSize: 10 }}>اكسسوارات بالجملة</div>
            </div>
          </div>
          <button onClick={() => setMenuOpen(false)} style={{ background: 'transparent', border: 'none', color: '#7fa8c0', fontSize: 24, cursor: 'pointer' }}>✕</button>
        </div>

        {/* User info */}
        {user && (
          <div style={{ padding: '12px 16px', background: 'rgba(0,255,136,0.05)', borderBottom: '1px solid rgba(26,58,92,0.4)' }}>
            <div style={{ color: '#e8f4ff', fontWeight: 700, fontSize: 14 }}>{user.name}</div>
            <div style={{ color: '#7fa8c0', fontSize: 11 }}>{user.email}</div>
          </div>
        )}

        {/* Nav links */}
        <div style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
          {[
            { href: '/store', label: 'المنتجات', icon: '📱' },
            { href: '/cart', label: 'السلة', icon: '🛒' },
            { href: '/orders', label: 'طلباتي', icon: '📦' },
            { href: '/about', label: 'من نحن', icon: 'ℹ️' },
          ].map(({ href, label, icon }) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 16px', borderRadius: 10,
              textDecoration: 'none', color: '#e8f4ff', fontSize: 15, fontWeight: 600,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(26,58,92,0.4)',
            }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              {label}
            </Link>
          ))}

          {user?.role === 'admin' && (
            <Link href="/admin" onClick={() => setMenuOpen(false)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 16px', borderRadius: 10,
              textDecoration: 'none', color: '#00d4ff', fontSize: 15, fontWeight: 700,
              background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)',
            }}>
              <span style={{ fontSize: 20 }}>⚙️</span>
              لوحة التحكم
            </Link>
          )}
        </div>

        {/* Auth */}
        <div style={{ padding: 16, borderTop: '1px solid rgba(26,58,92,0.5)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {user ? (
            <button onClick={() => { logout(); setMenuOpen(false) }} style={{
              width: '100%', padding: 13, borderRadius: 10, cursor: 'pointer',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#ff6464', fontSize: 15, fontWeight: 700,
            }}>
              تسجيل الخروج
            </button>
          ) : (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)} style={{
                display: 'block', textAlign: 'center', padding: 13, borderRadius: 10,
                textDecoration: 'none', border: '1px solid rgba(0,255,136,0.4)',
                color: '#00ff88', fontSize: 15, fontWeight: 700,
              }}>
                دخول
              </Link>
              <Link href="/register" onClick={() => setMenuOpen(false)} style={{
                display: 'block', textAlign: 'center', padding: 13, borderRadius: 10,
                textDecoration: 'none',
                background: 'linear-gradient(135deg,#00ff88,#00d4ff)',
                color: '#050a0f', fontSize: 15, fontWeight: 800,
              }}>
                تسجيل حساب جديد
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  )
}
