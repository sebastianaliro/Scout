'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Topbar from '@/components/layout/Topbar'
import { Plus, Search, Pencil, Trash2, X } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { differenceInDays, format } from 'date-fns'
import type { Player, Profile, PlayerPosition, PlayerStatus } from '@/types'
import clsx from 'clsx'

const POSITIONS: PlayerPosition[] = ['goalkeeper', 'defender', 'midfielder', 'forward']
const STATUSES: PlayerStatus[] = ['active', 'free', 'negotiating', 'injured']

const posLabel: Record<PlayerPosition, string> = { goalkeeper: 'Portero', defender: 'Defensor', midfielder: 'Mediocampista', forward: 'Delantero' }
const statusLabel: Record<PlayerStatus, string> = { active: 'Activo', free: 'Libre', negotiating: 'Negociando', injured: 'Lesionado' }
const statusBadge: Record<PlayerStatus, string> = { active: 'badge-green', free: 'badge-red', negotiating: 'badge-blue', injured: 'badge-amber' }
const avatarColors = ['bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700']

const empty = { full_name: '', position: 'forward' as PlayerPosition, current_club: '', nationality: '', birth_date: '', contract_end: '', salary_eur: '', market_value_eur: '', status: 'active' as PlayerStatus, notes: '' }

export default function PlayersPage() {
  const { t } = useI18n()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [search, setSearch] = useState('')
  const [posFilter, setPosFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Player | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  const fetchPlayers = useCallback(async () => {
    const { data } = await supabase.from('players').select('*').order('full_name')
    setPlayers((data ?? []) as Player[])
  }, [supabase])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p as Profile)
      fetchPlayers()
    }
    init()
  }, [supabase, fetchPlayers])

  const filtered = players.filter(p => {
    const matchesSearch = !search || p.full_name.toLowerCase().includes(search.toLowerCase()) || (p.current_club ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesPos = !posFilter || p.position === posFilter
    return matchesSearch && matchesPos
  })

  function openCreate() { setEditing(null); setForm(empty); setShowModal(true) }
  function openEdit(p: Player) {
    setEditing(p)
    setForm({ full_name: p.full_name, position: p.position, current_club: p.current_club ?? '', nationality: p.nationality, birth_date: p.birth_date ?? '', contract_end: p.contract_end ?? '', salary_eur: p.salary_eur?.toString() ?? '', market_value_eur: p.market_value_eur?.toString() ?? '', status: p.status, notes: p.notes ?? '' })
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = { full_name: form.full_name, position: form.position, current_club: form.current_club || null, nationality: form.nationality, birth_date: form.birth_date || null, contract_end: form.contract_end || null, salary_eur: form.salary_eur ? Number(form.salary_eur) : null, market_value_eur: form.market_value_eur ? Number(form.market_value_eur) : null, status: form.status, notes: form.notes || null }
    if (editing) await supabase.from('players').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id)
    else await supabase.from('players').insert({ ...payload, created_by: user?.id })
    await fetchPlayers()
    setShowModal(false)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este jugador?')) return
    await supabase.from('players').delete().eq('id', id)
    fetchPlayers()
  }

  const isAdmin = profile?.role === 'admin'
  const initials = (name: string) => name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

  return (
    <>
      <Topbar title={t('my_players')} userId={profile?.id ?? ''} />
      <div className="p-6">
        <div className="card">
          <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
            <div className="flex gap-2">
              <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 w-52">
                <Search size={14} className="text-gray-400" />
                <input className="bg-transparent text-sm outline-none w-full placeholder-gray-400"
                  placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="input w-auto text-xs py-1.5"
                value={posFilter} onChange={e => setPosFilter(e.target.value)}>
                <option value="">{t('all_positions')}</option>
                {POSITIONS.map(p => <option key={p} value={p}>{posLabel[p]}</option>)}
              </select>
            </div>
            {isAdmin && (
              <button onClick={openCreate} className="btn-primary">
                <Plus size={14} /> {t('add_player')}
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Jugador</th>
                  <th className="th">{t('position')}</th>
                  <th className="th">{t('club')}</th>
                  <th className="th">{t('contract_end')}</th>
                  <th className="th">{t('status')}</th>
                  {isAdmin && <th className="th"></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="td text-center text-gray-400 py-10">{t('no_players')}</td></tr>
                )}
                {filtered.map((p, i) => {
                  const days = p.contract_end ? differenceInDays(new Date(p.contract_end), new Date()) : null
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="td">
                        <div className="flex items-center gap-2.5">
                          <div className={`avatar ${avatarColors[i % avatarColors.length]}`}>{initials(p.full_name)}</div>
                          <div>
                            <p className="text-sm font-medium">{p.full_name}</p>
                            <p className="text-xs text-gray-400">{p.nationality}</p>
                          </div>
                        </div>
                      </td>
                      <td className="td text-sm text-gray-600 dark:text-gray-400">{posLabel[p.position]}</td>
                      <td className="td text-sm">{p.current_club ?? '—'}</td>
                      <td className="td">
                        {p.contract_end ? (
                          <div>
                            <p className="text-xs">{format(new Date(p.contract_end), 'MMM yyyy')}</p>
                            <div className="w-20 h-1 bg-gray-100 dark:bg-gray-800 rounded-full mt-1">
                              <div className={clsx('h-1 rounded-full', days !== null && days <= 90 ? 'bg-red-400' : days !== null && days <= 180 ? 'bg-amber-400' : 'bg-green-400')}
                                style={{ width: `${Math.min(100, Math.max(4, (days ?? 0) / 730 * 100))}%` }} />
                            </div>
                            {days !== null && days <= 90 && <p className="text-xs text-red-500 mt-0.5">{days}d</p>}
                          </div>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="td"><span className={statusBadge[p.status]}>{statusLabel[p.status]}</span></td>
                      {isAdmin && (
                        <td className="td">
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"><Pencil size={13} /></button>
                            <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 rounded-md"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal max-h-[90vh] overflow-y-auto">
            <div className="modal-header">
              <h2 className="font-semibold">{editing ? 'Editar jugador' : 'Nuevo jugador'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="label">{t('name')} *</label><input className="input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></div>
                <div><label className="label">{t('position')}</label>
                  <select className="input" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value as PlayerPosition }))}>
                    {POSITIONS.map(p => <option key={p} value={p}>{posLabel[p]}</option>)}
                  </select></div>
                <div><label className="label">{t('status')}</label>
                  <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as PlayerStatus }))}>
                    {STATUSES.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                  </select></div>
                <div><label className="label">{t('club')}</label><input className="input" value={form.current_club} onChange={e => setForm(f => ({ ...f, current_club: e.target.value }))} /></div>
                <div><label className="label">{t('nationality')}</label><input className="input" value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} /></div>
                <div><label className="label">{t('birth_date')}</label><input type="date" className="input" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} /></div>
                <div><label className="label">{t('contract_end')}</label><input type="date" className="input" value={form.contract_end} onChange={e => setForm(f => ({ ...f, contract_end: e.target.value }))} /></div>
                <div><label className="label">{t('salary')}</label><input type="number" className="input" value={form.salary_eur} placeholder="0" onChange={e => setForm(f => ({ ...f, salary_eur: e.target.value }))} /></div>
                <div><label className="label">{t('valuation')}</label><input type="number" className="input" value={form.market_value_eur} placeholder="0" onChange={e => setForm(f => ({ ...f, market_value_eur: e.target.value }))} /></div>
                <div className="col-span-2"><label className="label">Notas</label><textarea className="input h-20 resize-none" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-ghost">{t('cancel')}</button>
              <button onClick={handleSave} disabled={!form.full_name || saving} className="btn-primary">{saving ? 'Guardando...' : t('save')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
