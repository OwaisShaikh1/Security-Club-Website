import { BrowserRouter } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Container from './components/layout/Container'
import DesktopWorkspace from './components/layout/DesktopWorkspace'
import { appRoutes } from './app/routes'
import MatrixBackground from './components/effects/MatrixBackground'
import { getAuthSession } from './api/client'
import type { AuthSession } from './types'
import './App.css'

function App() {
  const [session, setSession] = useState<AuthSession>({
    authenticated: false,
    role: 'visitor',
    user: null,
    permissions: [],
    positions: [],
  })

  useEffect(() => {
    getAuthSession().then(setSession).catch(() => setSession((current) => ({ ...current, role: 'visitor', permissions: [], positions: [] })))
  }, [])

  const roleRank = { visitor: 0, member: 1, core: 2, admin: 3 }
  const allowedRoutes = appRoutes.filter((route) => {
    if (roleRank[session.role] < roleRank[route.requiredRole]) return false
    if (route.requiredPermission && !session.permissions.includes(route.requiredPermission)) return false
    if (route.requiredPosition && session.role !== 'admin' && !session.positions.some((position) => position.key === route.requiredPosition)) return false
    return true
  })

  return (
    <BrowserRouter>
      <div className="site-shell">
        <MatrixBackground />

        <main>
          <Container>
            <DesktopWorkspace routes={allowedRoutes} />
          </Container>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
