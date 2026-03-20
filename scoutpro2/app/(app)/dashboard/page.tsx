import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import { Users, AlertTriangle, Search, Trophy } from 'lucide-react'
import { differenceInDays, format } from 'date-fns'
import type { Player } from '@/types'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: players }, { data: reports }, { data: matches }] = await Promise.all([
    supabase.from('players').select('*').order('full_name'),
    supabase.from('scout_reports').select('id').order('created_at', { ascending: false }).limit(20),
    supabase.from('matches').select('*').gte('match_date', new Date().toISOString()).order('match_date').limit(4),
  ])

  const allPlayers = (players ?? []) as Player[]
  const active = allPlayers.filter(p => p.status === 'active').length
  const expiring = allPlayers.filter(p => p.contract_end && differenceInDays(new Date(p.contract_end), new Date()) <= 90)

  const statusBadge: Record<string, string> = {
    active: 'badge-green', free: 'badge-red', negotiating: 'badge-blue', injured: 'badge-amber'
  }
  const statusLabel: Record<string, string> = {
    active: 'Activo', free: 'Libre', negotiating: 'Negociando', injured: 'Lesionado'
  }
  const posLabel: Record<string, string> = {
    goalkeeper: 'Portero', defender: 'Defensor', midfielder: 'Mediocampista', forward: 'Delantero'
  }
  const avatarColors = ['bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700']
  const initials = (name: string) => name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

  return (
    <>
      <Topbar title="Dashboard" userId={user.id} />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Jugadores activos', value: active, icon: Users, color: 'text-blue-600', sub: `de ${allPlayers.length} totales` },
            { label: 'Contratos por vencer', value: expiring.length, icon: AlertTriangle, color: 'text-amber-500', sub: 'en 90 días' },
            { label: 'Reportes scouting', value: reports?.length ?? 0, icon: Search, color: 'text-purple-600', sub: 'en total' },
            { label: 'Próximos partidos', value: matches?.length ?? 0, icon: Trophy, color: 'text-green-600', sub: 'agendados' },
          ].map(item => (
            <div key={item.label} className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                <item.icon size={16} className={item.color} />
              </div>
              <p className="text-2xl font-semibold">{item.value}</p>
              <p className="text-xs text-gray-400 mt-1">{item.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent players */}
          <div className="card">
            <h2 className="font-semibold text-sm mb-3">Jugadores recientes</h2>
            {allPlayers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Sin jugadores aún</p>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {allPlayers.slice(0, 5).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 py-2.5">
                    <div className={`avatar ${avatarColors[i % avatarColors.length]}`}>{initials(p.full_name)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.full_name}</p>
                      <p className="text-xs text-gray-400">{p.current_club ?? '—'} · {posLabel[p.position]}</p>
                    </div>
                    <span className={statusBadge[p.status]}>{statusLabel[p.status]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming matches */}
          <div className="card">
            <h2 className="font-semibold text-sm mb-3">Próximos partidos</h2>
            {!matches || matches.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Sin partidos agendados</p>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {matches.map(m => (
                  <div key={m.id} className="flex items-center gap-3 py-2.5">
                    <div className="text-center min-w-[40px]">
                      <p className="text-lg font-semibold leading-none">{format(new Date(m.match_date), 'd')}</p>
                      <p className="text-xs text-gray-400 uppercase">{format(new Date(m.match_date), 'MMM')}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.home_team} vs {m.away_team}</p>
                      <p className="text-xs text-gray-400">{m.competition} · {format(new Date(m.match_date), 'HH:mm')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Expiring contracts warning */}
        {expiring.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                {expiring.length} contrato{expiring.length > 1 ? 's' : ''} por vencer en los próximos 90 días
              </p>
            </div>
            {expiring.map(p => (
              <p key={p.id} className="text-xs text-amber-700 dark:text-amber-500">
                · {p.full_name} — {format(new Date(p.contract_end!), 'dd/MM/yyyy')} ({differenceInDays(new Date(p.contract_end!), new Date())} días)
              </p>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
