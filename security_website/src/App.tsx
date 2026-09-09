import { BrowserRouter } from 'react-router-dom'
import Container from './components/layout/Container'
import DesktopWorkspace from './components/layout/DesktopWorkspace'
import { appRoutes } from './app/routes'
import MatrixBackground from './components/effects/MatrixBackground'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="site-shell">
        <MatrixBackground />

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
