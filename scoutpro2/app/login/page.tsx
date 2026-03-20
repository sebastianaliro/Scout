'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

type View = 'login' | 'recover' | 'sent'

export default function LoginPage() {
  const [view, setView] = useState<View>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(
        error.message.includes('Invalid login credentials')
          ? 'Email o contraseña incorrectos.'
          : error.message.includes('Email not confirmed')
          ? 'Confirmá tu email antes de ingresar.'
          : `Error: ${error.message}`
      )
      setLoading(false)
    } else {
      // Full page reload so Next.js server reads the new session cookie
      window.location.href = '/dashboard'
    }
  }

  async function handleRecover(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    if (error) setError('Error al enviar el email.')
    else setView('sent')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Scout<span className="text-blue-600">Pro</span></h1>
          <p className="text-sm text-gray-500 mt-1">Sports Agency Platform</p>
        </div>

        {view === 'login' && (
          <div className="card shadow-sm">
            <h2 className="font-semibold mb-5">Iniciar sesión</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={email} required autoComplete="email"
                  placeholder="tu@email.com" onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="label">Contraseña</label>
                <div className="relative">
                  <input className="input pr-10" type={showPw ? 'text' : 'password'} value={password}
                    required autoComplete="current-password" placeholder="••••••••"
                    onChange={e => setPassword(e.target.value)} />
                  <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                  <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Entrando...' : 'Iniciar sesión'}
              </button>
            </form>
            <div className="mt-4 text-center">
              <button onClick={() => { setView('recover'); setError('') }}
                className="text-xs text-blue-600 hover:underline">
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </div>
        )}

        {view === 'recover' && (
          <div className="card shadow-sm">
            <h2 className="font-semibold mb-1">Recuperar contraseña</h2>
            <p className="text-xs text-gray-400 mb-5">Te enviaremos un link por email.</p>
            <form onSubmit={handleRecover} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={email} required autoFocus
                  placeholder="tu@email.com" onChange={e => setEmail(e.target.value)} />
              </div>
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                  <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Enviando...' : 'Enviar link'}
              </button>
            </form>
            <div className="mt-4 text-center">
              <button onClick={() => { setView('login'); setError('') }}
                className="text-xs text-gray-400 hover:underline">← Volver</button>
            </div>
          </div>
        )}

        {view === 'sent' && (
          <div className="card shadow-sm text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                <path d="M4 10l4 4 8-8" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="font-semibold mb-2">Email enviado</h2>
            <p className="text-sm text-gray-500 mb-6">Revisá tu bandeja en <strong>{email}</strong>.</p>
            <button onClick={() => setView('login')} className="btn-ghost w-full">Volver al login</button>
          </div>
        )}
      </div>
    </div>
  )
}
