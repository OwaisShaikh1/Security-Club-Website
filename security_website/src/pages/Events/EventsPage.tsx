import { useEffect, useMemo, useState, type FormEvent } from 'react'
import EventCard from '../../components/cards/EventCard'
import SectionHeader from '../../components/common/SectionHeader'
import DraggableWorkspace from '../../components/layout/DraggableWorkspace'
import Button from '../../components/ui/Button'
import {
  cancelEvent,
  createEvent,
  getAuthSession,
  getEvents,
  getManagedEvents,
  publishEvent,
  registerForEvent,
  updateEvent,
} from '../../api/client'
import { events as fallbackEvents } from '../../data/events'
import type { EventInput, EventItem, EventType, UserRole } from '../../types'

interface EventFormState {
  title: string
  summary: string
  description: string
  startsAt: string
  type: EventType
  tags: string
}

type RegistrationStatus = 'registered' | 'waitlisted' | 'registering'

const emptyEventForm: EventFormState = {
  title: '',
  summary: '',
  description: '',
  startsAt: '',
  type: 'workshop',
  tags: '',
}

function toDateTimeInput(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 16)
}

function eventToForm(event: EventItem): EventFormState {
  return {
    title: event.title,
    summary: event.summary ?? event.description,
    description: event.description,
    startsAt: toDateTimeInput(event.starts_at ?? event.date),
    type: event.type,
    tags: event.tags.join(', '),
  }
}

function EventsPage() {
  const [typeFilter, setTypeFilter] = useState<'all' | EventType>('all')
  const [eventItems, setEventItems] = useState<EventItem[]>(fallbackEvents)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [role, setRole] = useState<UserRole>('visitor')
  const [managedEvents, setManagedEvents] = useState<EventItem[]>([])
  const [managementError, setManagementError] = useState<string | null>(null)
  const [managementNotice, setManagementNotice] = useState<string | null>(null)
  const [eventForm, setEventForm] = useState<EventFormState>(emptyEventForm)
  const [editingEventId, setEditingEventId] = useState<number | null>(null)
  const [isSavingEvent, setIsSavingEvent] = useState(false)
  const [registrationStatuses, setRegistrationStatuses] = useState<Record<number, RegistrationStatus>>({})
  const [registrationError, setRegistrationError] = useState<string | null>(null)

  const canManageEvents = role === 'admin' || role === 'core'
  const canRegister = role === 'admin' || role === 'core' || role === 'member'

  const refreshPublicEvents = async () => {
    try {
      setEventItems(await getEvents())
      setLoadError(null)
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load events')
    }
  }

  const refreshManagedEvents = async () => {
    try {
      setManagedEvents(await getManagedEvents())
      setManagementError(null)
    } catch (error: unknown) {
      setManagementError(error instanceof Error ? error.message : 'Unable to load managed events')
    }
  }

  useEffect(() => {
    getEvents()
      .then((loadedEvents) => {
        setEventItems(loadedEvents)
        setLoadError(null)
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : 'Unable to load events')
      })
    getAuthSession()
      .then((session) => {
        setRole(session.role)
        if (session.role === 'admin' || session.role === 'core') {
          getManagedEvents()
            .then((loadedEvents) => {
              setManagedEvents(loadedEvents)
              setManagementError(null)
            })
            .catch((error: unknown) => {
              setManagementError(error instanceof Error ? error.message : 'Unable to load managed events')
            })
        }
      })
      .catch(() => setRole('visitor'))
  }, [])

  const filteredEvents = useMemo(
    () => eventItems.filter((event) => (typeFilter === 'all' ? true : event.type === typeFilter)),
    [eventItems, typeFilter],
  )

  const updateForm = <K extends keyof EventFormState>(field: K, value: EventFormState[K]) => {
    setEventForm((current) => ({ ...current, [field]: value }))
  }

  const resetEventForm = () => {
    setEventForm(emptyEventForm)
    setEditingEventId(null)
  }

  const saveEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSavingEvent(true)
    setManagementError(null)
    setManagementNotice(null)
    const startDate = new Date(eventForm.startsAt)
    if (Number.isNaN(startDate.getTime())) {
      setManagementError('Enter a valid event date and time.')
      setIsSavingEvent(false)
      return
    }

    const input: EventInput = {
      title: eventForm.title,
      summary: eventForm.summary,
      description: eventForm.description,
      starts_at: startDate.toISOString(),
      type: eventForm.type,
      tags: eventForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    }

    try {
      if (editingEventId === null) {
        await createEvent({ ...input, status: 'draft' })
        setManagementNotice('Event created as a draft.')
      } else {
        await updateEvent(editingEventId, input)
        setManagementNotice('Event updated.')
      }
      resetEventForm()
      await Promise.all([refreshManagedEvents(), refreshPublicEvents()])
    } catch (error: unknown) {
      setManagementError(error instanceof Error ? error.message : 'Unable to save event')
    } finally {
      setIsSavingEvent(false)
    }
  }

  const publishManagedEvent = async (id: number) => {
    setManagementError(null)
    setManagementNotice(null)
    try {
      await publishEvent(id)
      setManagementNotice('Event published.')
      await Promise.all([refreshManagedEvents(), refreshPublicEvents()])
    } catch (error: unknown) {
      setManagementError(error instanceof Error ? error.message : 'Unable to publish event')
    }
  }

  const cancelManagedEvent = async (id: number) => {
    setManagementError(null)
    setManagementNotice(null)
    try {
      await cancelEvent(id)
      setManagementNotice('Event cancelled.')
      await Promise.all([refreshManagedEvents(), refreshPublicEvents()])
    } catch (error: unknown) {
      setManagementError(error instanceof Error ? error.message : 'Unable to cancel event')
    }
  }

  const registerForManagedEvent = async (id: number) => {
    setRegistrationError(null)
    setRegistrationStatuses((current) => ({ ...current, [id]: 'registering' }))
    try {
      const registration = await registerForEvent(id)
      setRegistrationStatuses((current) => ({ ...current, [id]: registration.status === 'waitlisted' ? 'waitlisted' : 'registered' }))
    } catch (error: unknown) {
      setRegistrationStatuses((current) => {
        const next = { ...current }
        delete next[id]
        return next
      })
      setRegistrationError(error instanceof Error ? error.message : 'Unable to register for event')
    }
  }

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
        {registrationError ? <p role="alert">{registrationError}</p> : null}

        <div className="grid three">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onRegister={canRegister ? () => void registerForManagedEvent(event.id) : undefined}
              registrationStatus={registrationStatuses[event.id]}
            />
          ))}
        </div>

        {canManageEvents ? (
          <section className="card event-management">
            <SectionHeader
              eyebrow="Event management"
              title={editingEventId === null ? 'Create an event' : 'Edit event'}
              subtitle="Core team and administrators can draft, publish, update, or cancel events."
            />
            {managementError ? <p role="alert">{managementError}</p> : null}
            {managementNotice ? <p role="status">{managementNotice}</p> : null}

            <form className="form" onSubmit={saveEvent}>
              <div className="grid two">
                <div>
                  <label htmlFor="event-title">Title</label>
                  <input id="event-title" value={eventForm.title} onChange={(event) => updateForm('title', event.target.value)} required />
                </div>
                <div>
                  <label htmlFor="event-type">Type</label>
                  <select id="event-type" value={eventForm.type} onChange={(event) => updateForm('type', event.target.value as EventType)}>
                    <option value="workshop">Workshop</option>
                    <option value="ctf">CTF</option>
                    <option value="seminar">Seminar</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="event-starts-at">Starts at</label>
                  <input id="event-starts-at" type="datetime-local" value={eventForm.startsAt} onChange={(event) => updateForm('startsAt', event.target.value)} required />
                </div>
                <div>
                  <label htmlFor="event-tags">Tags</label>
                  <input id="event-tags" value={eventForm.tags} onChange={(event) => updateForm('tags', event.target.value)} placeholder="web-security, beginner" />
                </div>
              </div>
              <label htmlFor="event-summary">Summary</label>
              <input id="event-summary" value={eventForm.summary} onChange={(event) => updateForm('summary', event.target.value)} required />
              <label htmlFor="event-description">Description</label>
              <textarea id="event-description" rows={4} value={eventForm.description} onChange={(event) => updateForm('description', event.target.value)} required />
              <div className="actions">
                <Button type="submit" disabled={isSavingEvent}>{isSavingEvent ? 'Saving...' : editingEventId === null ? 'Create draft' : 'Save changes'}</Button>
                {editingEventId !== null ? <Button type="button" variant="outline" onClick={resetEventForm}>New event</Button> : null}
              </div>
            </form>

            <div className="grid two">
              {managedEvents.map((event) => (
                <article className="card" key={event.id}>
                  <div className="card-topline">
                    <span className="badge">{event.status ?? 'draft'}</span>
                    <span className="date">{event.date}</span>
                  </div>
                  <h3>{event.title}</h3>
                  <div className="actions">
                    <Button type="button" variant="outline" onClick={() => {
                      setEditingEventId(event.id)
                      setEventForm(eventToForm(event))
                    }}>Edit</Button>
                    {event.status !== 'published' && event.status !== 'cancelled' ? (
                      <Button type="button" onClick={() => void publishManagedEvent(event.id)}>Publish</Button>
                    ) : null}
                    {event.status !== 'cancelled' ? (
                      <Button type="button" variant="secondary" onClick={() => void cancelManagedEvent(event.id)}>Cancel</Button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </DraggableWorkspace>
  )
}

export default EventsPage
