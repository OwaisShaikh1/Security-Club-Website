import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Container from './components/layout/Container'
import Footer from './components/layout/Footer'
import Navbar from './components/layout/Navbar'
import { appRoutes, navItems } from './app/routes'
import MatrixBackground from './components/effects/MatrixBackground'
import TargetCursor from './components/effects/cursor'
import HUDAccents from './components/effects/HUDAccents'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="site-shell">
        <MatrixBackground />
        <TargetCursor spinDuration={2.5}
        hideDefaultCursor
        parallaxOn
        hoverDuration={0.7}
        
        />
        <HUDAccents />
        <Navbar links={navItems} />

        <main>
          <Container>
            <Routes>
              {appRoutes.map((route) => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
            </Routes>
          </Container>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App
