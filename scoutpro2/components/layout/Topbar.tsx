'use client'
import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'
import type { Notification } from '@/types'
import clsx from 'clsx'

export default function Topbar({ title, userId }: { title: string; userId: string }) {
  const { t } = useI18n()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notification[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.from('notifications').select('*')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => { if (data) setNotifs(data as Notification[]) })
  }, [userId, supabase])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const unread = notifs.filter(n => !n.read).length

  async function markAllRead() {
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 sticky top-0 z-10">
      <h1 className="font-semibold text-base">{title}</h1>
      <div className="relative" ref={ref}>
        <button onClick={() => setOpen(v => !v)}
          className="relative w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <Bell size={16} />
          {unread > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />}
        </button>
        {open && (
          <div className="absolute right-0 top-11 w-80 card shadow-lg z-50">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm">{t('notifications')}</p>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
                  {t('mark_all_read')}
                </button>
              )}
            </div>
            {notifs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">{t('no_notifications')}</p>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {notifs.map(n => (
                  <div key={n.id} className={clsx('flex gap-2.5 p-2.5 rounded-lg', !n.read && 'bg-blue-50 dark:bg-blue-900/10')}>
                    <div className={clsx('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', n.read ? 'bg-transparent' : 'bg-blue-500')} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
