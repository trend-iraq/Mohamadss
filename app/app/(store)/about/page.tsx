export default function AboutPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{
          width: 80, height: 80,
          background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
          borderRadius: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, margin: '0 auto 20px', fontWeight: 900, color: '#050a0f',
        }}>M</div>
        <h1 style={{ color: '#00ff88', fontWeight: 900, fontSize: 32, marginBottom: 8 }}>
          محمد SS
        </h1>
        <p style={{ color: '#7fa8c0', fontSize: 16 }}>بيع الجملة لإكسسوارات الهواتف المحمولة</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[
          { icon: '📍', title: 'العنوان', text: 'بغداد - الصنك - قرب ساحة الخيلاني' },
          { icon: '📦', title: 'تخصصنا', text: 'بيع جميع أنواع إكسسوارات الهواتف المحمولة بالجملة بأفضل الأسعار' },
          { icon: '💰', title: 'أسعار الجملة', text: 'أسعار تنافسية بالدينار العراقي مخصصة للتجار والموزعين' },
          { icon: '🚚', title: 'التوصيل', text: 'توصيل لجميع محافظات العراق' },
          { icon: '📞', title: 'التواصل', text: 'تواصل معنا عبر واتساب أو زيارة محلنا في بغداد' },
        ].map(({ icon, title, text }) => (
          <div key={title} style={{
            background: 'rgba(13,21,32,0.8)',
            border: '1px solid rgba(26,58,92,0.5)',
            borderRadius: 14, padding: '20px 24px',
            display: 'flex', gap: 16, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 28, flexShrink: 0 }}>{icon}</span>
            <div>
              <h3 style={{ color: '#00ff88', fontWeight: 700, marginBottom: 4, fontSize: 16 }}>{title}</h3>
              <p style={{ color: '#7fa8c0', fontSize: 14, lineHeight: 1.6 }}>{text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
