'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Topbar from '@/components/layout/Topbar'
import { Plus, Search, Pencil, Trash2, X, Star, Video } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { format } from 'date-fns'
import type { Profile, Player, ScoutType, PlayerPosition } from '@/types'
import clsx from 'clsx'

const POSITIONS: PlayerPosition[] = ['goalkeeper', 'defender', 'midfielder', 'forward']
const posLabel: Record<PlayerPosition, string> = { goalkeeper: 'Portero', defender: 'Defensor', midfielder: 'Mediocampista', forward: 'Delantero' }

interface Report {
  id: string; player_id: string; scout_id: string; type: ScoutType
  report_text: string; goals: number; assists: number; matches: number
  rating: number; video_url: string | null; created_at: string
  player: { full_name: string; current_club: string | null; position: string } | null
  scout: { full_name: string } | null
}

const emptyForm = { player_id: '', type: 'internal' as ScoutType, report_text: '', goals: '0', assists: '0', matches: '0', rating: '0', video_url: '', prospect_name: '', prospect_position: 'forward' as PlayerPosition, prospect_club: '', prospect_nationality: '' }

export default function ScoutingPage() {
  const { t } = useI18n()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [tab, setTab] = useState<'all' | ScoutType>('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Report | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const [{ data: r }, { data: pl }] = await Promise.all([
      supabase.from('scout_reports').select('*, player:players(full_name, current_club, position), scout:profiles(full_name)').order('created_at', { ascending: false }),
      supabase.from('players').select('*').order('full_name'),
    ])
    setReports((r ?? []) as Report[])
    setPlayers((pl ?? []) as Player[])
  }, [supabase])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p as Profile)
      fetchData()
    }
    init()
  }, [supabase, fetchData])

  const filtered = reports.filter(r => {
    const matchesTab = tab === 'all' || r.type === tab
    const matchesSearch = !search || (r.player?.full_name ?? '').toLowerCase().includes(search.toLowerCase())
    return matchesTab && matchesSearch
  })

  function openCreate() { setEditing(null); setForm(emptyForm); setShowModal(true) }
  function openEdit(r: Report) {
    setEditing(r)
    setForm({ player_id: r.player_id, type: r.type, report_text: r.report_text, goals: String(r.goals), assists: String(r.assists), matches: String(r.matches), rating: String(r.rating), video_url: r.video_url ?? '', prospect_name: '', prospect_position: 'forward', prospect_club: '', prospect_nationality: '' })
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    let playerId = form.player_id
    if (!playerId && form.prospect_name) {
      const { data: np } = await supabase.from('players').insert({ full_name: form.prospect_name, position: form.prospect_position, current_club: form.prospect_club || null, nationality: form.prospect_nationality, status: 'active', created_by: user.id }).select().single()
      if (np) { playerId = (np as Player).id; setPlayers(prev => [...prev, np as Player]) }
    }
    if (!playerId) { setSaving(false); return }
    const payload = { player_id: playerId, type: form.type, report_text: form.report_text, goals: Number(form.goals), assists: Number(form.assists), matches: Number(form.matches), rating: Number(form.rating), video_url: form.video_url || null }
    if (editing) await supabase.from('scout_reports').update(payload).eq('id', editing.id)
    else await supabase.from('scout_reports').insert({ ...payload, scout_id: user.id })
    await fetchData()
    setShowModal(false)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar reporte?')) return
    await supabase.from('scout_reports').delete().eq('id', id)
    fetchData()
  }

  const isAdmin = profile?.role === 'admin'
  const avatarColors = ['bg-blue-100 text-blue-700','bg-green-100 text-green-700','bg-purple-100 text-purple-700','bg-amber-100 text-amber-700','bg-rose-100 text-rose-700']
  const initials = (name: string) => name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()

  return (
    <>
      <Topbar title={t('scouting')} userId={profile?.id ?? ''} />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {(['all','internal','external'] as const).map(k => (
                <button key={k} onClick={() => setTab(k)} className={clsx('px-4 py-1.5 text-xs transition-colors', tab===k ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800')}>
                  {k==='all' ? t('all') : k==='internal' ? t('internal') : t('external')}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 w-48">
              <Search size={13} className="text-gray-400" />
              <input className="bg-transparent text-sm outline-none w-full placeholder-gray-400" placeholder={t('search')} value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
          </div>
          <button onClick={openCreate} className="btn-primary"><Plus size={14}/> {t('new_report')}</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((r,i) => {
            const name = r.player?.full_name ?? 'Desconocido'
            const isExp = expanded === r.id
            return (
              <div key={r.id} className="card">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`avatar ${avatarColors[i%avatarColors.length]}`}>{initials(name)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate">{name}</p>
                      <span className={r.type==='internal' ? 'badge-green' : 'badge-blue'}>{r.type==='internal' ? t('internal') : t('external')}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{r.player?.current_club ?? '—'} · {posLabel[r.player?.position as PlayerPosition] ?? '—'}</p>
                    <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">{format(new Date(r.created_at),'dd/MM/yyyy')} · {r.scout?.full_name ?? 'Ojeador'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3 p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  {[{k:t('goals'),v:r.goals},{k:t('assists'),v:r.assists},{k:t('matches'),v:r.matches},{k:t('rating'),v:r.rating.toFixed(1)}].map(s=>(
                    <div key={s.k} className="text-center"><p className="text-xs text-gray-400">{s.k}</p><p className="text-sm font-semibold">{s.v}</p></div>
                  ))}
                </div>
                <div className="flex items-center gap-0.5 mb-3">
                  {[1,2,3,4,5].map(star=><Star key={star} size={13} className={r.rating>=star*2 ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-gray-700'}/>)}
                  <span className="text-xs text-gray-400 ml-1">{r.rating}/10</span>
                </div>
                {r.report_text && (
                  <div className="mb-3">
                    <p className={clsx('text-xs text-gray-500 leading-relaxed', !isExp && 'line-clamp-2')}>{r.report_text}</p>
                    {r.report_text.length>100 && <button onClick={()=>setExpanded(isExp?null:r.id)} className="text-xs text-blue-500 hover:underline mt-0.5">{isExp?'Ver menos':'Ver más'}</button>}
                  </div>
                )}
                {r.video_url && <a href={r.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-500 hover:underline mb-3"><Video size={12}/> Ver video</a>}
                <div className="flex gap-1.5 justify-end border-t border-gray-50 dark:border-gray-800 pt-2.5">
                  <button onClick={()=>openEdit(r)} className="btn-ghost text-xs py-1 px-2.5"><Pencil size={12}/> {t('edit')}</button>
                  {isAdmin && <button onClick={()=>handleDelete(r.id)} className="text-xs py-1 px-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 rounded-lg transition-colors"><Trash2 size={12}/></button>}
                </div>
              </div>
            )
          })}
          {filtered.length===0 && <div className="col-span-3 text-center py-16 text-gray-400"><Search size={32} className="mx-auto mb-2 opacity-30"/><p className="text-sm">{t('no_reports')}</p></div>}
        </div>
      </div>
      {showModal && (
        <div className="modal-overlay">
          <div className="modal max-h-[90vh] overflow-y-auto">
            <div className="modal-header">
              <h2 className="font-semibold">{editing ? 'Editar reporte' : 'Nuevo reporte'}</h2>
              <button onClick={()=>setShowModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X size={16}/></button>
            </div>
            <div className="modal-body">
              <div>
                <label className="label">Tipo</label>
                <div className="flex gap-2">
                  {(['internal','external'] as ScoutType[]).map(type=>(
                    <button key={type} onClick={()=>setForm(f=>({...f,type}))} className={clsx('flex-1 py-2 text-xs rounded-lg border transition-colors', form.type===type ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50')}>
                      {type==='internal' ? t('internal') : t('external')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Jugador existente</label>
                <select className="input" value={form.player_id} onChange={e=>setForm(f=>({...f,player_id:e.target.value}))}>
                  <option value="">— Seleccionar o crear nuevo —</option>
                  {players.map(p=><option key={p.id} value={p.id}>{p.full_name} · {p.current_club ?? '—'}</option>)}
                </select>
              </div>
              {!form.player_id && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl space-y-3">
                  <p className="text-xs font-medium text-gray-500">{t('new_prospect')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><label className="label">{t('name')} *</label><input className="input" value={form.prospect_name} onChange={e=>setForm(f=>({...f,prospect_name:e.target.value}))}/></div>
                    <div><label className="label">{t('position')}</label>
                      <select className="input" value={form.prospect_position} onChange={e=>setForm(f=>({...f,prospect_position:e.target.value as PlayerPosition}))}>
                        {POSITIONS.map(p=><option key={p} value={p}>{posLabel[p]}</option>)}
                      </select></div>
                    <div><label className="label">{t('club')}</label><input className="input" value={form.prospect_club} onChange={e=>setForm(f=>({...f,prospect_club:e.target.value}))}/></div>
                    <div className="col-span-2"><label className="label">{t('nationality')}</label><input className="input" value={form.prospect_nationality} onChange={e=>setForm(f=>({...f,prospect_nationality:e.target.value}))}/></div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-4 gap-3">
                {([['goals',t('goals')],['assists',t('assists')],['matches',t('matches')],['rating',t('rating')]] as [string,string][]).map(([key,label])=>(
                  <div key={key}><label className="label">{label}</label>
                    <input type="number" className="input" value={form[key as keyof typeof form]} min={0} max={key==='rating'?10:999} step={key==='rating'?0.1:1}
                      onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}/>
                  </div>
                ))}
              </div>
              <div><label className="label">Observaciones</label><textarea className="input h-28 resize-none" value={form.report_text} onChange={e=>setForm(f=>({...f,report_text:e.target.value}))}/></div>
              <div><label className="label">{t('video_link')} (opcional)</label><input className="input" value={form.video_url} placeholder="https://..." onChange={e=>setForm(f=>({...f,video_url:e.target.value}))}/></div>
            </div>
            <div className="modal-footer">
              <button onClick={()=>setShowModal(false)} className="btn-ghost">{t('cancel')}</button>
              <button onClick={handleSave} disabled={saving||(!form.player_id&&!form.prospect_name)} className="btn-primary">{saving?'Guardando...':t('save')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
