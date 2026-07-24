import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getPlatformConfig, buildContactUrl } from '@/lib/platformConfig'
import { AdminScreenshot, BaristaScreenshot, CustomerScreenshot } from '@/components/demo/AppScreenshots'

// La página lee la config de contacto de la DB → debe renderizarse por request
// para reflejar de inmediato los cambios del superadmin (si fuera estática, Next
// hornearía la config en build-time y no se actualizaría hasta un redeploy).
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Sumá tu cafetería a Sipo',
  description:
    'Ofrecé un programa de fidelidad digital a tus clientes. Sellos, puntos y recompensas sin app que descargar ni tarjetas físicas. Configuralo en minutos.',
  openGraph: {
    title: 'Sipo — Fidelización digital para tu cafetería',
    description:
      'Sellos, puntos y recompensas para tus clientes. Sin app, sin tarjetas. Tus clientes se registran con el email y listo.',
  },
}

const steps = [
  {
    n: '01',
    title: 'Sumás tu cafetería',
    desc: 'Cargás logo, portada, links y activás el programa de fidelidad.',
  },
  {
    n: '02',
    title: 'El cliente ingresa con su email',
    desc: 'Sin app, sin descarga. Solo el email y un código que le mandamos.',
  },
  {
    n: '03',
    title: 'Acumula y canjea',
    desc: 'Ve sus puntos en su perfil y canjea cuando quiere. Sin fricción.',
  },
]

export default async function DemoPage() {
  const config = await getPlatformConfig()
  const contactUrl = buildContactUrl(config, 'Hola, quiero sumar mi cafetería a Sipo') ?? '/sumate'
  const contactExternal = contactUrl.startsWith('http') || contactUrl.startsWith('mailto:')
  const igUrl = config.instagramUrl

  return (
    <div className="min-h-screen" style={{ background: '#FCFBF8', color: '#43352C' }}>
      <div className="mx-auto max-w-5xl px-6 py-5">

        {/* ── Nav pill ── */}
        <nav
          className="sticky top-4 z-20 flex items-center justify-between rounded-full px-5 py-3"
          style={{
            background: 'rgba(252,251,248,0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid #E9DED1',
            boxShadow: '0 4px 24px rgba(67,53,44,0.06)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <Image src="/logo.svg" width={26} height={26} alt="Sipo" />
            <span style={{ display: 'inline-block', width: 1, height: 18, background: '#43352C', opacity: 0.2 }} />
            <span
              className="font-serif font-semibold"
              style={{ fontSize: '1.2rem', letterSpacing: '-0.01em', color: '#43352C' }}
            >
              Sipo
            </span>
          </div>

          <div className="hidden md:flex items-center gap-7 font-sans text-sm" style={{ color: '#6B6B6B' }}>
            <a href="#como-funciona" className="hover:text-[#43352C] transition-colors">Cómo funciona</a>
            <a href="#para-cafeterias" className="hover:text-[#43352C] transition-colors">Para cafeterías</a>
          </div>

          <Link
            href="/login"
            className="font-sans text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:bg-[#B56A4C]"
            style={{ background: '#43352C', color: '#FCFBF8' }}
          >
            Iniciar sesión
          </Link>
        </nav>

        {/* ── Hero ── */}
        <section className="pt-14 pb-16 max-w-2xl">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-sans text-sm mb-8"
            style={{ background: '#F6F0E8', color: '#6B6B6B', border: '1px solid #E9DED1' }}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#B56A4C' }} />
            Fidelización para cafeterías de especialidad
          </div>

          <h1
            className="font-serif mb-6"
            style={{
              fontSize: 'clamp(3rem, 9vw, 5.2rem)',
              fontWeight: 600,
              lineHeight: 0.93,
              letterSpacing: '-0.03em',
              color: '#43352C',
            }}
          >
            Sipo.<br />
            <span style={{ color: '#B56A4C' }}>Cada café</span><br />
            cuenta.
          </h1>

          <p
            className="font-sans text-base leading-7 mb-8 max-w-md"
            style={{ color: '#6B6B6B' }}
          >
            La plataforma de fidelización que convierte visitas en vínculo,
            y clientes en habitués. Simple para el barista, cómoda para el cliente.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/sumate"
              className="font-sans font-semibold text-sm px-6 py-3 rounded-[14px] transition-all hover:bg-[#B56A4C] active:scale-[0.98]"
              style={{ background: '#43352C', color: '#FCFBF8' }}
            >
              Quiero sumarme
            </Link>
            <a
              href="#como-funciona"
              className="font-sans font-semibold text-sm px-6 py-3 rounded-[14px] transition-all hover:bg-[#F0E9DF]"
              style={{ border: '1px solid #D9C7B2', background: 'white', color: '#43352C' }}
            >
              Cómo funciona ↓
            </a>
          </div>
        </section>

        {/* ── Cómo funciona + Screenshots ── */}
        <section id="como-funciona" className="pt-4 pb-20">
          <div className="mb-12">
            <p
              className="font-sans text-xs font-semibold uppercase tracking-[0.18em] mb-3"
              style={{ color: '#B56A4C' }}
            >
              Cómo funciona
            </p>
            <h2
              className="font-serif"
              style={{
                fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: '-0.025em',
                color: '#43352C',
              }}
            >
              Simple para la cafetería.<br />Natural para el cliente.
            </h2>
          </div>

          <div className="grid gap-10 md:grid-cols-3">

            {/* 01 — Admin */}
            <div className="flex flex-col gap-4">
              <div>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mb-4 font-sans font-semibold text-sm"
                  style={{ background: '#F6F0E8', color: '#B56A4C' }}
                >
                  01
                </div>
                <h3 className="font-sans font-semibold text-base mb-2" style={{ color: '#43352C' }}>
                  Panel de admin
                </h3>
                <p className="font-sans text-sm leading-6" style={{ color: '#6B6B6B' }}>
                  Configurás el programa a tu medida: cantidad de sellos, recompensas y colores de tu marca.
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid #E9DED1', pointerEvents: 'none' }}>
                <AdminScreenshot />
              </div>
            </div>

            {/* 02 — Barista */}
            <div className="flex flex-col gap-4">
              <div>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mb-4 font-sans font-semibold text-sm"
                  style={{ background: '#F6F0E8', color: '#B56A4C' }}
                >
                  02
                </div>
                <h3 className="font-sans font-semibold text-base mb-2" style={{ color: '#43352C' }}>
                  El barista lo opera solo
                </h3>
                <p className="font-sans text-sm leading-6" style={{ color: '#6B6B6B' }}>
                  Busca al cliente por email o nombre, le suma sellos o registra la compra. En dos clics.
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid #E9DED1', pointerEvents: 'none' }}>
                <BaristaScreenshot />
              </div>
            </div>

            {/* 03 — Cliente */}
            <div className="flex flex-col gap-4">
              <div>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mb-4 font-sans font-semibold text-sm"
                  style={{ background: '#F6F0E8', color: '#B56A4C' }}
                >
                  03
                </div>
                <h3 className="font-sans font-semibold text-base mb-2" style={{ color: '#43352C' }}>
                  El cliente acumula y canjea
                </h3>
                <p className="font-sans text-sm leading-6" style={{ color: '#6B6B6B' }}>
                  Ve sus sellos y puntos desde el celular. Sin app, sin tarjeta física. Solo su email.
                </p>
              </div>
              <div className="flex justify-center">
                <div style={{ pointerEvents: 'none' }}>
                  <CustomerScreenshot />
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── Steps ── */}
        <section id="para-cafeterias" className="pb-20">
          <div className="mb-10">
            <p
              className="font-sans text-xs font-semibold uppercase tracking-[0.18em] mb-3"
              style={{ color: '#66725F' }}
            >
              Tres pasos
            </p>
            <h2
              className="font-serif"
              style={{
                fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: '-0.025em',
                color: '#43352C',
              }}
            >
              Tu cafetería en Sipo<br />en minutos.
            </h2>
          </div>

          <div className="space-y-3">
            {steps.map(s => (
              <div
                key={s.n}
                className="flex items-start gap-5 rounded-[24px] p-6"
                style={{
                  background: '#FCFBF8',
                  border: '1px solid #E9DED1',
                  boxShadow: '0 4px 16px rgba(67,53,44,0.03)',
                }}
              >
                <div
                  className="font-serif font-semibold flex-shrink-0 mt-0.5"
                  style={{ fontSize: '1.4rem', color: '#D9C7B2', lineHeight: 1 }}
                >
                  {s.n}
                </div>
                <div>
                  <div className="font-sans font-semibold text-sm mb-1" style={{ color: '#43352C' }}>
                    {s.title}
                  </div>
                  <div className="font-sans text-sm leading-6" style={{ color: '#6B6B6B' }}>
                    {s.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA dark ── */}
        <section
          className="rounded-[32px] mb-16 p-8 md:p-12 text-center"
          style={{ background: '#43352C' }}
        >
          <div className="flex items-center justify-center gap-1.5 mb-7">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="rounded-full"
                style={{
                  width: i === 1 ? 8 : 5,
                  height: i === 1 ? 8 : 5,
                  background: i === 1 ? '#B56A4C' : 'rgba(255,255,255,0.18)',
                }}
              />
            ))}
          </div>
          <h2
            className="font-serif text-white mb-3"
            style={{
              fontSize: 'clamp(1.8rem, 5vw, 3rem)',
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: '-0.025em',
            }}
          >
            ¿Querés tu cafetería<br />en Sipo?
          </h2>
          <p
            className="font-sans mb-8 max-w-sm mx-auto text-sm leading-7"
            style={{ color: 'rgba(255,255,255,0.45)' }}
          >
            Escribinos y arrancamos. Sin contratos ni letra chica.
          </p>
          <a
            href={contactUrl}
            {...(contactExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="inline-block font-sans font-semibold text-sm px-8 py-3.5 rounded-full transition-all hover:opacity-85 active:scale-[0.98]"
            style={{ background: '#B56A4C', color: 'white' }}
          >
            Hablemos
          </a>
        </section>

        {/* ── Footer ── */}
        <footer
          className="border-t py-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between font-sans"
          style={{ borderColor: '#E9DED1' }}
        >
          <div>
            <div className="flex items-center gap-2">
              <Image src="/logo.svg" width={22} height={22} alt="Sipo" />
              <span style={{ display: 'inline-block', width: 1, height: 16, background: '#43352C', opacity: 0.2 }} />
              <span
                className="font-serif font-semibold"
                style={{ fontSize: '1.1rem', color: '#43352C' }}
              >
                Sipo
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: '#6B6B6B' }}>Cada café cuenta.</p>
          </div>
          <div className="flex gap-5 text-sm" style={{ color: '#6B6B6B' }}>
            {igUrl && (
              <a href={igUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#43352C] transition-colors">Instagram</a>
            )}
            <a
              href={contactUrl}
              {...(contactExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="hover:text-[#43352C] transition-colors"
            >
              Contacto
            </a>
            <Link href="/login" className="hover:text-[#43352C] transition-colors">
              Iniciar sesión
            </Link>
          </div>
        </footer>

      </div>
    </div>
  )
}