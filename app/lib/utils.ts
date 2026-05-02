export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-IQ', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' د.ع'
}

export function getStockStatus(stock: number): { label: string; color: string } {
  if (stock === 0) return { label: 'نفذ المخزون', color: 'text-red-500' }
  if (stock <= 10) return { label: 'مخزون منخفض', color: 'text-yellow-500' }
  return { label: 'متوفر', color: 'text-green-500' }
}

export function parseImages(images: string): string[] {
  try {
    return JSON.parse(images)
  } catch {
    return []
  }
}

export function getOrderStatusLabel(status: string): string {
  const map: Record<string, string> = {
    new: 'جديد',
    processing: 'قيد المعالجة',
    delivered: 'تم التسليم',
    cancelled: 'ملغى',
  }
  return map[status] || status
}

export function getOrderStatusColor(status: string): string {
  const map: Record<string, string> = {
    new: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    processing: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    delivered: 'bg-green-500/20 text-green-400 border border-green-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border border-red-500/30',
  }
  return map[status] || 'bg-gray-500/20 text-gray-400'
}
