import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import SignupForm from '@/components/SignupForm'

export const metadata: Metadata = {
  title: 'Sumá tu cafetería',
  description: 'Sumá tu cafetería a Sipo. Programa de fidelidad digital con sellos y puntos, sin apps ni tarjetas. Empezá gratis.',
}

const perks = [
  'Sellos y puntos digitales, sin app que descargar',
  'Tu marca, tus colores, tus recompensas',
  'Plan gratuito para arrancar (hasta 5 clientes)',
]

export default function SumatePage() {
  return (
    <div className="min-h-screen" style={{ background: '#FCFBF8', color: '#43352C' }}>
      <div className="mx-auto max-w-2xl px-6 py-8">

        {/* Nav */}
        <nav className="flex items-center justify-between mb-10">
          <Link href="/demo" className="flex items-center gap-2.5">
            <Image src="/logo.svg" width={26} height={26} alt="Sipo" />
            <span className="font-serif font-semibold" style={{ fontSize: '1.2rem', color: '#43352C' }}>Sipo</span>
          </Link>
          <Link href="/login" className="font-sans text-sm hover:opacity-70 transition-opacity" style={{ color: '#6B6B6B' }}>
            Iniciar sesión
          </Link>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-sans text-sm mb-6" style={{ background: '#F6F0E8', color: '#6B6B6B', border: '1px solid #E9DED1' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: '#B56A4C' }} />
            Alta de cafetería
          </div>
          <h1 className="font-serif mb-4" style={{ fontSize: 'clamp(2.2rem, 6vw, 3.2rem)', fontWeight: 600, lineHeight: 1, letterSpacing: '-0.03em' }}>
            Sumá tu cafetería<br /><span style={{ color: '#B56A4C' }}>a Sipo.</span>
          </h1>
          <ul className="space-y-1.5 mt-5">
            {perks.map(p => (
              <li key={p} className="font-sans text-sm flex items-center gap-2.5" style={{ color: '#6B6B6B' }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#B56A4C' }} />
                {p}
              </li>
            ))}
          </ul>
        </div>

        {/* Form card */}
        <div className="rounded-[28px] p-6 sm:p-8" style={{ background: 'white', border: '1px solid #E9DED1', boxShadow: '0 8px 30px rgba(67,53,44,0.05)' }}>
          <SignupForm />
        </div>

        <p className="text-center font-sans text-xs mt-8" style={{ color: '#C0B4A8' }}>
          Cada café cuenta. ☕
        </p>
      </div>
    </div>
  )
}
