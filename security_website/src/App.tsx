import { BrowserRouter } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Container from './components/layout/Container'
import DesktopWorkspace from './components/layout/DesktopWorkspace'
import { appRoutes } from './app/routes'
import MatrixBackground from './components/effects/MatrixBackground'
import { getCurrentRole, type UserRole } from './api/client'
import './App.css'

function App() {
  const [role, setRole] = useState<UserRole>('visitor')

  useEffect(() => {
    getCurrentRole().then(setRole).catch(() => setRole('visitor'))
  }, [])

  const roleRank = { visitor: 0, member: 1, core: 2, admin: 3 }
  const allowedRoutes = appRoutes.filter((route) => roleRank[role] >= roleRank[route.requiredRole])

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
