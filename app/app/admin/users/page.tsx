'use client'

import { useState, useEffect } from 'react'

interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  isActive: boolean
  createdAt: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'customer' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(d => setUsers(d.users || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'فشل الإنشاء')
        return
      }
      setShowModal(false)
      setForm({ name: '', email: '', password: '', phone: '', role: 'customer' })
      load()
    } catch {
      setError('حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: '#e8f4ff', fontWeight: 800, fontSize: 26 }}>👥 إدارة المستخدمين</h1>
        <button onClick={() => setShowModal(true)} className="btn-neon" style={{ fontSize: 14 }}>
          + إضافة مستخدم
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#7fa8c0' }}>جاري التحميل...</div>
      ) : (
        <div style={{ background: 'rgba(13,21,32,0.9)', border: '1px solid rgba(26,58,92,0.5)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="dark-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>البريد الإلكتروني</th>
                  <th>الهاتف</th>
                  <th>الدور</th>
                  <th>تاريخ الانضمام</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 600 }}>{user.name}</td>
                    <td style={{ color: '#7fa8c0', fontFamily: 'monospace', fontSize: 12 }}>{user.email}</td>
                    <td style={{ color: '#7fa8c0' }}>{user.phone || '—'}</td>
                    <td>
                      <span style={{
                        padding: '3px 10px', borderRadius: 50, fontSize: 11, fontWeight: 600,
                        background: user.role === 'admin' ? 'rgba(0,212,255,0.15)' : 'rgba(0,255,136,0.15)',
                        color: user.role === 'admin' ? '#00d4ff' : '#00ff88',
                        border: `1px solid ${user.role === 'admin' ? 'rgba(0,212,255,0.3)' : 'rgba(0,255,136,0.3)'}`,
                      }}>
                        {user.role === 'admin' ? 'مدير' : 'عميل'}
                      </span>
                    </td>
                    <td style={{ color: '#7fa8c0', fontSize: 12 }}>
                      {new Date(user.createdAt).toLocaleDateString('ar-IQ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#7fa8c0' }}>لا يوجد مستخدمون</div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box" style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ color: '#e8f4ff', fontWeight: 700, fontSize: 20 }}>➕ إضافة مستخدم</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#7fa8c0', fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { key: 'name', label: 'الاسم', type: 'text', placeholder: 'الاسم الكامل' },
                { key: 'email', label: 'البريد الإلكتروني', type: 'email', placeholder: 'email@example.com' },
                { key: 'phone', label: 'الهاتف', type: 'tel', placeholder: '07XXXXXXXX' },
                { key: 'password', label: 'كلمة المرور', type: 'password', placeholder: '••••••••' },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key}>
                  <label style={{ color: '#7fa8c0', fontSize: 13, display: 'block', marginBottom: 6 }}>{label}</label>
                  <input type={type} className="input-dark" value={form[key as keyof typeof form]}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder} required={key !== 'phone'}
                    dir={key === 'email' ? 'ltr' : undefined}
                  />
                </div>
              ))}
              <div>
                <label style={{ color: '#7fa8c0', fontSize: 13, display: 'block', marginBottom: 6 }}>الدور</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={{
                  background: 'rgba(13,21,32,0.9)', border: '1px solid rgba(26,58,92,0.5)',
                  color: '#e8f4ff', padding: '10px 14px', borderRadius: 8, width: '100%',
                }}>
                  <option value="customer">عميل</option>
                  <option value="admin">مدير</option>
                </select>
              </div>
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#ff6464', fontSize: 13 }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowModal(false)} className="btn-outline" style={{ fontSize: 14 }}>إلغاء</button>
                <button onClick={handleCreate} disabled={saving} className="btn-neon" style={{ fontSize: 14, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'جاري الإنشاء...' : 'إنشاء المستخدم'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
