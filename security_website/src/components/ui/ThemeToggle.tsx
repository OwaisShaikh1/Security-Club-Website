import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('security-club-theme')
  return stored === 'light' ? 'light' : 'dark'
}

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('security-club-theme', theme)
  }, [theme])

  const isLight = theme === 'light'
  return <button className="theme-toggle" type="button" aria-label={`Switch to ${isLight ? 'dark' : 'light'} theme`} onClick={() => setTheme(isLight ? 'dark' : 'light')}><span aria-hidden="true">{isLight ? '☾' : '☀'}</span><span>{isLight ? 'Dark' : 'Light'}</span></button>
}

export default ThemeToggle
