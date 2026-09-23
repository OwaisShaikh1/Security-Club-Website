import { Link } from 'react-router-dom'
import DraggableWorkspace from '../../components/layout/DraggableWorkspace'
import Button from '../../components/ui/Button'
// @ts-expect-error - JSX file without type definitions
import SecurityLogoTrace from '../../assets/icon/SecurityLogoTrace'

const startingPoints = [
  { icon: '</>', title: 'Learn by doing', text: 'Begin with guided workshops, friendly labs, and clear explanations—no experience required.' },
  { icon: '⚑', title: 'Find your people', text: 'Meet curious students who want to explore technology, ask questions, and grow together.' },
  { icon: '⌘', title: 'Build real skills', text: 'Practice secure coding, digital safety, CTFs, and defense techniques at your own pace.' },
]

const journey = [
  ['01', 'Start curious', 'Join an open session and see which area of cybersecurity sparks your interest.'],
  ['02', 'Try a lab', 'Learn the fundamentals with a team around you and zero pressure to be an expert.'],
  ['03', 'Grow with us', 'Take on challenges, contribute to events, and become part of the community.'],
]

function LandingPage() {
  return (
    <DraggableWorkspace pageKey="landing">
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="eyebrow">Security Club · Welcome terminal</p>
          <p className="terminal-line">$ whoami <span>→ future security builder</span></p>
          <div className="live-status" aria-label="Club status: accepting beginners"><span /> OPEN TO BEGINNERS</div>
          <h1>Curious about cybersecurity? You belong here.</h1>
          <p className="landing-lede">
            Security Club is a welcoming campus community for beginners, builders, and
            problem-solvers. Learn how the digital world works—and how to help protect it.
          </p>
          <div className="actions">
            <Link to="/membership"><Button>Start your journey</Button></Link>
            <Link to="/about"><Button variant="outline">Meet the club</Button></Link>
          </div>
          <p className="landing-reassurance">No prior knowledge. No gatekeeping. Just curiosity.</p>
        </div>
        <div className="landing-signal" aria-label="Security Club signal illustration">
          <SecurityLogoTrace size={400} />
        </div>
      </section>

      <section className="landing-intro">
        <p className="eyebrow">A club for first steps</p>
        <h2>You do not need to be a hacker to start.</h2>
        <p>
          Whether you are visiting to understand cybersecurity, looking for a community,
          or ready to explore a new skill, we make the first step simple and practical.
        </p>
      </section>

      <section className="landing-section">
        <div className="landing-stats" aria-label="Club opportunities">
          <div><strong>01</strong><span>community</span></div>
          <div><strong>∞</strong><span>questions welcome</span></div>
          <div><strong>100%</strong><span>hands-on energy</span></div>
        </div>
        <div className="grid three landing-feature-grid">
          {startingPoints.map((point) => (
            <article className="card landing-feature" key={point.title}>
              <span className="feature-icon" aria-hidden="true">{point.icon}</span>
              <h3>{point.title}</h3>
              <p>{point.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section journey-section">
        <div>
          <p className="eyebrow">Your route in</p>
          <h2>A simple path from visitor to contributor.</h2>
        </div>
        <ol className="journey-list">
          {journey.map(([number, title, text]) => (
            <li key={number}>
              <span>{number}</span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-cta">
        <p className="eyebrow">Your next safe move</p>
        <h2>Explore, ask, and learn with Security Club.</h2>
        <Link to="/events"><Button>See upcoming events</Button></Link>
      </section>
    </DraggableWorkspace>
  )
}

export default LandingPage
