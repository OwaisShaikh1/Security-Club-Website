import type { EventItem } from '../../types'
import Badge from '../ui/Badge'
import BaseCard from './BaseCard'

interface EventCardProps {
  event: EventItem
}

function EventCard({ event }: EventCardProps) {
  return (
    <BaseCard>
      <div className="card-topline">
        <Badge>{event.type.toUpperCase()}</Badge>
        <span className="date">{event.date}</span>
      </div>
      <h3>{event.title}</h3>
      <p>{event.description}</p>
      <div className="tag-row">
        {event.tags.map((tag) => (
          <span key={tag} className="tag">#{tag}</span>
        ))}
      </div>
    </BaseCard>
  )
}

export default EventCard
