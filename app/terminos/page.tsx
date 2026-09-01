import type { Metadata } from 'next'
import Link from 'next/link'
import { getPlatformConfig } from '@/lib/platformConfig'

export const metadata: Metadata = {
  title: 'Términos y Condiciones',
  description: 'Términos y Condiciones de Sipo para cafeterías y para clientes.',
}

// Lee el email de contacto de la config de la plataforma → no puede hornearse en el build.
export const dynamic = 'force-dynamic'

const ACTUALIZADO = '1 de septiembre de 2026'

export default async function TerminosPage() {
  const { contactEmail } = await getPlatformConfig()
  const contacto = contactEmail ?? 'hola@sipo.ar'
  const mail = (
    <a href={`mailto:${contacto}`} className="underline" style={{ color: '#43352C' }}>{contacto}</a>
  )
  const privacidad = (
    <Link href="/privacidad" className="underline" style={{ color: '#43352C' }}>Política de Privacidad</Link>
  )

  return (
    <div className="min-h-screen" style={{ background: '#FCFBF8', color: '#43352C' }}>
      <div className="max-w-2xl mx-auto px-5 py-12 sm:py-16">
        <Link href="/" className="font-sans text-xs" style={{ color: '#9B9089' }}>← Volver</Link>

        <h1 className="font-serif mt-6 mb-2" style={{ fontSize: '2rem', fontWeight: 600 }}>
          Términos y Condiciones
        </h1>
        <p className="font-sans text-xs mb-12" style={{ color: '#C0B4A8' }}>
          Última actualización: {ACTUALIZADO}
        </p>

        <h2 className="font-serif mb-5" style={{ fontSize: '1.3rem', fontWeight: 600 }}>
          Para cafeterías
        </h2>
        <ol className="space-y-4 font-sans text-sm leading-relaxed mb-14 list-decimal pl-5" style={{ color: '#5C5149' }}>
          <li>
            Al crear tu cuenta en Sipo, aceptás estos Términos y Condiciones.
          </li>
          <li>
            Al sumar tu cafetería a Sipo, aceptás formar parte del programa de fidelización y
            ofrecer a tus clientes los beneficios que vos definas.
          </li>
          <li>
            Sos responsable de mantener actualizada la información de tus beneficios, promociones,
            descuentos o premios, y de cumplir con lo que les ofrecés a tus clientes.
          </li>
          <li>
            Los sellos, puntos y recompensas funcionan según las condiciones que configures en tu
            panel: vigencia, monto mínimo de compra, cantidad de sellos, stock o días disponibles.
          </li>
          <li>
            Si una compra se cancela o se devuelve, los sellos o puntos otorgados por esa operación
            podrán ser descontados.
          </li>
          <li>
            Sipo tiene un plan gratuito y planes pagos según la cantidad de clientes que quieras
            registrar. Si contratás un plan pago, el cobro es mensual y automático, y podés
            cancelarlo cuando quieras desde tu panel. Si cambiamos el precio de tu plan, te avisamos
            antes por email.
          </li>
          <li>
            Si dejás de participar del programa o das de baja tu suscripción, los sellos y puntos de
            tus clientes podrán ser removidos. Avisales con tiempo si eso va a pasar.
          </li>
          <li>
            Podemos actualizar o modificar el funcionamiento del programa para mejorar el servicio.
            Si hubiera cambios importantes, los informamos previamente.
          </li>
          <li>
            Hacemos lo posible para que el servicio esté siempre disponible, pero puede haber
            interrupciones o errores. No respondemos por el resultado comercial de tu programa de
            fidelidad ni por pérdidas derivadas de causas ajenas a nosotros, como cortes de internet
            o de energía en tu local.
          </li>
          <li>
            En caso de detectar un uso incorrecto, fraudulento o fuera de las reglas del programa,
            la cuenta podrá ser suspendida temporalmente o dada de baja.
          </li>
          <li>
            Los datos de tu cafetería y de tus clientes se tratan de acuerdo con nuestra {privacidad}.
            Como sos vos quien tiene la relación directa con tus clientes, sos responsable de haber
            obtenido su consentimiento para registrarlos en el programa. Si un cliente tuyo hace un
            reclamo porque sus datos se cargaron o se usaron sin su permiso, ese reclamo lo
            respondés vos.
          </li>
          <li>
            Si alguna de estas condiciones quedara sin efecto, las demás siguen valiendo igual.
          </li>
          <li>Ante cualquier duda o problema, escribinos a {mail}.</li>
        </ol>

        <h2 className="font-serif mb-5 pt-2" style={{ fontSize: '1.3rem', fontWeight: 600, borderTop: '1px solid #E9DED1', paddingTop: '2.5rem' }}>
          Para clientes
        </h2>
        <ol className="space-y-4 font-sans text-sm leading-relaxed list-decimal pl-5" style={{ color: '#5C5149' }}>
          <li>
            Al registrarte en una cafetería que usa Sipo, aceptás estos Términos y Condiciones.
          </li>
          <li>
            Al sumarte al programa de una cafetería que usa Sipo, podés juntar sellos y puntos y
            acceder a los beneficios que ofrezca ese comercio.
          </li>
          <li>
            Los sellos y puntos se obtienen según las reglas de cada cafetería y pueden variar
            dependiendo de la compra, la promoción o el beneficio vigente.
          </li>
          <li>Los sellos, puntos y beneficios son personales y no pueden cambiarse por dinero.</li>
          <li>
            Algunos pueden tener fecha de vencimiento. Siempre vas a poder consultar tu saldo y las
            condiciones de cada beneficio desde tu tarjeta, antes de usarlo.
          </li>
          <li>
            Los premios, descuentos y promociones pueden estar sujetos a disponibilidad, stock o
            fechas específicas.
          </li>
          <li>
            Si una compra se cancela o se devuelve, los sellos o puntos obtenidos con esa compra
            también pueden ser descontados.
          </li>
          <li>
            Cada cafetería puede actualizar sus beneficios y promociones. Si hay algún cambio
            importante en el funcionamiento general del programa, te lo vamos a comunicar.
          </li>
          <li>
            Queremos que el programa se use de forma justa. Si detectamos movimientos sospechosos o
            un uso indebido, podemos revisar o suspender una cuenta.
          </li>
          <li>
            Los sellos, puntos y beneficios dependen de que la cafetería siga participando del
            programa. Si deja de usar Sipo o da de baja su suscripción, los sellos y puntos que
            tengas con ella podrán ser removidos.
          </li>
          <li>Tus datos serán tratados de acuerdo con nuestra {privacidad}.</li>
          <li>Si necesitás ayuda, escribinos a {mail}.</li>
        </ol>

        <p className="font-sans text-xs leading-relaxed mt-10" style={{ color: '#9B9089' }}>
          Al registrarte confirmás que leíste y entendés estas condiciones, que tenés capacidad
          legal para aceptarlas y que la información que cargás es verdadera.
        </p>

        <p className="font-sans text-xs pt-6 mt-12" style={{ color: '#C0B4A8', borderTop: '1px solid #E9DED1' }}>
          Sipo® · Cada café cuenta.
        </p>
      </div>
    </div>
  )
}
