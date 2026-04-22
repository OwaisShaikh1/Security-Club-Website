import type { Flagship } from '../../types'
import Badge from '../ui/Badge'
import BaseCard from './BaseCard'

interface FlagshipCardProps {
  flagship: Flagship
}

function FlagshipCard({ flagship }: FlagshipCardProps) {
  return (
    <BaseCard>
      <Badge tone="warning">{flagship.year}</Badge>
      <h3>{flagship.title}</h3>
      <p>{flagship.description}</p>
    </BaseCard>
  )
}

export default FlagshipCard
