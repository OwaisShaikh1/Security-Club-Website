import type { EventItem } from '../../types'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import BaseCard from './BaseCard'

interface EventCardProps {
  event: EventItem
  onRegister?: () => void
  registrationStatus?: 'registered' | 'waitlisted' | 'registering'
}

function EventCard({ event, onRegister, registrationStatus }: EventCardProps) {
  return (
    <BaseCard>
      {event.poster && (
        <div className="card-poster">
          <img src={event.poster} alt={`${event.title} poster`} loading="lazy" />
        </div>
      )}
      <div className="card-topline">
        <Badge>{event.type.toUpperCase()}</Badge>
        <span className="date">{event.date}</span>
      </div>
      <h3>{event.title}</h3>
      {event.venue && <p className="card-venue">📍 {event.venue}</p>}
      <p>{event.description}</p>
      <div className="tag-row">
        {event.tags.map((tag) => (
          <span key={tag} className="tag">#{tag}</span>
        ))}
      </div>
      {onRegister ? (
        <div className="actions">
          <Button type="button" variant="outline" onClick={onRegister} disabled={registrationStatus === 'registering'}>
            {registrationStatus === 'registering'
              ? 'Registering...'
              : registrationStatus === 'registered'
                ? 'Registered'
                : registrationStatus === 'waitlisted'
                  ? 'Waitlisted'
                  : 'Register'}
          </Button>
        </div>
      ) : null}
    </BaseCard>
  )
}

export default EventCard
