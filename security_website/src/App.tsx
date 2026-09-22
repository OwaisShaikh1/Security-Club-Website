import { BrowserRouter } from 'react-router-dom'
import Container from './components/layout/Container'
import DesktopWorkspace from './components/layout/DesktopWorkspace'
import { appRoutes } from './app/routes'
import MatrixBackground from './components/effects/MatrixBackground'
import TargetCursor from './components/effects/cursor'
import ThemeToggle from './components/ui/ThemeToggle'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="site-shell">
        <MatrixBackground />
        <TargetCursor hoverDuration={0.16} spinDuration={2.8} />
        <ThemeToggle />

        <main>
          <Container>
            <DesktopWorkspace routes={appRoutes} />
          </Container>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
