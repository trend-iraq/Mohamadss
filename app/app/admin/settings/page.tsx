'use client'

import { useState, useEffect } from 'react'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    whatsapp_number: '',
    store_name: '',
    store_address: '',
    store_phone: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        const s = d.settings || {}
        setSettings(prev => ({
          whatsapp_number: s.whatsapp_number ?? prev.whatsapp_number,
          store_name: s.store_name ?? 'المجمع الصيني للاكسسوارات',
          store_address: s.store_address ?? 'بغداد ساحة الوثبة مقابل أمانة بغداد',
          store_phone: s.store_phone ?? prev.store_phone,
        }))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        const d = await res.json()
        setSaveError(d.error || 'فشل الحفظ')
      }
    } catch {
      setSaveError('خطأ في الاتصال بالخادم')
    }
    setSaving(false)
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#7fa8c0' }}>جاري التحميل...</div>
  )

  const fields = [
    {
      key: 'whatsapp_number',
      label: 'رقم واتساب التواصل',
      placeholder: '9647XXXXXXXXX',
      icon: '💬',
      hint: 'رقم الواتساب مع رمز الدولة (بدون +). مثال: 9647801234567',
      dir: 'ltr' as const,
    },
    {
      key: 'store_phone',
      label: 'رقم هاتف المتجر',
      placeholder: '07XXXXXXXX',
      icon: '📞',
      hint: 'رقم الهاتف الذي يُعرض للعملاء',
      dir: 'ltr' as const,
    },
    {
      key: 'store_name',
      label: 'اسم المتجر',
      placeholder: 'المجمع الصيني للاكسسوارات',
      icon: '🏪',
      hint: 'اسم المتجر كما يظهر في الموقع',
      dir: undefined,
    },
    {
      key: 'store_address',
      label: 'عنوان المتجر',
      placeholder: 'بغداد ساحة الوثبة مقابل أمانة بغداد',
      icon: '📍',
      hint: 'العنوان الذي يظهر في صفحة المنتجات',
      dir: undefined,
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: '#e8f4ff', fontWeight: 800, fontSize: 26, marginBottom: 6 }}>⚙️ إعدادات المتجر</h1>
        <p style={{ color: '#7fa8c0', fontSize: 13 }}>تحكم في معلومات المتجر وطرق التواصل</p>
      </div>

      <div style={{
        background: 'rgba(13,21,32,0.9)',
        border: '1px solid rgba(26,58,92,0.5)',
        borderRadius: 16, padding: 24,
        display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 560,
      }}>
        {fields.map(({ key, label, placeholder, icon, hint, dir }) => (
          <div key={key}>
            <label style={{ color: '#e8f4ff', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              {label}
            </label>
            <input
              className="input-dark"
              value={settings[key as keyof typeof settings]}
              onChange={e => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
              placeholder={placeholder}
              dir={dir}
              style={dir === 'ltr' ? { textAlign: 'left' } : undefined}
            />
            {hint && <p style={{ color: '#7fa8c0', fontSize: 11, marginTop: 5 }}>{hint}</p>}
          </div>
        ))}

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-neon"
            style={{ fontSize: 15, padding: '12px 28px', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'جاري الحفظ...' : '💾 حفظ الإعدادات'}
          </button>
          {saved && (
            <span style={{ color: '#00ff88', fontSize: 14, fontWeight: 600 }}>
              ✓ تم الحفظ بنجاح
            </span>
          )}
          {saveError && (
            <span style={{ color: '#ff6b6b', fontSize: 13 }}>
              ⚠️ {saveError}
            </span>
          )}
        </div>
      </div>

      {/* WhatsApp preview */}
      {settings.whatsapp_number && (
        <div style={{
          marginTop: 24, maxWidth: 560,
          background: 'rgba(37,211,102,0.08)',
          border: '1px solid rgba(37,211,102,0.25)',
          borderRadius: 12, padding: 16,
        }}>
          <p style={{ color: '#7fa8c0', fontSize: 13, marginBottom: 8 }}>معاينة رابط واتساب:</p>
          <p style={{ color: '#25d366', fontSize: 13, wordBreak: 'break-all', direction: 'ltr', textAlign: 'left' }}>
            https://wa.me/{settings.whatsapp_number}
          </p>
        </div>
      )}
    </div>
  )
}
