'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Topbar from '@/components/layout/Topbar'
import { Plus, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Match, Profile } from '@/types'
import clsx from 'clsx'

const emptyForm = { home_team: '', away_team: '', competition: '', match_date: '', match_time: '20:00' }

export default function CalendarPage() {
  const { t, lang } = useI18n()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [month, setMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Match | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchMatches = useCallback(async () => {
    const { data } = await supabase.from('matches').select('*').order('match_date')
    setMatches((data ?? []) as Match[])
  }, [supabase])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p as Profile)
      fetchMatches()
    }
    init()
  }, [supabase, fetchMatches])

  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) })
  const matchesOnDay = (day: Date) => matches.filter(m => isSameDay(new Date(m.match_date), day))
  const selectedMatches = selectedDay ? matchesOnDay(selectedDay) : []
  const upcoming = matches.filter(m => new Date(m.match_date) >= new Date()).sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()).slice(0, 6)
  const locale = lang === 'es' ? es : undefined
  const isAdmin = profile?.role === 'admin'

  function openCreate(day?: Date) { setEditing(null); setForm({ ...emptyForm, match_date: day ? format(day, 'yyyy-MM-dd') : '' }); setShowModal(true) }
  function openEdit(m: Match) {
    setEditing(m)
    const dt = new Date(m.match_date)
    setForm({ home_team: m.home_team, away_team: m.away_team, competition: m.competition, match_date: format(dt, 'yyyy-MM-dd'), match_time: format(dt, 'HH:mm') })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.home_team || !form.away_team || !form.match_date) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = { home_team: form.home_team, away_team: form.away_team, competition: form.competition, match_date: `${form.match_date}T${form.match_time}:00` }
    if (editing) await supabase.from('matches').update(payload).eq('id', editing.id)
    else await supabase.from('matches').insert({ ...payload, created_by: user?.id })
    await fetchMatches()
    setShowModal(false)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar partido?')) return
    await supabase.from('matches').delete().eq('id', id)
    fetchMatches()
    setSelectedDay(null)
  }

  return (
    <>
      <Topbar title={t('calendar')} userId={profile?.id ?? ''} />
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold capitalize">{format(month, 'MMMM yyyy', { locale })}</h2>
              <div className="flex items-center gap-1">
                {isAdmin && <button onClick={() => openCreate()} className="btn-primary text-xs px-3 py-1.5 mr-2"><Plus size={13} className="inline mr-1" /> {t('add_match')}</button>}
                <button onClick={() => setMonth(m => subMonths(m, 1))} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><ChevronLeft size={16} /></button>
                <button onClick={() => setMonth(new Date())} className="px-3 py-1 text-xs btn-ghost">{t('today')}</button>
                <button onClick={() => setMonth(m => addMonths(m, 1))} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><ChevronRight size={16} /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 mb-1">
              {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => <div key={d} className="text-center text-xs text-gray-400 py-1.5 font-medium">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map(day => {
                const dm = matchesOnDay(day)
                const isSel = selectedDay ? isSameDay(day, selectedDay) : false
                return (
                  <button key={day.toISOString()} onClick={() => setSelectedDay(isSel ? null : day)}
                    className={clsx('min-h-[52px] p-1.5 rounded-lg text-left transition-colors', !isSameMonth(day, month) && 'opacity-30', isSel && 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-300 dark:ring-blue-700', !isSel && 'hover:bg-gray-50 dark:hover:bg-gray-800')}>
                    <span className={clsx('text-xs font-medium inline-flex w-6 h-6 items-center justify-center rounded-full', isToday(day) && 'bg-blue-600 text-white', !isToday(day) && 'text-gray-600 dark:text-gray-400')}>{format(day, 'd')}</span>
                    <div className="mt-0.5 space-y-0.5">
                      {dm.slice(0, 2).map(m => <div key={m.id} className="text-xs truncate bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded px-1 py-0.5 leading-tight">{m.home_team.split(' ')[0]} vs {m.away_team.split(' ')[0]}</div>)}
                      {dm.length > 2 && <div className="text-xs text-gray-400">+{dm.length - 2}</div>}
                    </div>
                  </button>
                )
              })}
            </div>
            {selectedDay && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold">{format(selectedDay, "EEEE d 'de' MMMM", { locale })}</p>
                  {isAdmin && <button onClick={() => openCreate(selectedDay)} className="text-xs text-blue-500 hover:underline">+ Agregar</button>}
                </div>
                {selectedMatches.length === 0 ? <p className="text-xs text-gray-400">Sin partidos</p> : (
                  <div className="space-y-2">
                    {selectedMatches.map(m => (
                      <div key={m.id} className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{m.home_team} vs {m.away_team}</p>
                          <p className="text-xs text-gray-400">{m.competition} · {format(new Date(m.match_date), 'HH:mm')}</p>
                          {m.result && <p className="text-xs text-green-600 font-medium mt-0.5">{m.result}</p>}
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(m)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 text-xs">✏</button>
                            <button onClick={() => handleDelete(m.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-400 text-xs">✕</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="card">
            <h2 className="font-semibold text-sm mb-3">{t('upcoming')}</h2>
            {upcoming.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">{t('no_matches')}</p> : (
              <div className="space-y-2">
                {upcoming.map(m => {
                  const dt = new Date(m.match_date)
                  const diff = Math.ceil((dt.getTime() - Date.now()) / 86400000)
                  return (
                    <div key={m.id} className="flex gap-3 items-start p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" onClick={() => { setMonth(dt); setSelectedDay(dt) }}>
                      <div className="text-center min-w-[36px] bg-gray-100 dark:bg-gray-800 rounded-lg py-1">
                        <p className="text-sm font-bold leading-none">{format(dt, 'd')}</p>
                        <p className="text-xs text-gray-400 uppercase">{format(dt, 'MMM', { locale })}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{m.home_team} vs {m.away_team}</p>
                        <p className="text-xs text-gray-400">{m.competition} · {format(dt, 'HH:mm')}</p>
                      </div>
                      <span className={clsx('badge flex-shrink-0', diff === 0 ? 'badge-blue' : diff <= 3 ? 'badge-amber' : 'badge-gray')}>{diff === 0 ? t('today') : `${diff}d`}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="font-semibold">{editing ? 'Editar partido' : 'Nuevo partido'}</h2>
              <button onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Local *</label><input className="input" value={form.home_team} onChange={e => setForm(f => ({ ...f, home_team: e.target.value }))} /></div>
                <div><label className="label">Visitante *</label><input className="input" value={form.away_team} onChange={e => setForm(f => ({ ...f, away_team: e.target.value }))} /></div>
              </div>
              <div><label className="label">Competición</label><input className="input" value={form.competition} placeholder="Liga, Copa..." onChange={e => setForm(f => ({ ...f, competition: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Fecha *</label><input type="date" className="input" value={form.match_date} onChange={e => setForm(f => ({ ...f, match_date: e.target.value }))} /></div>
                <div><label className="label">Hora</label><input type="time" className="input" value={form.match_time} onChange={e => setForm(f => ({ ...f, match_time: e.target.value }))} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-ghost">{t('cancel')}</button>
              <button onClick={handleSave} disabled={!form.home_team || !form.away_team || !form.match_date || saving} className="btn-primary">{saving ? 'Guardando...' : t('save')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
