'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Topbar from '@/components/layout/Topbar'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import type { Profile } from '@/types'

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n()
  const { theme, setTheme } = useTheme()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p as Profile)
      setName(p?.full_name ?? '')
    }
    init()
  }, [supabase])

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    await supabase.from('profiles').update({ full_name: name }).eq('id', profile.id)
    setMsg('Guardado correctamente')
    setSaving(false)
    setTimeout(() => setMsg(''), 2000)
  }

  return (
    <>
      <Topbar title={t('settings')} userId={profile?.id ?? ''} />
      <div className="p-6 max-w-lg space-y-4">
        <div className="card space-y-4">
          <h2 className="font-semibold text-sm">Perfil</h2>
          <div>
            <label className="label">Nombre completo</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">{t('email')}</label>
          </div>
          {msg && <p className="text-xs text-green-600">{msg}</p>}
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Guardando...' : t('save')}
          </button>
        </div>
        <div className="card space-y-3">
          <h2 className="font-semibold text-sm">{t('theme')}</h2>
          <div className="flex gap-2">
            {(['light', 'dark'] as const).map(th => (
              <button key={th} onClick={() => setTheme(th)}
                className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${theme === th ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white font-medium' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                {th === 'light' ? t('light') : t('dark')}
              </button>
            ))}
          </div>
        </div>
        <div className="card space-y-3">
          <h2 className="font-semibold text-sm">{t('language')}</h2>
          <div className="flex gap-2">
            {(['es', 'en'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${lang === l ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white font-medium' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                {l === 'es' ? 'Español' : 'English'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
