import { AppProvider } from '@/context/AppContext'
import Navbar from '@/components/Navbar'
import WhatsAppButton from '@/components/WhatsAppButton'

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <Navbar />
      <main style={{ flex: 1, minHeight: 'calc(100vh - 64px)' }}>
        {children}
      </main>
      <WhatsAppButton />
      <footer style={{
        background: 'rgba(13, 21, 32, 0.95)',
        borderTop: '1px solid rgba(26, 58, 92, 0.5)',
        padding: '24px 16px',
        textAlign: 'center',
        color: '#7fa8c0',
        fontSize: 13,
      }}>
        <p style={{ marginBottom: 4 }}>
          <span style={{ color: '#00ff88', fontWeight: 700 }}>محمد SS</span> - بيع الجملة لإكسسوارات الهواتف
        </p>
        <p>📍 بغداد - الصنك - قرب ساحة الخيلاني</p>
      </footer>
    </AppProvider>
  )
}
