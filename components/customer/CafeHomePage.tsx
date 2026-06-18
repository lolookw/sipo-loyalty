'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { MapPin, Instagram, Globe, MessageCircle, Coffee, Star, Menu, ExternalLink } from 'lucide-react'

interface Cafe {
  id: string
  slug: string
  name: string
  description: string | null
  logoUrl: string | null
  coverUrl: string | null
  primaryColor: string
  accentColor: string
  menuUrl: string | null
  mapsUrl: string | null
  instagramUrl: string | null
  whatsappUrl: string | null
  websiteUrl: string | null
  customLinks: string | null
  loyaltyEnabled: boolean
  stampEnabled: boolean
  pointsEnabled: boolean
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

const frostedDark = {
  background: 'rgba(255,255,255,0.07)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  border: '1px solid rgba(255,255,255,0.11)',
} as React.CSSProperties

export default function CafeHomePage({ cafe }: { cafe: Cafe }) {
  const hasCover = !!cafe.coverUrl

  const customLinks: { label: string; url: string }[] =
    cafe.customLinks ? JSON.parse(cafe.customLinks) : []

  const links = [
    cafe.menuUrl      && { label: 'Ver Menú',    url: cafe.menuUrl,      icon: <Menu size={15} />,             featured: true },
    cafe.mapsUrl      && { label: 'Cómo llegar', url: cafe.mapsUrl,      icon: <MapPin size={15} /> },
    cafe.instagramUrl && { label: 'Instagram',   url: cafe.instagramUrl, icon: <Instagram size={15} /> },
    cafe.whatsappUrl  && { label: 'WhatsApp',    url: cafe.whatsappUrl,  icon: <MessageCircle size={15} /> },
    cafe.websiteUrl   && { label: 'Sitio web',   url: cafe.websiteUrl,   icon: <Globe size={15} /> },
    ...customLinks.map(l => ({ label: l.label, url: l.url, icon: <ExternalLink size={15} /> })),
  ].filter(Boolean) as { label: string; url: string; icon: React.ReactNode; featured?: boolean }[]

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={!hasCover ? { background: '#FCFBF8' } : undefined}
    >
      {/* ── Background photo + gradient overlay ── */}
      {hasCover && (
        <div className="fixed inset-0 z-0">
          <img src={cafe.coverUrl!} alt="" className="w-full h-full object-cover" />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(15,12,10,0.15) 0%, rgba(15,12,10,0.52) 45%, rgba(15,12,10,0.85) 100%)',
            }}
          />
        </div>
      )}

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col items-center min-h-screen px-5 pt-16 pb-16">
        <div className="w-full max-w-[360px] flex flex-col items-center">

          {/* Logo — círculo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mb-7"
          >
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden"
              style={
                cafe.logoUrl
                  ? hasCover
                    ? {
                        background: 'rgba(255,255,255,0.12)',
                        backdropFilter: 'blur(18px)',
                        WebkitBackdropFilter: 'blur(18px)',
                        border: '1.5px solid rgba(255,255,255,0.2)',
                      }
                    : {
                        background: 'white',
                        border: '1px solid #E9DED1',
                        boxShadow: '0 4px 16px rgba(67,53,44,0.08)',
                      }
                  : { background: '#43352C' }
              }
            >
              {cafe.logoUrl
                ? <img src={cafe.logoUrl} alt={cafe.name} className="w-full h-full object-cover" />
                : <Coffee size={30} color="white" strokeWidth={1.25} />
              }
            </div>
          </motion.div>

          {/* Nombre + descripción */}
          <motion.div initial="hidden" animate="show" className="text-center mb-10">
            <motion.h1
              custom={0}
              variants={fadeUp}
              className="font-serif font-medium tracking-tight leading-none"
              style={{
                fontSize: 'clamp(2rem, 8vw, 2.6rem)',
                color: hasCover ? 'white' : '#43352C',
              }}
            >
              {cafe.name}
            </motion.h1>
            {cafe.description && (
              <motion.p
                custom={1}
                variants={fadeUp}
                className="font-sans text-sm leading-relaxed mt-3 max-w-[270px] mx-auto"
                style={{ color: hasCover ? 'rgba(255,255,255,0.5)' : '#6B6B6B' }}
              >
                {cafe.description}
              </motion.p>
            )}
          </motion.div>

          {/* Links */}
          <motion.div initial="hidden" animate="show" className="w-full space-y-2.5 mb-3">
            {links.map((link, i) => (
              <motion.a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                custom={i + 2}
                variants={fadeUp}
                className="flex items-center gap-3.5 w-full px-5 py-4 rounded-2xl font-sans font-medium text-sm transition-all duration-200 hover:opacity-75 active:scale-[0.98]"
                style={
                  link.featured
                    ? { background: '#43352C', color: 'white' }
                    : hasCover
                      ? { ...frostedDark, color: 'white' }
                      : { background: '#F6F0E8', border: '1px solid #E9DED1', color: '#43352C' }
                }
              >
                <span style={{
                  color: link.featured
                    ? 'rgba(255,255,255,0.65)'
                    : hasCover ? 'rgba(255,255,255,0.45)' : '#6B6B6B',
                }}>
                  {link.icon}
                </span>
                {link.label}
                <ExternalLink size={11} className="ml-auto" style={{ opacity: 0.22 }} />
              </motion.a>
            ))}
          </motion.div>

          {/* Loyalty CTA */}
          {cafe.loyaltyEnabled && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.48, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="w-full mt-1"
            >
              <Link
                href={`/${cafe.slug}/loyalty`}
                className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl transition-all duration-200 hover:opacity-80 active:scale-[0.98]"
                style={hasCover ? frostedDark : { background: '#43352C' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: '#B56A4C' }}
                >
                  <Star size={15} color="white" fill="white" />
                </div>
                <div className="flex-1">
                  <div className="font-sans font-semibold text-sm" style={{ color: 'white' }}>
                    Programa de beneficios
                  </div>
                  <div className="font-sans text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {cafe.stampEnabled && cafe.pointsEnabled
                      ? 'Sellos & puntos'
                      : cafe.stampEnabled ? 'Tarjeta de sellos' : 'Puntos y recompensas'}
                  </div>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1.1rem' }}>→</span>
              </Link>
            </motion.div>
          )}

          <div className="flex items-center gap-2 mt-14">
            <img
              src={hasCover ? '/logo-light.svg' : '/logo.svg'}
              width={16}
              height={16}
              alt=""
              style={{ opacity: hasCover ? 0.3 : 0.4 }}
            />
            <p
              className="font-sans text-xs"
              style={{ color: hasCover ? 'rgba(255,255,255,0.15)' : '#D9C7B2' }}
            >
              Powered by Sipo
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
