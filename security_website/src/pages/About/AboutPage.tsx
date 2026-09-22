import { Link } from 'react-router-dom'
import DraggableWorkspace from '../../components/layout/DraggableWorkspace'
import SectionHeader from '../../components/common/SectionHeader'
import Button from '../../components/ui/Button'

const principles = [
  ['Curiosity', 'We ask how things work, then learn responsibly and deeply.'],
  ['Community', 'We grow through collaboration, inclusion, and knowledge sharing.'],
  ['Responsibility', 'We use security knowledge ethically to reduce harm and build trust.'],
  ['Practice', 'We turn ideas into confidence through labs, challenges, and real projects.'],
]

function AboutPage() {
  return (
    <DraggableWorkspace pageKey="about">
      <section className="about-hero">
        <p className="eyebrow">About Security Club</p>
        <h1>Hack. Defend. Secure.</h1>
        <p>
          We are a student-led cybersecurity community creating a safe place to explore,
          learn, and use technology with purpose.
        </p>
      </section>

      <section className="about-manifesto">
        <p className="manifesto-marker">// OUR MOTTO</p>
        <blockquote>Learn with curiosity. Build with care. Defend with purpose.</blockquote>
        <p>
          Security is not only about tools and threats. It is about people, trust, and the
          confidence to make the digital spaces around us safer.
        </p>
      </section>

      <section className="grid three purpose-grid">
        <article className="card purpose-card"><p className="eyebrow">Vision</p><h2>A safer, more capable digital community.</h2><p>We envision students who understand technology, think critically about risk, and help shape a more secure future.</p></article>
        <article className="card purpose-card"><p className="eyebrow">Mission</p><h2>Make security learning practical and accessible.</h2><p>We connect beginners and enthusiasts with workshops, hands-on challenges, mentors, and opportunities to apply what they learn.</p></article>
        <article className="card purpose-card"><p className="eyebrow">Promise</p><h2>Everyone gets a place to begin.</h2><p>We welcome questions, celebrate progress, and make room for every member to discover their strengths.</p></article>
      </section>

      <section className="about-section-block">
        <SectionHeader eyebrow="What guides us" title="Our club principles" subtitle="The values behind every workshop, challenge, and conversation." />
        <div className="grid two">
          {principles.map(([title, text], index) => (
            <article className="card principle-card" key={title}>
              <span>0{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="about-section-block about-story">
        <p className="eyebrow">Our story, in progress</p>
        <h2>A place to learn together—and then give back.</h2>
        <p>Security Club brings people together around shared experiments: a first Linux command, a solved CTF flag, a safer piece of code, or an event that helps someone discover a new path. Every member adds to that story.</p>
        <Link to="/membership"><Button>Become part of the story</Button></Link>
      </section>
    </DraggableWorkspace>
  )
}

export default AboutPage
