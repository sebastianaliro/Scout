export type Role = 'admin' | 'scout'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
  created_at: string
}

export type PlayerStatus = 'active' | 'free' | 'negotiating' | 'injured'
export type PlayerPosition = 'goalkeeper' | 'defender' | 'midfielder' | 'forward'

export interface Player {
  id: string
  created_by: string
  full_name: string
  position: PlayerPosition
  current_club: string | null
  nationality: string
  birth_date: string | null
  contract_end: string | null
  salary_eur: number | null
  market_value_eur: number | null
  status: PlayerStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export type ScoutType = 'internal' | 'external'

export interface ScoutReport {
  id: string
  player_id: string
  scout_id: string
  type: ScoutType
  report_text: string
  goals: number
  assists: number
  matches: number
  rating: number
  video_url: string | null
  created_at: string
}

export interface Match {
  id: string
  created_by: string
  home_team: string
  away_team: string
  competition: string
  match_date: string
  result: string | null
  created_at: string
}

export interface DiaryNote {
  id: string
  user_id: string
  title: string
  content: string
  tag: 'scouting' | 'contract' | 'player' | 'general'
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'contract_expiry' | 'new_report' | 'match_reminder' | 'general'
  title: string
  message: string
  read: boolean
  created_at: string
}
