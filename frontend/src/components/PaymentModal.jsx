import { X } from 'lucide-react'

export default function PaymentModal({ featureLabel, price, onClose, onPurchase }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full bg-white rounded-t-2xl px-6 pt-5 pb-10 max-w-app mx-auto"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-[#6B6B6B]">
          <X size={18} />
        </button>
        <div className="w-10 h-1 bg-[#E5E5E5] rounded-full mx-auto mb-5" />
        <p className="font-bold text-[#1A1A1A] text-base mb-1">Unlock {featureLabel}</p>
        <p className="text-sm text-[#6B6B6B] mb-6">
          One-off purchase of {price}. No subscription required.
        </p>
        <button
          onClick={onPurchase}
          className="w-full py-3.5 bg-[#534AB7] text-white rounded-btn font-semibold text-sm"
        >
          Pay {price} — unlock now
        </button>
        <p className="text-center text-xs text-[#6B6B6B] mt-3">This is a demo — no real payment is taken.</p>
      </div>
    </div>
  )
}
