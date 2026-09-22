import type { ReactNode } from 'react'

interface DraggableWorkspaceProps {
  pageKey: string
  children: ReactNode
}

function DraggableWorkspace({ pageKey, children }: DraggableWorkspaceProps) {
  return (
    <div className={`page ${pageKey}-page`}>{children}</div>
  )
}

export default DraggableWorkspace
