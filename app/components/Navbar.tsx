'use client'

import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

export default function Navbar() {
  const { user, cart, cartCount, cartTotal, logout } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav style={{
      background: 'rgba(13, 21, 32, 0.95)',
      borderBottom: '1px solid rgba(0, 255, 136, 0.2)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 40, height: 40,
              background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 900, color: '#050a0f'
            }}>M</div>
            <div>
              <div style={{ color: '#00ff88', fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>المجمع الصيني</div>
              <div style={{ color: '#7fa8c0', fontSize: 11 }}>اكسسوارات بالجملة</div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Link href="/" style={{ color: '#7fa8c0', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
              المنتجات
            </Link>
            <Link href="/about" style={{ color: '#7fa8c0', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
              من نحن
            </Link>
          </div>

          {/* Right Side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Cart */}
            <Link href="/cart" style={{
              position: 'relative',
              background: 'rgba(0, 255, 136, 0.1)',
              border: '1px solid rgba(0, 255, 136, 0.3)',
              borderRadius: 10,
              padding: '8px 14px',
              display: 'flex', alignItems: 'center', gap: 8,
              textDecoration: 'none',
              color: '#00ff88',
              fontSize: 14,
              fontWeight: 600,
              transition: 'all 0.3s',
            }}>
              <span>🛒</span>
              <span>{cartCount > 0 ? formatCurrency(cartTotal) : 'السلة'}</span>
              {cartCount > 0 && (
                <span style={{
                  position: 'absolute', top: -8, right: -8,
                  background: '#00ff88', color: '#050a0f',
                  borderRadius: '50%', width: 20, height: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 900,
                }}>
                  {cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {user.role === 'admin' && (
                  <Link href="/admin" style={{
                    background: 'rgba(0, 212, 255, 0.15)',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    color: '#00d4ff',
                    padding: '8px 14px',
                    borderRadius: 10,
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                  }}>
                    لوحة التحكم
                  </Link>
                )}
                <Link href="/orders" style={{
                  color: '#7fa8c0', textDecoration: 'none', fontSize: 13
                }}>
                  طلباتي
                </Link>
                <button
                  onClick={logout}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,100,100,0.4)',
                    color: '#ff6464',
                    padding: '7px 14px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  خروج
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <Link href="/login" style={{
                  color: '#00ff88',
                  border: '1px solid rgba(0, 255, 136, 0.4)',
                  padding: '7px 16px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                }}>
                  دخول
                </Link>
                <Link href="/register" style={{
                  background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                  color: '#050a0f',
                  padding: '7px 16px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                }}>
                  تسجيل
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
