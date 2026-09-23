import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import type { NavItem } from '../../app/routes'
import logo from '../../assets/data/Security Club Logo.png'

interface NavbarProps {
  links: NavItem[]
}

function Navbar({ links }: NavbarProps) {
  const [open, setOpen] = useState(false)

  return (
    <header className="navbar-wrap">
      <div className="container navbar">
        <NavLink to="/" className="brand" onClick={() => setOpen(false)}>
          <img src={logo} alt="Security Club Logo" style={{ height: '32px', marginRight: '8px', objectFit: 'contain' }} />
          Security Club
        </NavLink>

        <button
          type="button"
          className="menu-button"
          aria-expanded={open}
          aria-label="Toggle menu"
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`nav-links ${open ? 'open' : ''}`}>
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`.trim()
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}

export default Navbar
