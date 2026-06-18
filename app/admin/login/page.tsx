import SuperAdminLoginForm from '@/components/admin/SuperAdminLoginForm'

export default function SuperAdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm px-6">
        <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
          <div className="mb-8">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
              <span className="text-amber-400 text-lg">⚡</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-white mb-1">Sipo Admin</h1>
            <p className="text-zinc-500 text-sm">Acceso restringido</p>
          </div>
          <SuperAdminLoginForm />
        </div>
      </div>
    </div>
  )
}
