import { useMemo, useState } from 'react'
import EventCard from '../../components/cards/EventCard'
import SectionHeader from '../../components/common/SectionHeader'
import DraggableWorkspace from '../../components/layout/DraggableWorkspace'
import { events } from '../../data/events'
import type { EventType } from '../../types'

function EventsPage() {
  const [typeFilter, setTypeFilter] = useState<'all' | EventType>('all')

  const filteredEvents = useMemo(
    () => events.filter((event) => (typeFilter === 'all' ? true : event.type === typeFilter)),
    [typeFilter],
  )

  return (
    <DraggableWorkspace pageKey="events">
      <section className="events-main-section">
        <SectionHeader
          eyebrow="Events"
          title="Workshops, CTFs, and Seminars"
          subtitle="Discover sessions that sharpen both offensive and defensive security thinking."
        />

        <div className="filter-row">
          <label htmlFor="type">Filter by type:</label>
          <select id="type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | EventType)}>
            <option value="all">All</option>
            <option value="inauguration">Inauguration</option>
            <option value="workshop">Workshop</option>
            <option value="ctf">CTF</option>
            <option value="seminar">Seminar</option>
            <option value="bootcamp">Bootcamp</option>
          </select>
        </div>

        <div className="grid three">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>
    </DraggableWorkspace>
  )
}

export default EventsPage
