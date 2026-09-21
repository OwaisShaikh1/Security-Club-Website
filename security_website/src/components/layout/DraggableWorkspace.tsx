import type { ReactNode } from 'react'

interface DraggableWorkspaceProps {
  pageKey: string
  children: ReactNode
}

function DraggableWorkspace({ pageKey, children }: DraggableWorkspaceProps) {
  void pageKey
  return (
    <div className="page">{children}</div>
  )
}

export default DraggableWorkspace
