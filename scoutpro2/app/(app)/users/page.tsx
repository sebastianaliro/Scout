'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Topbar from '@/components/layout/Topbar'
import { UserPlus, X, Shield, Eye, Trash2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { format } from 'date-fns'
import type { Profile } from '@/types'

export default function UsersPage() {
  const { t } = useI18n()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [users, setUsers] = useState<Profile[]>([])
  const [showModal, setShowModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'scout'>('scout')
  const [invitePassword, setInvitePassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setUsers((data ?? []) as Profile[])
  }, [supabase])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p as Profile)
      fetchUsers()
    }
    init()
  }, [supabase, fetchUsers])

  async function handleChangeRole(userId: string, role: 'admin' | 'scout') {
    await supabase.from('profiles').update({ role }).eq('id', userId)
    fetchUsers()
  }

  async function handleInvite() {
    if (!inviteEmail || !invitePassword || !inviteName) return
    setSaving(true)
    setMsg('')
    const { data, error } = await supabase.auth.signUp({ email: inviteEmail, password: invitePassword, options: { data: { full_name: inviteName } } })
    if (error) { setMsg('Error: ' + error.message) }
    else if (data.user) {
      await supabase.from('profiles').upsert({ id: data.user.id, email: inviteEmail, full_name: inviteName, role: inviteRole })
      setMsg('Usuario creado correctamente')
      setInviteEmail(''); setInviteName(''); setInvitePassword('')
      await fetchUsers()
      setTimeout(() => { setShowModal(false); setMsg('') }, 1500)
    }
    setSaving(false)
  }

  if (profile && profile.role !== 'admin') {
    return (
      <>
        <Topbar title={t('users')} userId={profile.id} />
        <div className="p-6 text-center text-gray-400 mt-20">Solo el administrador puede gestionar usuarios.</div>
      </>
    )
  }

  const initials = (u: Profile) => (u.full_name || u.email).split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

  return (
    <>
      <Topbar title={t('users')} userId={profile?.id ?? ''} />
      <div className="p-6">
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{users.length} usuario{users.length !== 1 ? 's' : ''}</p>
            <button onClick={() => setShowModal(true)} className="btn-primary"><UserPlus size={14} /> {t('invite_user')}</button>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-3 py-3">
                <div className="avatar bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs">{initials(u)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{u.full_name || '—'}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {u.role === 'admin' ? <Shield size={12} className="text-blue-500" /> : <Eye size={12} className="text-gray-400" />}
                    <span className="text-xs text-gray-500">{u.role === 'admin' ? t('admin') : t('scout')}</span>
                  </div>
                  {profile && u.id !== profile.id && (
                    <select value={u.role} onChange={e => handleChangeRole(u.id, e.target.value as 'admin' | 'scout')} className="input w-auto text-xs py-1 px-2">
                      <option value="scout">{t('scout')}</option>
                      <option value="admin">{t('admin')}</option>
                    </select>
                  )}
                  <span className="text-xs text-gray-300 dark:text-gray-600">{format(new Date(u.created_at), 'dd/MM/yy')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="font-semibold">{t('invite_user')}</h2>
              <button onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div><label className="label">Nombre completo</label><input className="input" value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Juan López" /></div>
              <div><label className="label">{t('email')}</label><input className="input" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="juan@agencia.com" /></div>
              <div><label className="label">Contraseña inicial</label><input className="input" type="password" value={invitePassword} onChange={e => setInvitePassword(e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
              <div><label className="label">{t('role')}</label>
                <select className="input" value={inviteRole} onChange={e => setInviteRole(e.target.value as 'admin' | 'scout')}>
                  <option value="scout">{t('scout')}</option>
                  <option value="admin">{t('admin')}</option>
                </select>
              </div>
              {msg && <p className={`text-xs ${msg.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>{msg}</p>}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-ghost">{t('cancel')}</button>
              <button onClick={handleInvite} disabled={saving || !inviteEmail || !inviteName || !invitePassword} className="btn-primary">{saving ? 'Creando...' : t('invite')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
