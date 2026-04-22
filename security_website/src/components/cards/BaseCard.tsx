import type { PropsWithChildren } from 'react'

function BaseCard({ children }: PropsWithChildren) {
  return <article className="card">{children}</article>
}

export default BaseCard
