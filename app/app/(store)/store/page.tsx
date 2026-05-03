'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { formatCurrency, parseImages, getStockStatus } from '@/lib/utils'

interface Product {
  id: string
  name: string
  description: string
  price: number
  stock: number
  minOrder: number
  images: string
  isActive: boolean
}

export default function StorePage() {
  const { addToCart, user } = useApp()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [added, setAdded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(d => setProducts(d.products || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = (product: Product) => {
    const imgs = parseImages(product.images)
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: imgs[0] || '',
      stock: product.stock,
    })
    setAdded(product.id)
    setTimeout(() => setAdded(null), 1500)
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,255,136,0.08) 0%, rgba(0,212,255,0.05) 100%)',
        borderBottom: '1px solid rgba(0,255,136,0.1)',
        padding: '48px 16px 32px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(0,255,136,0.1)',
            border: '1px solid rgba(0,255,136,0.3)',
            borderRadius: 50, padding: '6px 16px',
            color: '#00ff88', fontSize: 13, marginBottom: 16
          }}>
            📍 بغداد - السنك - مقابل أمانة بغداد
          </div>
          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 48px)',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 12,
            lineHeight: 1.3,
          }}>
            المجمع الصيني للاكسسوارات
          </h1>
          <p style={{ color: '#7fa8c0', fontSize: 15, marginBottom: 28 }}>
            إكسسوارات الهواتف المحمولة بأفضل أسعار الجملة في العراق
          </p>

          {/* Search */}
          <div style={{ position: 'relative', maxWidth: 480, margin: '0 auto' }}>
            <input
              type="text"
              placeholder="🔍 ابحث عن منتج..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-dark"
              style={{ paddingRight: 48, fontSize: 15 }}
            />
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#7fa8c0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <p>جاري تحميل المنتجات...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#7fa8c0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
            <p>لا توجد منتجات</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
            gap: 16,
          }}>
            {filtered.map(product => {
              const imgs = parseImages(product.images)
              const stock = getStockStatus(product.stock)
              const isAdded = added === product.id
              return (
                <div key={product.id} className="product-card animate-fade-in">
                  {/* Image */}
                  <div style={{
                    aspectRatio: '4/3',
                    background: 'rgba(13, 21, 32, 0.8)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {imgs[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imgs[0]}
                        alt={product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '100%', height: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 48, color: '#1a3a5c',
                      }}>
                        📱
                      </div>
                    )}
                    {/* Stock badge */}
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      background: 'rgba(5, 10, 15, 0.85)',
                      border: `1px solid ${product.stock === 0 ? '#ef4444' : product.stock <= 10 ? '#f59e0b' : '#00ff88'}`,
                      borderRadius: 6,
                      padding: '3px 8px',
                      fontSize: 11,
                      color: product.stock === 0 ? '#ef4444' : product.stock <= 10 ? '#f59e0b' : '#00ff88',
                      fontWeight: 600,
                    }}>
                      {stock.label}
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ padding: 16 }}>
                    <h3 style={{
                      color: '#e8f4ff', fontWeight: 700, fontSize: 15,
                      marginBottom: 6, lineHeight: 1.4,
                    }}>
                      {product.name}
                    </h3>
                    {product.description && (
                      <p style={{
                        color: '#7fa8c0', fontSize: 12, marginBottom: 10,
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>
                        {product.description}
                      </p>
                    )}

                    {/* Price & Stock */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div>
                        {user ? (
                          <span style={{ color: '#00ff88', fontWeight: 800, fontSize: 17 }}>
                            {formatCurrency(product.price)}
                          </span>
                        ) : (
                          <span style={{ color: '#7fa8c0', fontSize: 12 }}>
                            سجل الدخول لرؤية السعر
                          </span>
                        )}
                      </div>
                      <span style={{ color: '#7fa8c0', fontSize: 12 }}>
                        المخزون: {product.stock}
                      </span>
                    </div>


                    <button
                      onClick={() => handleAdd(product)}
                      disabled={product.stock === 0}
                      className="btn-neon"
                      style={{
                        width: '100%',
                        opacity: product.stock === 0 ? 0.5 : 1,
                        background: isAdded
                          ? 'linear-gradient(135deg, #00d4ff, #00ff88)'
                          : undefined,
                        transition: 'all 0.3s',
                      }}
                    >
                      {product.stock === 0 ? '🚫 نفذ المخزون' : isAdded ? '✓ تمت الإضافة' : '🛒 أضف إلى السلة'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
