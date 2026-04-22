import type { Challenge } from '../../types'
import Badge from '../ui/Badge'
import BaseCard from './BaseCard'

interface ChallengeCardProps {
  challenge: Challenge
}

function ChallengeCard({ challenge }: ChallengeCardProps) {
  const tone = challenge.solved ? 'success' : 'default'

  return (
    <BaseCard>
      <div className="card-topline">
        <Badge tone={tone}>{challenge.difficulty.toUpperCase()}</Badge>
        <strong>{challenge.points} pts</strong>
      </div>
      <h3>{challenge.title}</h3>
      <p>{challenge.description}</p>
      <p className="muted">Category: {challenge.category}</p>
    </BaseCard>
  )
}

export default ChallengeCard
