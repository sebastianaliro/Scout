'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Topbar from '@/components/layout/Topbar'
import { ChevronDown, ChevronUp, Trophy, Clock } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { format, isPast } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Match, Profile } from '@/types'
import clsx from 'clsx'

export default function FixturesPage() {
  const { t, lang } = useI18n()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'played'>('all')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editingResult, setEditingResult] = useState<string | null>(null)
  const [resultInput, setResultInput] = useState('')

  const fetchMatches = useCallback(async () => {
    const { data } = await supabase.from('matches').select('*').order('match_date', { ascending: false })
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

  const filtered = matches.filter(m => {
    if (filter === 'upcoming') return !isPast(new Date(m.match_date))
    if (filter === 'played') return isPast(new Date(m.match_date))
    return true
  })

  const grouped = filtered.reduce((acc, m) => {
    const comp = m.competition || 'Sin competición'
    if (!acc[comp]) acc[comp] = []
    acc[comp].push(m)
    return acc
  }, {} as Record<string, Match[]>)

  useEffect(() => {
    if (Object.keys(grouped).length > 0 && expanded.size === 0) {
      setExpanded(new Set(Object.keys(grouped)))
    }
  }, [matches])

  const isAdmin = profile?.role === 'admin'
  const locale = lang === 'es' ? es : undefined

  async function saveResult(id: string) {
    await supabase.from('matches').update({ result: resultInput }).eq('id', id)
    setEditingResult(null)
    setResultInput('')
    fetchMatches()
  }

  return (
    <>
      <Topbar title={t('fixtures')} userId={profile?.id ?? ''} />
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[{ label: 'Total', value: matches.length }, { label: 'Próximos', value: matches.filter(m => !isPast(new Date(m.match_date))).length }, { label: 'Jugados', value: matches.filter(m => isPast(new Date(m.match_date))).length }].map(s => (
            <div key={s.label} className="stat-card"><p className="text-xs text-gray-400 mb-1">{s.label}</p><p className="text-xl font-semibold">{s.value}</p></div>
          ))}
        </div>
        <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden w-fit">
          {(['all', 'upcoming', 'played'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={clsx('px-5 py-2 text-xs transition-colors', filter === f ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800')}>
              {f === 'all' ? t('all') : f === 'upcoming' ? 'Próximos' : 'Jugados'}
            </button>
          ))}
        </div>
        {Object.keys(grouped).length === 0 && (
          <div className="card text-center py-16"><Trophy size={32} className="mx-auto mb-2 text-gray-200 dark:text-gray-700" /><p className="text-sm text-gray-400">{t('no_matches')}</p></div>
        )}
        <div className="space-y-3">
          {Object.entries(grouped).map(([comp, ms]) => {
            const isExp = expanded.has(comp)
            return (
              <div key={comp} className="card p-0 overflow-hidden">
                <button onClick={() => setExpanded(prev => { const next = new Set(prev); if (next.has(comp)) next.delete(comp); else next.add(comp); return next })}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <Trophy size={14} className="text-amber-500" />
                    <span className="text-sm font-semibold">{comp}</span>
                    <span className="badge badge-gray">{ms.length} partidos</span>
                  </div>
                  {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {isExp && (
                  <div className="border-t border-gray-100 dark:border-gray-800">
                    {ms.map((m, idx) => {
                      const dt = new Date(m.match_date)
                      const played = isPast(dt)
                      const isEdit = editingResult === m.id
                      return (
                        <div key={m.id} className={clsx('flex items-center gap-4 px-4 py-3 border-b border-gray-50 dark:border-gray-800/50 last:border-b-0', idx % 2 !== 0 && 'bg-gray-50/50 dark:bg-gray-800/20')}>
                          <div className="min-w-[56px] text-center">
                            <p className="text-xs font-semibold">{format(dt, 'd MMM', { locale })}</p>
                            <p className="text-xs text-gray-400">{format(dt, 'HH:mm')}</p>
                          </div>
                          <div className="flex-1 flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium text-right flex-1 truncate">{m.home_team}</span>
                            <span className="text-xs text-gray-400 font-medium px-1">vs</span>
                            <span className="text-sm font-medium flex-1 truncate">{m.away_team}</span>
                          </div>
                          <div className="min-w-[110px] flex items-center justify-end gap-2">
                            {played ? (
                              isEdit ? (
                                <div className="flex items-center gap-1">
                                  <input autoFocus className="input w-20 text-center text-sm py-1" value={resultInput} placeholder="2-1"
                                    onChange={e => setResultInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') saveResult(m.id); if (e.key === 'Escape') setEditingResult(null) }} />
                                  <button onClick={() => saveResult(m.id)} className="btn-primary text-xs px-2 py-1">✓</button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  {m.result ? <span className="text-sm font-bold bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg">{m.result}</span> : <span className="text-xs text-gray-400 italic">Sin resultado</span>}
                                  {isAdmin && <button onClick={() => { setEditingResult(m.id); setResultInput(m.result ?? '') }} className="text-xs text-blue-500 hover:underline">{m.result ? 'Editar' : 'Agregar'}</button>}
                                </div>
                              )
                            ) : (
                              <div className="flex items-center gap-1.5 text-blue-500">
                                <Clock size={12} />
                                <span className="text-xs">{Math.ceil((dt.getTime() - Date.now()) / 86400000) === 0 ? t('today') : `${Math.ceil((dt.getTime() - Date.now()) / 86400000)}d`}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
