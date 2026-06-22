import { X, Sparkles } from 'lucide-react'

const FEATURES = [
  '12-hour posts with richer insights',
  'AI deep-dive verdicts with sources',
  'Demographic breakdown by age & location',
]

export default function PaymentModal({ featureLabel, price = '£1.49', onClose, onPurchase }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-app bg-white rounded-t-3xl pb-safe-bottom">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#E5E5E5]" />
        </div>

        <div className="px-5 pb-8 pt-3">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-[#534AB7]/10 flex items-center justify-center">
                <Sparkles size={18} className="text-[#534AB7]" />
              </div>
              <div>
                <p className="font-semibold text-[#1A1A1A] text-sm">This or That Plus</p>
                <p className="text-xs text-[#6B6B6B]">{featureLabel}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 -mr-1">
              <X size={20} className="text-[#6B6B6B]" />
            </button>
          </div>

          <div className="bg-[#F5F5F5] rounded-card p-4 mb-5">
            <p className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wide mb-3">
              Included in Plus
            </p>
            <ul className="space-y-2">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-[#1A1A1A]">
                  <span className="text-[#534AB7] mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={onPurchase}
            className="w-full py-3.5 bg-[#534AB7] text-white font-semibold rounded-btn text-sm"
          >
            Simulate purchase · {price}
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 text-[#6B6B6B] text-sm mt-1"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
