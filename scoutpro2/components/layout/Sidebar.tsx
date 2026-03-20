'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, Search, Calendar, Trophy, BookOpen, Settings, UserCog, LogOut, Sun, Moon } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import clsx from 'clsx'

export default function Sidebar({ profile }: { profile: Profile }) {
  const { t, lang, setLang } = useI18n()
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const nav = [
    { href: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
    { href: '/players', icon: Users, label: t('my_players') },
    { href: '/scouting', icon: Search, label: t('scouting') },
    { href: '/calendar', icon: Calendar, label: t('calendar') },
    { href: '/fixtures', icon: Trophy, label: t('fixtures') },
    { href: '/diary', icon: BookOpen, label: t('diary') },
    ...(profile.role === 'admin' ? [{ href: '/users', icon: UserCog, label: t('users') }] : []),
    { href: '/settings', icon: Settings, label: t('settings') },
  ]

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const initials = profile.full_name
    ? profile.full_name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : profile.email[0].toUpperCase()

  return (
    <aside className="fixed top-0 left-0 h-screen w-[220px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col z-20">
      <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
        <p className="font-bold text-base">Scout<span className="text-blue-600">Pro</span></p>
        <p className="text-xs text-gray-400 mt-0.5">Sports Agency</p>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {nav.map(item => (
          <Link key={item.href} href={item.href}
            className={clsx(pathname.startsWith(item.href) ? 'nav-item-active' : 'nav-item')}>
            <item.icon size={16} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
        <div className="flex gap-1.5">
          <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="btn-ghost flex-1 px-2 py-1.5 text-xs justify-center gap-1">
            {theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}
            {theme === 'light' ? t('dark') : t('light')}
          </button>
          <button onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
            className="btn-ghost px-3 py-1.5 text-xs font-semibold">
            {lang === 'es' ? 'EN' : 'ES'}
          </button>
        </div>
        <div className="flex items-center gap-2 px-1">
          <div className="avatar bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-xs">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{profile.full_name || profile.email}</p>
            <p className="text-xs text-gray-400 capitalize">{profile.role === 'admin' ? t('admin') : t('scout')}</p>
          </div>
          <button onClick={handleLogout} title={t('logout')}
            className="text-gray-400 hover:text-red-500 transition-colors">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
