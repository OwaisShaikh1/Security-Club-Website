import type { CSSProperties, PropsWithChildren } from 'react'

interface BaseCardProps extends PropsWithChildren {
  className?: string
  style?: CSSProperties
}

function BaseCard({ children, className, style }: BaseCardProps) {
  return <article className={["card", className].filter(Boolean).join(' ')} style={style}>{children}</article>
}

export default BaseCard
