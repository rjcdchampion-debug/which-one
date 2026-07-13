import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Upload, X, Clock, Zap, Sparkles, Star, Camera } from 'lucide-react'
import PaymentModal from '../components/PaymentModal'
import { useAuth } from '../contexts/AuthContext'
import { usePlan } from '../hooks/usePlan'
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

// ── Feature gate bottom sheet ─────────────────────────────────────────────────
function FeatureSheet({ feature, onPay, onUpgrade, onClose }) {
  const messages = {
    timer:    { title: 'Extended timers', desc: 'Extended timers (30 min and 1 hr) are a Plus feature.' },
    twelvehr: { title: '12-hour posts',   desc: '12-hour posts with AI deep-dive are a Plus feature.' },
  }
  const { title, desc } = messages[feature] || messages.timer

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full bg-white rounded-t-2xl px-6 pt-5 pb-10 max-w-app mx-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-[#E5E5E5] rounded-full mx-auto mb-5" />
        <p className="font-bold text-[#1A1A1A] text-base mb-1">{title}</p>
        <p className="text-sm text-[#6B6B6B] mb-6">
          {desc} Unlock for £0.99 or upgrade to Plus for unlimited access.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onPay}
            className="w-full py-3.5 bg-[#534AB7] text-white rounded-btn font-semibold text-sm"
          >
            Pay £0.99 — unlock now
          </button>
          <button
            onClick={onUpgrade}
            className="w-full py-3.5 border border-[#534AB7] text-[#534AB7] rounded-btn font-semibold text-sm"
          >
            Upgrade to Plus — £4.99/month
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Boost prompt modal (shown after 3 one-off purchases) ─────────────────────
function BoostPrompt({ count, onUpgrade, onDismiss }) {
  const spent = (count * 0.99).toFixed(2)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={onDismiss}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl p-6 max-w-sm w-full text-center"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-2xl mb-3">💡</p>
        <p className="font-bold text-[#1A1A1A] mb-2">
          You've spent £{spent} on boosts this month
        </p>
        <p className="text-sm text-[#6B6B6B] mb-5">
          Get everything with Plus for just £4.99/month.
        </p>
        <button
          onClick={onUpgrade}
          className="w-full py-3.5 bg-[#534AB7] text-white rounded-btn font-semibold text-sm mb-2"
        >
          Upgrade to Plus
        </button>
        <button onClick={onDismiss} className="text-xs text-[#6B6B6B]">
          Maybe later
        </button>
      </div>
    </div>
  )
}

export default function CreatePostScreen() {
  const navigate   = useNavigate()
  const { user, session } = useAuth()
  const { isPlus, recordBoost, showBoostPrompt, dismissBoostPrompt } = usePlan()

  const [step, setStep]         = useState(1)
  const [mode, setMode]         = useState('realtime')
  const [duration, setDuration] = useState(15)
  const [category, setCategory] = useState(null)
  const [question, setQuestion] = useState('')
  const [photos, setPhotos]     = useState([null, null, null, null])
  const [photoFiles, setPhotoFiles] = useState([null, null, null, null])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState(null)

  // Feature sheet & AI payment modals
  const [featureSheet, setFeatureSheet] = useState(null)  // null | 'timer' | 'twelvehr'
  const [pendingDuration, setPendingDuration] = useState(null)
  const [showAiModal, setShowAiModal]   = useState(false)
  const [wantAI, setWantAI]             = useState(false)
  const [showFeatureModal, setShowFeatureModal] = useState(false)

  const inputRefs = [useRef(), useRef(), useRef(), useRef()]
  const cameraInputRefs = [useRef(), useRef(), useRef(), useRef()]

  function handleModeSelect(selected) {
    if (selected === 'twelve_hour' && !isPlus) {
      setFeatureSheet('twelvehr')
      return
    }
    setMode(selected)
  }

  function handleDurationSelect(d) {
    if (!d.free && !isPlus) {
      setPendingDuration(d.mins)
      setFeatureSheet('timer')
      return
    }
    setDuration(d.mins)
  }

  function handleFeaturePay() {
    // Simulate £0.99 purchase then apply the pending action
    setFeatureSheet(null)
    const count = recordBoost()
    if (featureSheet === 'timer' && pendingDuration) {
      setDuration(pendingDuration)
      setPendingDuration(null)
    } else if (featureSheet === 'twelvehr') {
      setMode('twelve_hour')
    }
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

  async function handleSubmit(withAI = false, withFeature = false) {
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
              } catch {
                return `https://picsum.photos/seed/${postId}-${i}/400/400`
              }
            })
        )
      } else {
        photoUrls = photoFiles.filter(Boolean).map((_, i) =>
          `https://picsum.photos/seed/${postId}-${i}/400/400`
        )
      }

      const options = photoUrls.map((url, i) => ({
        label: `Option ${String.fromCharCode(65 + i)}`,
        photo_url: url,
      }))

      const { post } = await api.createPost(
        { id: postId, mode, durationMinutes: duration, category, question: question || QUESTION_PLACEHOLDERS[category], options },
        session?.access_token
      )

      // Trigger real AI verdict if paid or Plus user
      if (withAI || isPlus) {
        api.requestAiVerdict(postId, session?.access_token).catch(() => {})
      }

      // Featured placement only applies to realtime posts (that's the only pool
      // the desktop hero draws from) — mirrors the My Posts upsell gating.
      if (mode === 'realtime' && (withFeature || isPlus)) {
        api.requestFeature(postId, session?.access_token).catch(() => {})
      }

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
                duration={duration}
                onDuration={handleDurationSelect}
                onContinue={() => setStep(2)}
                isPlus={isPlus}
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
                mode={mode}
                category={category}
                question={question}
                onQuestionChange={setQuestion}
                photos={photos}
                inputRefs={inputRefs}
                cameraInputRefs={cameraInputRefs}
                onFileChange={handleFileChange}
                onRemove={removePhoto}
                filledCount={filledCount}
                submitting={submitting}
                error={error}
                isPlus={isPlus}
                onSubmit={() => handleSubmit(false)}
                onSubmitWithFeature={() => {
                  if (isPlus) { handleSubmit(false, true); return }
                  setShowFeatureModal(true)
                }}
                onSubmitWithAI={() => {
                  if (isPlus) { handleSubmit(true); return }
                  setShowAiModal(true)
                }}
              />
            )}
          </div>
        </main>
      </div>

      {/* Feature gate sheet */}
      {featureSheet && (
        <FeatureSheet
          feature={featureSheet}
          onPay={handleFeaturePay}
          onUpgrade={() => { setFeatureSheet(null); navigate('/pricing') }}
          onClose={() => { setFeatureSheet(null); setPendingDuration(null) }}
        />
      )}

      {/* AI verdict payment modal (Step 3) */}
      {showAiModal && (
        <PaymentModal
          featureLabel="AI verdict on your post"
          price="£0.99"
          onClose={() => setShowAiModal(false)}
          onPurchase={() => {
            setShowAiModal(false)
            recordBoost()
            handleSubmit(true)
          }}
        />
      )}

      {/* Featured-placement payment modal (Step 3) */}
      {showFeatureModal && (
        <PaymentModal
          featureLabel="Featured placement on the desktop feed"
          price="£0.99"
          onClose={() => setShowFeatureModal(false)}
          onPurchase={() => {
            setShowFeatureModal(false)
            recordBoost()
            handleSubmit(false, true)
          }}
        />
      )}

      {/* Boost prompt — after 3 one-off purchases */}
      {showBoostPrompt && (
        <BoostPrompt
          count={3}
          onUpgrade={() => { dismissBoostPrompt(); navigate('/pricing') }}
          onDismiss={dismissBoostPrompt}
        />
      )}
    </>
  )
}

// ── Step components ───────────────────────────────────────────────────────────

const DURATIONS = [
  { mins: 1,  label: '1 min',  free: true  },
  { mins: 15, label: '15 min', free: true  },
  { mins: 30, label: '30 min', free: false },
  { mins: 60, label: '1 hour', free: false },
]

function Step1({ mode, onSelect, duration, onDuration, onContinue, isPlus }) {
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
          subtitle="Live votes while the moment is happening"
          accent="#993C1D"
        />

        {mode === 'realtime' && (
          <div className="flex gap-2 px-1">
            {DURATIONS.map(d => {
              const locked = !d.free && !isPlus
              const active = duration === d.mins && !locked
              return (
                <button
                  key={d.mins}
                  onClick={() => onDuration(d)}
                  className="flex-1 py-2 rounded-btn text-xs font-semibold border transition-all relative"
                  style={{
                    borderColor: active ? '#534AB7' : '#E5E5E5',
                    borderWidth: active ? 2 : 1,
                    background:  active ? '#534AB71A' : 'white',
                    color: active ? '#534AB7' : locked ? '#6B6B6B' : '#1A1A1A',
                  }}
                >
                  {d.label}
                  {locked && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1 py-0 bg-[#534AB7] text-white text-[8px] font-bold rounded-full leading-4">
                      Plus
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        <ModeCard
          selected={mode === 'twelve_hour'}
          onClick={() => onSelect('twelve_hour')}
          icon={<Clock size={22} className="text-[#185FA5]" />}
          title="12-hour"
          subtitle="Deeper reach with AI analysis and demographics"
          accent="#185FA5"
          badge={isPlus ? null : 'Plus'}
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

function ModeCard({ selected, onClick, icon, title, subtitle, accent, badge }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-card border p-4 text-left transition-all"
      style={{
        borderColor: selected ? accent : '#E5E5E5',
        borderWidth: selected ? 2 : 1,
        background:  selected ? `${accent}08` : 'white',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: `${accent}15` }}>
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
        </div>
        <div
          className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
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
              background:  category === cat.id ? '#534AB71A' : 'white',
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
        style={{ background: category ? '#534AB7' : '#E5E5E5', color: category ? 'white' : '#6B6B6B' }}
      >
        Continue
      </button>
    </div>
  )
}

function Step3({ mode, category, question, onQuestionChange, photos, inputRefs, cameraInputRefs, onFileChange, onRemove, filledCount, submitting, error, isPlus, onSubmit, onSubmitWithFeature, onSubmitWithAI }) {
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

  const canPost = filledCount >= 2 && !submitting

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#1A1A1A]">Upload photos</h2>
        <p className="text-sm text-[#6B6B6B] mt-1">First two are required</p>
      </div>

      <input ref={multiRef} type="file" accept="image/jpeg,image/png,image/heic,image/heif,image/webp" multiple className="hidden" onChange={handleMultiSelect} />
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
            cameraInputRef={cameraInputRefs[index]}
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

      {/* Primary: Post for free */}
      <button
        onClick={onSubmit}
        disabled={!canPost}
        className="w-full py-4 rounded-btn font-semibold flex items-center justify-center gap-2 transition-colors"
        style={{ background: canPost ? '#534AB7' : '#E5E5E5', color: canPost ? 'white' : '#6B6B6B' }}
      >
        {submitting ? (
          <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Posting…</>
        ) : 'Post for free · Start now'}
      </button>

      {/* Secondary: Post with Featured placement — realtime posts only, that's the only pool the desktop hero draws from */}
      {mode === 'realtime' && (
        <button
          onClick={onSubmitWithFeature}
          disabled={!canPost}
          className="w-full py-4 rounded-btn font-semibold flex items-center justify-center gap-2 transition-colors border-2"
          style={{
            borderColor: canPost ? '#534AB7' : '#E5E5E5',
            color:       canPost ? '#534AB7' : '#6B6B6B',
            background:  'white',
            opacity:     canPost ? 1 : 0.5,
          }}
        >
          <Star size={16} />
          {isPlus ? 'Post with Featured placement' : 'Include Featured placement · +£0.99'}
        </button>
      )}

      {/* Secondary: Post with AI verdict */}
      <button
        onClick={onSubmitWithAI}
        disabled={!canPost}
        className="w-full py-4 rounded-btn font-semibold flex items-center justify-center gap-2 transition-colors"
        style={{
          background: canPost ? '#B8860B' : '#E5E5E5',
          color: canPost ? 'white' : '#6B6B6B',
          opacity: canPost ? 1 : 0.5,
        }}
      >
        <Sparkles size={16} style={{ color: canPost ? 'white' : '#6B6B6B' }} />
        {isPlus ? 'Post with AI verdict' : 'Include AI verdict · +£0.99'}
      </button>
    </div>
  )
}

function PhotoSlot({ photo, label, required, inputRef, cameraInputRef, onChange, onRemove }) {
  return (
    <div className="relative aspect-square rounded-card overflow-hidden">
      {photo ? (
        <>
          <img src={photo} alt={label} className="w-full h-full object-cover" />
          <button onClick={onRemove} className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center">
            <X size={14} className="text-white" />
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full h-full bg-white border border-dashed border-[#E5E5E5] flex flex-col items-center justify-center gap-2 transition-colors hover:border-[#534AB7]"
          >
            <Upload size={20} className="text-[#6B6B6B]" />
            <p className="text-xs font-medium text-[#6B6B6B]">{label}</p>
            {required && <p className="text-[10px] text-[#993C1D]">Required</p>}
          </button>
          {/* Mobile-only fast path: jumps straight to the camera via the input's
              capture attribute, skipping the OS picker sheet. Desktop file inputs
              can't open a camera at all, so this is hidden there — the plain
              upload button already covers desktop. */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="md:hidden absolute top-2 right-2 z-10 w-7 h-7 bg-white border border-[#E5E5E5] rounded-full flex items-center justify-center shadow-sm"
            aria-label="Take photo"
          >
            <Camera size={14} className="text-[#534AB7]" />
          </button>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
        className="hidden"
        onChange={e => onChange(e.target.files?.[0])}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => onChange(e.target.files?.[0])}
      />
    </div>
  )
}
