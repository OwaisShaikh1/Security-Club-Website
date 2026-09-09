import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAuthSession } from '../../api/client'
import type { AuthSession } from '../../types'
import DraggableWorkspace from '../../components/layout/DraggableWorkspace'
import SectionHeader from '../../components/common/SectionHeader'
import { ReviewPanel } from './CoreWorkspacePage'
import { workspaceConfigs } from './workspaceConfigs'

interface PositionWorkspacePageProps {
  positionKey: string
}

function PositionWorkspacePage({ positionKey }: PositionWorkspacePageProps) {
  const config = workspaceConfigs.find((item) => item.key === positionKey)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAuthSession().then(setSession).catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Unable to load position workspace'))
  }, [])

  if (!config) return null
  const assigned = session?.positions.some((position) => position.key === positionKey) ?? false
  const canRead = session?.permissions.includes('content.read') ?? false
  const canComment = session?.permissions.includes('content.comment') ?? false

  return (
    <DraggableWorkspace pageKey={positionKey}>
      <SectionHeader eyebrow="Position Workspace" title={config.name} subtitle={config.description} />
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {session ? (
        <>
          <div className="workspace-status">
            <span className="badge">{assigned ? 'POSITION assigned' : 'ADMIN preview'}</span>
            <span className="badge">{canRead ? 'READ enabled' : 'READ unavailable'}</span>
            <span className="badge">{canComment ? 'COMMENT enabled' : 'COMMENT read only'}</span>
          </div>
          <div className="grid two">
            <article className="card">
              <h3>Scope</h3>
              <ul className="scope-list">{config.scope.map((item) => <li key={item}>{item}</li>)}</ul>
              <h3>Relevant pages</h3>
              <div className="workspace-links">{config.links.map((link) => <Link className="btn outline" key={link.path} to={link.path}>{link.label}</Link>)}</div>
            </article>
            <ReviewPanel entityId={config.id} session={session} />
          </div>
        </>
      ) : <p className="muted">Loading position workspace…</p>}
    </DraggableWorkspace>
  )
}

export default PositionWorkspacePage
