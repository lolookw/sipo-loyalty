import Image from 'next/image'
import LoginForm from '@/components/dashboard/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#FCFBF8' }}>
      <div className="w-full max-w-sm px-6">
        <div className="rounded-3xl p-8" style={{ background: 'white', border: '1px solid #E8DECE', boxShadow: '0 2px 24px rgba(67,53,44,0.07)' }}>
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Image src="/logo.svg" width={42} height={42} alt="Sipo" />
              <span style={{ display: 'inline-block', width: 1, height: 32, background: '#43352C', opacity: 0.2 }} />
              <h1 className="font-serif font-semibold" style={{ fontSize: '1.8rem', color: '#43352C', lineHeight: 1 }}>
                Sipo
              </h1>
            </div>
            <p className="font-sans text-sm" style={{ color: '#6B6B6B' }}>Panel de administración</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
