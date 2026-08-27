'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, ExternalLink, X, Undo2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { OnboardingStepKey, StepStatus } from '@/lib/onboarding'

interface Step {
  key: OnboardingStepKey
  title: string
  description: string
  href: string
  status: StepStatus
}

export default function OnboardingChecklist({ cafeSlug, steps: initialSteps }: { cafeSlug: string; steps: Step[] }) {
  const [steps, setSteps] = useState(initialSteps)
  const [loadingKey, setLoadingKey] = useState<OnboardingStepKey | null>(null)

  async function toggleSkip(key: OnboardingStepKey, skip: boolean) {
    setLoadingKey(key)
    try {
      const res = await fetch(`/api/cafe/${cafeSlug}/onboarding/skip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: key, skipped: skip }),
      })
      if (!res.ok) { toast.error('No se pudo guardar'); return }
      setSteps(prev => prev.map(s => s.key === key ? { ...s, status: skip ? 'skipped' : 'pending' } : s))
    } catch { toast.error('Error de conexión') }
    finally { setLoadingKey(null) }
  }

  return (
    <div className="space-y-2.5">
      {steps.map(step => {
        const isDone = step.status === 'done'
        const isSkipped = step.status === 'skipped'
        return (
          <div
            key={step.key}
            className="rounded-2xl px-5 py-4 flex items-start gap-4"
            style={{
              background: 'white',
              border: '1px solid #E9DED1',
              opacity: isDone || isSkipped ? 0.6 : 1,
            }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={isDone
                ? { background: '#43352C', color: 'white' }
                : { background: '#F6F0E8', color: '#C0B4A8', border: '1px solid #E9DED1' }
              }
            >
              {isDone ? <Check size={13} /> : <span className="text-xs">·</span>}
            </div>

            <div className="flex-1 min-w-0">
              <p
                className="font-sans font-medium text-sm"
                style={{ color: '#43352C', textDecoration: isDone || isSkipped ? 'line-through' : 'none' }}
              >
                {step.title}
              </p>
              <p className="font-sans text-xs mt-0.5" style={{ color: '#9B9089' }}>
                {isSkipped ? 'Salteado — no aplica por ahora.' : step.description}
              </p>

              {!isDone && (
                <div className="flex items-center gap-3 mt-2.5">
                  <Link
                    href={`/${cafeSlug}${step.href}`}
                    className="flex items-center gap-1 text-xs font-sans font-medium"
                    style={{ color: '#B56A4C' }}
                  >
                    Ir a configurar <ExternalLink size={11} />
                  </Link>
                  <button
                    disabled={loadingKey === step.key}
                    onClick={() => toggleSkip(step.key, !isSkipped)}
                    className="flex items-center gap-1 text-xs font-sans transition-opacity hover:opacity-70 disabled:opacity-40"
                    style={{ color: '#9B9089' }}
                  >
                    {isSkipped ? <><Undo2 size={11} /> Deshacer</> : <><X size={11} /> No aplica / saltear</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
