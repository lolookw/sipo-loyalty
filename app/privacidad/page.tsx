import type { Metadata } from 'next'
import Link from 'next/link'
import { getPlatformConfig } from '@/lib/platformConfig'

export const metadata: Metadata = {
  title: 'Política de Privacidad',
  description: 'Cómo Sipo trata los datos de los clientes de las cafeterías.',
}

export const dynamic = 'force-dynamic'

const ACTUALIZADO = '1 de septiembre de 2026'

export default async function PrivacidadPage() {
  const { contactEmail } = await getPlatformConfig()
  const contacto = contactEmail ?? 'hola@sipo.ar'
  const mail = (
    <a href={`mailto:${contacto}`} className="underline" style={{ color: '#43352C' }}>{contacto}</a>
  )

  return (
    <div className="min-h-screen" style={{ background: '#FCFBF8', color: '#43352C' }}>
      <div className="max-w-2xl mx-auto px-5 py-12 sm:py-16">
        <Link href="/" className="font-sans text-xs" style={{ color: '#9B9089' }}>← Volver</Link>

        <h1 className="font-serif mt-6 mb-2" style={{ fontSize: '2rem', fontWeight: 600 }}>
          Política de Privacidad
        </h1>
        <p className="font-sans text-sm mb-2" style={{ color: '#6B6B6B' }}>
          Qué datos guardamos cuando te sumás al programa de una cafetería, para qué los usamos y
          cómo pedirnos que dejemos de hacerlo.
        </p>
        <p className="font-sans text-xs mb-12" style={{ color: '#C0B4A8' }}>
          Última actualización: {ACTUALIZADO}
        </p>

        <div className="space-y-4 font-sans text-sm leading-relaxed" style={{ color: '#5C5149' }}>
          <p>
            Guardamos tu nombre y tu email, que son los datos que identifican tu tarjeta. Si querés,
            podés sumar tu teléfono, tu cumpleaños y tu café favorito: eso es opcional. También
            guardamos tu actividad en el programa, como sellos, puntos y canjes.
          </p>
          <p>
            No guardamos datos de tus tarjetas ni de tus medios de pago. Sipo no procesa los pagos
            que hacés en el mostrador.
          </p>
          <p>
            Usamos esos datos para mostrarte tu tarjeta, para avisarte cosas sobre ella (el código
            para entrar, cuando estás por perder sellos o cuando tenés un premio esperándote) y
            para enviarte novedades, promociones y ofertas de la cafetería en la que te registraste
            y también de Sipo, como eventos relacionados al café o beneficios de la plataforma.
          </p>
          <p>
            Todos los emails promocionales tienen abajo un enlace para darte de baja. Un click y
            listo. Darte de baja no afecta los avisos importantes sobre tu tarjeta ni tus sellos
            acumulados.
          </p>
          <p>
            No vendemos tus datos. La cafetería donde te registraste ve tu actividad en su programa,
            porque es su programa. Fuera de eso, solo usamos los proveedores que necesitamos para
            que el servicio funcione, como el que envía los emails o donde está alojada la base de
            datos, y no pueden usar tus datos para otra cosa.
          </p>
          <p>
            Podés pedirnos en cualquier momento que te digamos qué datos tuyos tenemos, que
            corrijamos algo que esté mal o que los eliminemos. Escribinos a {mail} y lo resolvemos.
          </p>
        </div>

        <p className="font-sans text-xs pt-6 mt-12" style={{ color: '#C0B4A8', borderTop: '1px solid #E9DED1' }}>
          Sipo® · Cada café cuenta.
        </p>
      </div>
    </div>
  )
}
