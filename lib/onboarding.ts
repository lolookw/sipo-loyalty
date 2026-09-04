// Guía de inicio del dueño: checklist de setup con detección automática + "saltear" manual.
// Lógica pura (testeable), mismo patrón que lib/campaigns.ts / lib/purchase.ts.

export type OnboardingStepKey =
  | 'logo' | 'colors' | 'links' | 'stamps_config' | 'stamps_vs_points' | 'rewards' | 'staff'

export type StepStatus = 'done' | 'skipped' | 'pending'

export interface OnboardingStep {
  key: OnboardingStepKey
  title: string
  description: string
  href: string
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    key: 'logo',
    title: 'Subí el logo de tu café',
    description: 'Aparece en tu página de fidelidad y en la tarjeta digital de tus clientes.',
    href: '/admin/settings',
  },
  {
    key: 'colors',
    title: 'Elegí los colores de tu marca',
    description: 'Reemplazan los colores por defecto en toda la experiencia del cliente.',
    href: '/admin/settings',
  },
  {
    key: 'links',
    title: 'Cargá tus links de contacto',
    description: 'Mapa, WhatsApp, Instagram, menú o web — lo que quieras mostrarle al cliente.',
    href: '/admin/settings',
  },
  {
    key: 'stamps_config',
    title: 'Definí cuántos sellos hacen falta y el premio',
    description: 'Por defecto son 10 sellos por "1 free coffee" — seguro querés poner el tuyo.',
    href: '/admin/settings',
  },
  {
    key: 'stamps_vs_points',
    title: 'Decidí si usás sellos, puntos, o los dos',
    description: 'Los sellos premian visitas; los puntos premian lo que se gasta. Se pueden combinar.',
    href: '/admin/settings',
  },
  {
    key: 'rewards',
    title: 'Agregá recompensas para canjear con puntos',
    description: 'Solo hace falta si usás el sistema de puntos.',
    href: '/admin/rewards',
  },
  {
    key: 'staff',
    title: 'Agregá un usuario cajero',
    description: 'Para que tu equipo pueda sumar sellos/puntos desde la caja sin tu usuario.',
    href: '/admin/equipo',
  },
]

export interface OnboardingFacts {
  hasLogo: boolean
  hasCustomColors: boolean
  hasContactLink: boolean
  hasCustomStampConfig: boolean
  hasRewards: boolean
  hasStaff: boolean
}

const AUTO_DONE: Record<OnboardingStepKey, keyof OnboardingFacts> = {
  logo: 'hasLogo',
  colors: 'hasCustomColors',
  links: 'hasContactLink',
  stamps_config: 'hasCustomStampConfig',
  stamps_vs_points: 'hasCustomStampConfig', // no hay una señal propia; se apoya en la de al lado
  rewards: 'hasRewards',
  staff: 'hasStaff',
}

export function parseSkippedSteps(raw: string | null): OnboardingStepKey[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((s): s is OnboardingStepKey => typeof s === 'string')
  } catch {
    return []
  }
}

export function toggleSkippedStep(raw: string | null, step: OnboardingStepKey, skip: boolean): string {
  const current = new Set(parseSkippedSteps(raw))
  if (skip) current.add(step)
  else current.delete(step)
  return JSON.stringify(Array.from(current))
}

export function computeStepStatus(
  step: OnboardingStepKey,
  facts: OnboardingFacts,
  skippedSteps: OnboardingStepKey[],
): StepStatus {
  if (facts[AUTO_DONE[step]]) return 'done'
  if (skippedSteps.includes(step)) return 'skipped'
  return 'pending'
}

export function computeOnboarding(facts: OnboardingFacts, skippedRaw: string | null) {
  const skippedSteps = parseSkippedSteps(skippedRaw)
  const steps = ONBOARDING_STEPS.map(step => ({
    ...step,
    status: computeStepStatus(step.key, facts, skippedSteps),
  }))
  const doneCount = steps.filter(s => s.status !== 'pending').length
  return { steps, doneCount, total: steps.length, allDone: doneCount === steps.length }
}
