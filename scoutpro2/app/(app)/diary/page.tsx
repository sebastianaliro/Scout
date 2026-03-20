'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Topbar from '@/components/layout/Topbar'
import { Plus, X, Pencil, Trash2, BookOpen, Search } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { DiaryNote, Profile } from '@/types'
import clsx from 'clsx'

const TAGS = ['scouting', 'contract', 'player', 'general'] as const
type Tag = typeof TAGS[number]
const tagConfig: Record<Tag, { label: string; badge: string }> = {
  scouting: { label: 'Scouting', badge: 'badge-purple' },
  contract: { label: 'Contrato', badge: 'badge-amber' },
  player: { label: 'Jugador', badge: 'badge-blue' },
  general: { label: 'General', badge: 'badge-gray' },
}
const emptyForm = { title: '', content: '', tag: 'general' as Tag }

export default function DiaryPage() {
  const { t, lang } = useI18n()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [notes, setNotes] = useState<DiaryNote[]>([])
  const [tagFilter, setTagFilter] = useState<Tag | 'all'>('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<DiaryNote | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<DiaryNote | null>(null)

  const fetchNotes = useCallback(async (uid: string) => {
    const { data } = await supabase.from('diary_notes').select('*').eq('user_id', uid).order('created_at', { ascending: false })
    setNotes((data ?? []) as DiaryNote[])
  }, [supabase])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p as Profile)
      fetchNotes(user.id)
    }
    init()
  }, [supabase, fetchNotes])

  const filtered = notes.filter(n => {
    const matchesTag = tagFilter === 'all' || n.tag === tagFilter
    const matchesSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase())
    return matchesTag && matchesSearch
  })

  function openCreate() { setEditing(null); setForm(emptyForm); setShowModal(true) }
  function openEdit(n: DiaryNote) { setEditing(n); setForm({ title: n.title, content: n.content, tag: n.tag as Tag }); setShowModal(true); setSelected(null) }

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    if (editing) await supabase.from('diary_notes').update(form).eq('id', editing.id)
    else await supabase.from('diary_notes').insert({ ...form, user_id: user.id })
    await fetchNotes(user.id)
    setShowModal(false)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar nota?')) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('diary_notes').delete().eq('id', id)
    if (selected?.id === id) setSelected(null)
    if (user) fetchNotes(user.id)
  }

  const locale = lang === 'es' ? es : undefined

  return (
    <>
      <Topbar title={t('diary')} userId={profile?.id ?? ''} />
      <div className="p-6">
        <div className="flex gap-4 h-[calc(100vh-8rem)]">
          <div className="w-72 flex-shrink-0 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{notes.length} nota{notes.length !== 1 ? 's' : ''}</p>
              <button onClick={openCreate} className="btn-primary text-xs px-3 py-1.5"><Plus size={13} /> {t('new_note')}</button>
            </div>
            <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5">
              <Search size={13} className="text-gray-400" />
              <input className="bg-transparent text-sm outline-none w-full placeholder-gray-400" placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setTagFilter('all')} className={clsx('badge cursor-pointer', tagFilter === 'all' ? 'badge-blue' : 'badge-gray')}>Todas</button>
              {TAGS.map(tag => <button key={tag} onClick={() => setTagFilter(tag)} className={clsx('badge cursor-pointer', tagFilter === tag ? tagConfig[tag].badge : 'badge-gray')}>{tagConfig[tag].label}</button>)}
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filtered.map(note => (
                <button key={note.id} onClick={() => setSelected(note)}
                  className={clsx('w-full text-left p-3 rounded-xl border transition-colors', selected?.id === note.id ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700')}>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-sm font-medium line-clamp-1 flex-1">{note.title || 'Sin título'}</p>
                    <span className={clsx('badge flex-shrink-0', tagConfig[note.tag as Tag].badge)}>{tagConfig[note.tag as Tag].label}</span>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2">{note.content}</p>
                  <p className="text-xs text-gray-300 dark:text-gray-600 mt-1.5">{format(new Date(note.created_at), 'd MMM yyyy', { locale })}</p>
                </button>
              ))}
              {filtered.length === 0 && <div className="text-center py-8"><BookOpen size={24} className="mx-auto mb-2 text-gray-200 dark:text-gray-700" /><p className="text-xs text-gray-400">Sin notas</p></div>}
            </div>
          </div>
          <div className="flex-1 card overflow-y-auto">
            {selected ? (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold">{selected.title || 'Sin título'}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={clsx('badge', tagConfig[selected.tag as Tag].badge)}>{tagConfig[selected.tag as Tag].label}</span>
                      <span className="text-xs text-gray-400">{format(new Date(selected.created_at), "d 'de' MMMM yyyy", { locale })}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(selected)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(selected.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selected.content}</p>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <BookOpen size={40} className="text-gray-200 dark:text-gray-700 mb-3" />
                <p className="text-sm text-gray-400">Seleccioná una nota para leerla</p>
                <button onClick={openCreate} className="btn-primary mt-4 text-xs"><Plus size={13} className="inline mr-1" /> {t('new_note')}</button>
              </div>
            )}
          </div>
        </div>
      </div>
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="font-semibold">{editing ? 'Editar nota' : 'Nueva nota'}</h2>
              <button onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div><label className="label">Título</label><input className="input" value={form.title} placeholder="Título..." onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div>
                <label className="label">Categoría</label>
                <div className="flex gap-2 flex-wrap">
                  {TAGS.map(tag => <button key={tag} onClick={() => setForm(f => ({ ...f, tag }))} className={clsx('badge cursor-pointer', form.tag === tag ? tagConfig[tag].badge : 'badge-gray')}>{tagConfig[tag].label}</button>)}
                </div>
              </div>
              <div><label className="label">Contenido</label><textarea className="input h-48 resize-none" value={form.content} placeholder="Escribí tus observaciones..." onChange={e => setForm(f => ({ ...f, content: e.target.value }))} /></div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-ghost">{t('cancel')}</button>
              <button onClick={handleSave} disabled={!form.content || saving} className="btn-primary">{saving ? 'Guardando...' : t('save')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
