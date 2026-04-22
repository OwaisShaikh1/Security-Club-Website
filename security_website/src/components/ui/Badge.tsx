import type { PropsWithChildren } from 'react'

interface BadgeProps {
  tone?: 'default' | 'success' | 'warning'
}

function Badge({ children, tone = 'default' }: PropsWithChildren<BadgeProps>) {
  return <span className={`badge ${tone}`}>{children}</span>
}

export default Badge
