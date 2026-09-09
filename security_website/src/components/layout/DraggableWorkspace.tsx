import type { PropsWithChildren } from 'react'

interface DraggableWorkspaceProps extends PropsWithChildren {
  pageKey: string
}

function DraggableWorkspace({ children }: DraggableWorkspaceProps) {
  return <div className="page">{children}</div>
}

export default DraggableWorkspace
