import { useEffect, useMemo, useState } from 'react'
import EventCard from '../../components/cards/EventCard'
import SectionHeader from '../../components/common/SectionHeader'
import DraggableWorkspace from '../../components/layout/DraggableWorkspace'
import { events } from '../../data/events'
import type { EventType } from '../../types'
import { getEvents } from '../../api/client'

function EventsPage() {
  const [typeFilter, setTypeFilter] = useState<'all' | EventType>('all')
  const [eventItems, setEventItems] = useState(events)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    getEvents()
      .then(setEventItems)
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : 'Unable to load events')
      })
  }, [])

  const filteredEvents = useMemo(
    () => eventItems.filter((event) => (typeFilter === 'all' ? true : event.type === typeFilter)),
    [eventItems, typeFilter],
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
            <option value="workshop">Workshop</option>
            <option value="ctf">CTF</option>
            <option value="seminar">Seminar</option>
          </select>
        </div>
        {loadError ? <p role="alert">{loadError}</p> : null}

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
