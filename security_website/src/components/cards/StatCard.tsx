import BaseCard from './BaseCard'

interface StatCardProps {
  label: string
  value: string
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <BaseCard>
      <p className="muted">{label}</p>
      <h3>{value}</h3>
    </BaseCard>
  )
}

export default StatCard
