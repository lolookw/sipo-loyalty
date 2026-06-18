'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Coffee, ArrowRight } from 'lucide-react'

interface CafeCard {
  slug: string
  name: string
  description: string | null
  logoUrl: string | null
  primaryColor: string
  coverUrl: string | null
}

export default function HubPage({ cafes }: { cafes: CafeCard[] }) {
  return (
    <div className="min-h-screen" style={{ background: '#FCFBF8' }}>

      {/* ── Header ── */}
      <header style={{ background: '#43352C' }}>
        <div className="max-w-5xl mx-auto px-6 py-14 text-center">

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-center gap-4 mb-5"
          >
            <img src="/logo-light.svg" width={54} height={54} alt="Sipo" />
            <span style={{ display: 'inline-block', width: 1, height: 46, background: 'rgba(255,255,255,0.18)' }} />
            <h1
              className="font-serif text-white"
              style={{
                fontSize: 'clamp(2.6rem, 8vw, 4rem)',
                fontWeight: 600,
                letterSpacing: '-0.025em',
                lineHeight: 1,
              }}
            >
              Sipo
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.14 }}
            className="font-serif italic mb-5"
            style={{ fontSize: 'clamp(1rem, 3vw, 1.15rem)', color: '#B56A4C', letterSpacing: '0.01em' }}
          >
            Cada café cuenta.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.22 }}
            className="font-sans text-sm max-w-xs mx-auto"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            Descubrí las cafeterías adheridas y acumulá beneficios en cada visita.
          </motion.p>

          {cafes.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.32 }}
              className="mt-5 inline-flex items-center gap-2 font-sans text-xs px-4 py-2 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.32)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#B56A4C' }} />
              {cafes.length} {cafes.length === 1 ? 'cafetería adherida' : 'cafeterías adheridas'}
            </motion.div>
          )}
        </div>
      </header>

      {/* ── Grid ── */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        {cafes.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-5">☕</div>
            <div className="font-sans text-sm mb-3" style={{ color: '#6B6B6B' }}>
              Todavía no hay cafeterías registradas.
            </div>
            <Link
              href="/demo"
              className="font-sans text-sm underline hover:opacity-70 transition-opacity"
              style={{ color: '#B56A4C' }}
            >
              Conocé Sipo →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {cafes.map((cafe, i) => (
              <CafeCardItem key={cafe.slug} cafe={cafe} index={i} />
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer
        className="max-w-5xl mx-auto px-6 pb-10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3"
        style={{ borderTop: '1px solid #E9DED1' }}
      >
        <p className="font-sans text-xs" style={{ color: '#C0B4A8' }}>
          ¿Tenés una cafetería?{' '}
          <Link href="/demo" className="underline hover:opacity-60 transition-opacity" style={{ color: '#B56A4C' }}>
            Conocé Sipo
          </Link>
        </p>
        <Link href="/login" className="font-sans text-xs hover:opacity-60 transition-opacity" style={{ color: '#C0B4A8' }}>
          Iniciar sesión →
        </Link>
      </footer>
    </div>
  )
}

function CafeCardItem({ cafe, index }: { cafe: CafeCard; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Link href={`/${cafe.slug}`} className="group block">
        <div
          className="rounded-3xl overflow-hidden transition-all duration-300 group-hover:-translate-y-1"
          style={{
            background: 'white',
            border: '1px solid #E9DED1',
            boxShadow: '0 8px 30px rgba(67,53,44,0.04)',
          }}
        >
          {/* Cover */}
          <div className="relative">
            <div
              className="h-28 overflow-hidden"
              style={{ background: '#F6F0E8' }}
            >
              {cafe.coverUrl && (
                <>
                  <img
                    src={cafe.coverUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: 'rgba(67,53,44,0.1)' }}
                  />
                </>
              )}
            </div>

            {/* Logo — círculo */}
            <div
              className="absolute bottom-0 left-5 translate-y-1/2 w-12 h-12 rounded-full overflow-hidden flex items-center justify-center z-10"
              style={{
                background: cafe.logoUrl ? 'white' : '#43352C',
                border: '2.5px solid white',
                boxShadow: '0 2px 8px rgba(67,53,44,0.1)',
              }}
            >
              {cafe.logoUrl
                ? <img src={cafe.logoUrl} alt={cafe.name} className="w-full h-full object-cover" />
                : <Coffee size={18} color="white" strokeWidth={1.5} />
              }
            </div>
          </div>

          {/* Body */}
          <div className="px-5 pt-9 pb-5">
            <h2
              className="font-serif font-medium leading-tight mb-1"
              style={{ fontSize: '1.3rem', color: '#43352C' }}
            >
              {cafe.name}
            </h2>
            {cafe.description && (
              <p
                className="font-sans text-sm leading-snug line-clamp-2"
                style={{ color: '#6B6B6B' }}
              >
                {cafe.description}
              </p>
            )}

            <div
              className="mt-4 flex items-center justify-between px-4 py-3 rounded-2xl font-sans text-sm font-semibold transition-all duration-200 group-hover:bg-[#43352C] group-hover:text-white"
              style={{ background: '#F6F0E8', color: '#43352C' }}
            >
              <span>Ver beneficios</span>
              <ArrowRight
                size={15}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
