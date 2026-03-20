'use client'
import { createContext, useContext, useState, ReactNode } from 'react'

const es = {
  dashboard: 'Dashboard', my_players: 'Mis jugadores', scouting: 'Scouting',
  calendar: 'Calendario', fixtures: 'Fixtures', diary: 'Diario',
  users: 'Usuarios', settings: 'Ajustes', notifications: 'Notificaciones',
  active_players: 'Jugadores activos', expiring_contracts: 'Contratos por vencer',
  prospects: 'Prospectos', matches_week: 'Próximos partidos',
  add_player: '+ Agregar jugador', search: 'Buscar...', save: 'Guardar',
  cancel: 'Cancelar', delete: 'Eliminar', edit: 'Editar', name: 'Nombre',
  position: 'Posición', club: 'Club', contract: 'Contrato', status: 'Estado',
  nationality: 'Nacionalidad', birth_date: 'Nacimiento', salary: 'Salario (€)',
  valuation: 'Valuación (€)', all_positions: 'Todas las posiciones',
  goalkeeper: 'Portero', defender: 'Defensor', midfielder: 'Mediocampista',
  forward: 'Delantero', active: 'Activo', free: 'Libre',
  negotiating: 'Negociando', injured: 'Lesionado', internal: 'Interno',
  external: 'Externo', new_report: 'Nuevo reporte', reports: 'reportes',
  invite_user: 'Crear usuario', email: 'Email', role: 'Rol',
  admin: 'Administrador', scout: 'Ojeador', invite: 'Crear',
  mark_all_read: 'Marcar todo leído', no_notifications: 'Sin notificaciones',
  logout: 'Cerrar sesión', login: 'Iniciar sesión', password: 'Contraseña',
  theme: 'Tema', language: 'Idioma', light: 'Claro', dark: 'Oscuro',
  today: 'Hoy', upcoming: 'Próximos', notes: 'Notas', new_note: 'Nueva nota',
  add_match: 'Agregar partido', contract_end: 'Vto. contrato', days: 'días',
  no_players: 'Sin jugadores', no_reports: 'Sin reportes', no_matches: 'Sin partidos',
  rating: 'Rating', goals: 'Goles', assists: 'Asistencias', matches: 'Partidos',
  video_link: 'Link video', new_prospect: 'Nuevo prospecto', all: 'Todos',
}

const en: typeof es = {
  dashboard: 'Dashboard', my_players: 'My players', scouting: 'Scouting',
  calendar: 'Calendar', fixtures: 'Fixtures', diary: 'Diary',
  users: 'Users', settings: 'Settings', notifications: 'Notifications',
  active_players: 'Active players', expiring_contracts: 'Expiring contracts',
  prospects: 'Prospects', matches_week: 'Upcoming matches',
  add_player: '+ Add player', search: 'Search...', save: 'Save',
  cancel: 'Cancel', delete: 'Delete', edit: 'Edit', name: 'Name',
  position: 'Position', club: 'Club', contract: 'Contract', status: 'Status',
  nationality: 'Nationality', birth_date: 'Birth date', salary: 'Salary (€)',
  valuation: 'Valuation (€)', all_positions: 'All positions',
  goalkeeper: 'Goalkeeper', defender: 'Defender', midfielder: 'Midfielder',
  forward: 'Forward', active: 'Active', free: 'Free',
  negotiating: 'Negotiating', injured: 'Injured', internal: 'Internal',
  external: 'External', new_report: 'New report', reports: 'reports',
  invite_user: 'Create user', email: 'Email', role: 'Role',
  admin: 'Administrator', scout: 'Scout', invite: 'Create',
  mark_all_read: 'Mark all read', no_notifications: 'No notifications',
  logout: 'Sign out', login: 'Sign in', password: 'Password',
  theme: 'Theme', language: 'Language', light: 'Light', dark: 'Dark',
  today: 'Today', upcoming: 'Upcoming', notes: 'Notes', new_note: 'New note',
  add_match: 'Add match', contract_end: 'Contract end', days: 'days',
  no_players: 'No players', no_reports: 'No reports', no_matches: 'No matches',
  rating: 'Rating', goals: 'Goals', assists: 'Assists', matches: 'Matches',
  video_link: 'Video link', new_prospect: 'New prospect', all: 'All',
}

type Lang = 'es' | 'en'
type TKey = keyof typeof es

interface I18nCtx { lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string }
const Ctx = createContext<I18nCtx>({ lang: 'es', setLang: () => {}, t: k => k })

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('es')
  const t = (k: TKey) => (lang === 'es' ? es[k] : en[k]) ?? k
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>
}

export const useI18n = () => useContext(Ctx)
