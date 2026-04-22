import { Link } from 'react-router-dom'

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <h3>Security Club</h3>
          <p>Hack. Defend. Secure. Building practical cybersecurity skills at campus scale.</p>
        </div>

        <div>
          <h4>Quick Links</h4>
          <ul>
            <li><Link to="/events">Events</Link></li>
            <li><Link to="/ctf">CTF</Link></li>
            <li><Link to="/membership">Membership</Link></li>
          </ul>
        </div>

        <div>
          <h4>Contact</h4>
          <ul>
            <li><a href="mailto:securityclub@college.edu">securityclub@college.edu</a></li>
            <li><a href="https://www.linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a></li>
            <li><a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a></li>
          </ul>
        </div>
      </div>
    </footer>
  )
}

export default Footer
