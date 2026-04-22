import { Link } from 'react-router-dom'
import EventCard from '../../components/cards/EventCard'
import FlagshipCard from '../../components/cards/FlagshipCard'
import SectionHeader from '../../components/common/SectionHeader'
import Button from '../../components/ui/Button'
import { events } from '../../data/events'
import { flagships } from '../../data/flagships'
import { testimonials } from '../../data/testimonials'

function HomePage() {
  return (
    <div className="page">
      <section className="hero-panel">
        <p className="eyebrow">Security Club DBIT</p>
        <h1>Hack. Defend. Secure.</h1>
        <p className="hero-copy">
          Hands-on cybersecurity community for workshops, CTFs, research, and real-world defense skills.
        </p>
        <div className="actions">
          <Link to="/events"><Button>Explore Events</Button></Link>
          <Link to="/membership"><Button variant="outline">Join Now</Button></Link>
        </div>
      </section>

      <section>
        <SectionHeader
          eyebrow="About"
          title="Who We Are"
          subtitle="Cybersecurity enthusiasts learning by building, breaking, and defending systems together."
        />
      </section>

      <section>
        <SectionHeader eyebrow="Highlights" title="What We Focus On" />
        <div className="grid three">
          {['Workshops', 'CTFs', 'Research'].map((item) => (
            <article key={item} className="card">
              <h3>{item}</h3>
              <p>Structured sessions and practical drills that convert concepts into skills.</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader eyebrow="Upcoming" title="Events Preview" />
        <div className="grid three">
          {events.slice(0, 3).map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader eyebrow="Flagships" title="Signature Initiatives" />
        <div className="grid two">
          {flagships.map((flagship) => (
            <FlagshipCard key={flagship.id} flagship={flagship} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader eyebrow="Voices" title="Member Testimonials" />
        <div className="grid two">
          {testimonials.map((item) => (
            <article key={item.name} className="card">
              <h3>{item.name}</h3>
              <p className="role">{item.role}</p>
              <p>{item.quote}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

export default HomePage
