'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Theme = 'light' | 'dark'
interface ThemeCtx { theme: Theme; setTheme: (t: Theme) => void }
const Ctx = createContext<ThemeCtx>({ theme: 'light', setTheme: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')

  useEffect(() => {
    const saved = localStorage.getItem('sp-theme') as Theme | null
    if (saved) apply(saved)
  }, [])

  function apply(t: Theme) {
    setThemeState(t)
    localStorage.setItem('sp-theme', t)
    document.documentElement.classList.toggle('dark', t === 'dark')
  }

  return <Ctx.Provider value={{ theme, setTheme: apply }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)
