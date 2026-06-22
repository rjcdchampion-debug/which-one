import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Upload, X, Clock, Zap } from 'lucide-react'
import PaymentModal from '../components/PaymentModal'
import { useAuth } from '../contexts/AuthContext'
import { usePurchases } from '../hooks/usePurchases'
import { uploadPostImage } from '../lib/supabase'
import { api } from '../lib/api'
import { uuid } from '../lib/utils'

const CATEGORIES = [
  { id: 'fashion', label: 'Fashion', icon: '👗' },
  { id: 'food',    label: 'Food',    icon: '🍽️' },
  { id: 'home',    label: 'Home',    icon: '🏠' },
  { id: 'design',  label: 'Design',  icon: '🎨' },
  { id: 'beauty',  label: 'Beauty',  icon: '💄' },
  { id: 'other',   label: 'Other',   icon: '✨' },
]

const QUESTION_PLACEHOLDERS = {
  fashion: 'Which for the occasion?',
  food:    'Which dish looks more tempting?',
  home:    'Which fits better in the space?',
  design:  'Which design direction?',
  beauty:  'Which look for tonight?',
  other:   'Help me decide…',
}

const SUPABASE_CONFIGURED = !!(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

function ProgressDots({ step }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3].map(n => (
        <div
          key={n}
          className="rounded-full transition-all duration-300"
          style={{
            width:  n === step ? 20 : 6,
            height: 6,
            background: n <= step ? '#534AB7' : '#E5E5E5',
          }}
        />
      ))}
    </div>
  )
}

export default function CreatePostScreen() {
  const navigate   = useNavigate()
  const { user, session } = useAuth()
  const { hasPurchased, simulatePurchase } = usePurchases()

  const [step, setStep]       = useState(1)
  const [mode, setMode]       = useState('realtime')
  const [category, setCategory] = useState(null)
  const [question, setQuestion] = useState('')
  const [photos, setPhotos]   = useState([null, null, null, null])
  const [photoFiles, setPhotoFiles] = useState([null, null, null, null])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState(null)
  const [showPayModal, setShowPayModal] = useState(false)

  const inputRefs = [useRef(), useRef(), useRef(), useRef()]

  function handleModeSelect(selected) {
    if (selected === 'twelve_hour' && !hasPurchased('plus')) {
      setShowPayModal(true)
      return
    }
    setMode(selected)
  }

  function handleFileChange(index, file) {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPhotos(prev => { const n = [...prev]; n[index] = url; return n })
    setPhotoFiles(prev => { const n = [...prev]; n[index] = file; return n })
  }

  function removePhoto(index) {
    setPhotos(prev => { const n = [...prev]; n[index] = null; return n })
    setPhotoFiles(prev => { const n = [...prev]; n[index] = null; return n })
  }

  const filledCount = photos.filter(Boolean).length

  async function handleSubmit() {
    if (filledCount < 2 || submitting) return
    if (!user) { navigate('/login'); return }

    setSubmitting(true)
    setError(null)

    try {
      const postId = uuid()
      let photoUrls = []

      if (SUPABASE_CONFIGURED) {
        photoUrls = await Promise.all(
          photoFiles
            .filter(Boolean)
            .map(async (file, i) => {
              try {
                return await uploadPostImage(file, postId, i)
              } catch (uploadErr) {
                console.warn('Storage upload failed, using placeholder:', uploadErr.message)
                return `https://picsum.photos/seed/${postId}-${i}/400/400`
              }
            })
        )
      } else {
        photoUrls = photoFiles.filter(Boolean).map((_, i) => `https://picsum.photos/seed/${postId}-${i}/400/400`)
      }

      const options = photoUrls.map((url, i) => ({
        label: `Option ${String.fromCharCode(65 + i)}`,
        photo_url: url,
      }))

      await api.createPost(
        { id: postId, mode, category, question: question || QUESTION_PLACEHOLDERS[category], options },
        session?.access_token
      )

      navigate('/')
    } catch (err) {
      console.error('Post error:', err)
      setError(err.message || 'Failed to create post. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="h-full overflow-y-auto bg-[#F5F5F5]" style={{ WebkitOverflowScrolling: 'touch' }}>
        <header className="sticky top-0 z-20 bg-white border-b border-[#E5E5E5]" style={{ borderBottomWidth: '0.5px' }}>
          <div className="flex justify-center">
            <div className="w-full max-w-app px-4 h-14 flex items-center justify-between">
              <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate(-1)} className="p-1 -ml-1">
                <ChevronLeft size={22} className="text-[#1A1A1A]" />
              </button>
              <ProgressDots step={step} />
              <div className="w-8" />
            </div>
          </div>
        </header>

        <main className="flex justify-center">
          <div className="w-full max-w-app px-4 pt-6 pb-28">
            {step === 1 && (
              <Step1
                mode={mode}
                onSelect={handleModeSelect}
                onContinue={() => setStep(2)}
              />
            )}
            {step === 2 && (
              <Step2
                category={category}
                onSelect={setCategory}
                onContinue={() => setStep(3)}
              />
            )}
            {step === 3 && (
              <Step3
                category={category}
                question={question}
                onQuestionChange={setQuestion}
                photos={photos}
                inputRefs={inputRefs}
                onFileChange={handleFileChange}
                onRemove={removePhoto}
                filledCount={filledCount}
                submitting={submitting}
                error={error}
                onSubmit={handleSubmit}
              />
            )}
          </div>
        </main>
      </div>

      {showPayModal && (
        <PaymentModal
          featureLabel="12-hour posts with AI deep-dive"
          price="£1.49"
          onClose={() => setShowPayModal(false)}
          onPurchase={() => {
            simulatePurchase('plus')
            setMode('twelve_hour')
            setShowPayModal(false)
          }}
        />
      )}
    </>
  )
}

function Step1({ mode, onSelect, onContinue }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1A1A1A]">Choose mode</h2>
        <p className="text-sm text-[#6B6B6B] mt-1">How long should your post run?</p>
      </div>

      <div className="space-y-3">
        <ModeCard
          selected={mode === 'realtime'}
          onClick={() => onSelect('realtime')}
          icon={<Zap size={22} className="text-[#993C1D]" />}
          title="Real-time"
          subtitle="15 minutes · Free"
          description="Instant votes while the moment is happening"
          accent="#993C1D"
        />
        <ModeCard
          selected={mode === 'twelve_hour'}
          onClick={() => onSelect('twelve_hour')}
          icon={<Clock size={22} className="text-[#185FA5]" />}
          title="12-hour"
          subtitle="Richer insights · £1.49"
          description="Deeper reach with AI analysis and demographics"
          accent="#185FA5"
          badge="Plus"
        />
      </div>

      <button
        onClick={onContinue}
        className="w-full py-4 bg-[#534AB7] text-white rounded-btn font-semibold"
      >
        Continue
      </button>
    </div>
  )
}

function ModeCard({ selected, onClick, icon, title, subtitle, description, accent, badge }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-card border p-4 text-left transition-all"
      style={{
        borderColor: selected ? accent : '#E5E5E5',
        borderWidth: selected ? 2 : 1,
        background: selected ? `${accent}08` : 'white',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: `${accent}15` }}
        >
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-[#1A1A1A]">{title}</p>
            {badge && (
              <span className="px-1.5 py-0.5 bg-[#534AB7] text-white text-[10px] font-bold rounded-full">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-[#6B6B6B] mt-0.5">{subtitle}</p>
          <p className="text-sm text-[#6B6B6B] mt-1">{description}</p>
        </div>
        <div
          className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1"
          style={{ borderColor: selected ? accent : '#E5E5E5', background: selected ? accent : 'transparent' }}
        >
          {selected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
      </div>
    </button>
  )
}

function Step2({ category, onSelect, onContinue }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1A1A1A]">Select category</h2>
        <p className="text-sm text-[#6B6B6B] mt-1">AI uses this to find relevant trends</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className="py-5 rounded-card border text-center transition-all"
            style={{
              borderColor: category === cat.id ? '#534AB7' : '#E5E5E5',
              borderWidth: category === cat.id ? 2 : 1,
              background: category === cat.id ? '#534AB71A' : 'white',
            }}
          >
            <span className="text-2xl">{cat.icon}</span>
            <p className={`mt-1 text-sm font-medium ${category === cat.id ? 'text-[#534AB7]' : 'text-[#1A1A1A]'}`}>
              {cat.label}
            </p>
          </button>
        ))}
      </div>

      <button
        onClick={onContinue}
        disabled={!category}
        className="w-full py-4 rounded-btn font-semibold transition-colors"
        style={{
          background: category ? '#534AB7' : '#E5E5E5',
          color: category ? 'white' : '#6B6B6B',
        }}
      >
        Continue
      </button>
    </div>
  )
}

function Step3({ category, question, onQuestionChange, photos, inputRefs, onFileChange, onRemove, filledCount, submitting, error, onSubmit }) {
  const multiRef = useRef()

  const SLOTS = [
    { index: 0, required: true,  label: 'Option A' },
    { index: 1, required: true,  label: 'Option B' },
    { index: 2, required: false, label: 'Add option' },
    { index: 3, required: false, label: 'Add option' },
  ]

  function handleMultiSelect(e) {
    Array.from(e.target.files || []).slice(0, 4).forEach((file, i) => onFileChange(i, file))
    e.target.value = ''
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#1A1A1A]">Upload photos</h2>
        <p className="text-sm text-[#6B6B6B] mt-1">First two are required</p>
      </div>

      {/* Multi-select shortcut */}
      <input
        ref={multiRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
        multiple
        className="hidden"
        onChange={handleMultiSelect}
      />
      <button
        onClick={() => multiRef.current?.click()}
        className="w-full py-3 rounded-btn border border-dashed border-[#534AB7] text-[#534AB7] text-sm font-semibold flex items-center justify-center gap-2"
      >
        <Upload size={16} />
        Select all photos at once
      </button>

      <div className="grid grid-cols-2 gap-3">
        {SLOTS.map(({ index, required, label }) => (
          <PhotoSlot
            key={index}
            photo={photos[index]}
            label={label}
            required={required}
            inputRef={inputRefs[index]}
            onChange={(file) => onFileChange(index, file)}
            onRemove={() => onRemove(index)}
          />
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
          Question <span className="text-[#6B6B6B] font-normal">(optional)</span>
        </label>
        <textarea
          value={question}
          onChange={e => onQuestionChange(e.target.value)}
          placeholder={QUESTION_PLACEHOLDERS[category] || 'Help me decide…'}
          rows={2}
          className="w-full px-4 py-3 rounded-btn border border-[#E5E5E5] text-sm text-[#1A1A1A] placeholder:text-[#6B6B6B] resize-none focus:border-[#534AB7] transition-colors"
          maxLength={120}
        />
        <p className="text-xs text-[#6B6B6B] text-right mt-1">{question.length}/120</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-btn px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={filledCount < 2 || submitting}
        className="w-full py-4 rounded-btn font-semibold flex items-center justify-center gap-2 transition-colors"
        style={{
          background: filledCount >= 2 ? '#534AB7' : '#E5E5E5',
          color: filledCount >= 2 ? 'white' : '#6B6B6B',
        }}
      >
        {submitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Posting…
          </>
        ) : (
          'Post · starts now'
        )}
      </button>
    </div>
  )
}

function PhotoSlot({ photo, label, required, inputRef, onChange, onRemove }) {
  return (
    <div className="relative aspect-square rounded-card overflow-hidden">
      {photo ? (
        <>
          <img src={photo} alt={label} className="w-full h-full object-cover" />
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
          >
            <X size={14} className="text-white" />
          </button>
        </>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full h-full bg-white border border-dashed border-[#E5E5E5] flex flex-col items-center justify-center gap-2 transition-colors hover:border-[#534AB7]"
        >
          <Upload size={20} className="text-[#6B6B6B]" />
          <p className="text-xs font-medium text-[#6B6B6B]">{label}</p>
          {required && <p className="text-[10px] text-[#993C1D]">Required</p>}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
        className="hidden"
        onChange={e => onChange(e.target.files?.[0])}
      />
    </div>
  )
}
