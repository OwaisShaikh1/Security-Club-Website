import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { addComment, getAuthSession, getComments, type CommentItem } from '../../api/client'
import type { AuthSession, CorePosition } from '../../types'
import DraggableWorkspace from '../../components/layout/DraggableWorkspace'
import SectionHeader from '../../components/common/SectionHeader'
import { workspaceConfigs } from './workspaceConfigs'

function PermissionStatus({ session }: { session: AuthSession }) {
  return (
    <div className="workspace-status" aria-label="Workspace permissions">
      <span className="badge">{session.permissions.includes('content.read') ? 'READ enabled' : 'READ unavailable'}</span>
      <span className="badge">{session.permissions.includes('content.comment') ? 'COMMENT enabled' : 'COMMENT only unavailable'}</span>
    </div>
  )
}

export function ReviewPanel({ entityId, session }: { entityId: number; session: AuthSession }) {
  const [comments, setComments] = useState<CommentItem[]>([])
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const canComment = session.permissions.includes('content.comment')

  useEffect(() => {
    let mounted = true
    getComments('core-position', entityId)
      .then((items) => { if (mounted) setComments(items) })
      .catch((loadError: unknown) => { if (mounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load review notes') })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [entityId])

  const submit = async () => {
    const value = body.trim()
    if (!value) return
    setError(null)
    try {
      await addComment('core-position', entityId, value)
      const refreshed = await getComments('core-position', entityId)
      setComments(refreshed)
      setBody('')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to add review note')
    }
  }

  return (
    <article className="card review-panel">
      <div className="workspace-card-heading">
        <h3>Review notes</h3>
        <span className="badge">{canComment ? 'Read / comment' : 'Read only'}</span>
      </div>
      {loading ? <p className="muted">Loading notes…</p> : null}
      {!loading && !comments.length ? <p className="muted">No review notes yet.</p> : null}
      <ul className="plain-list review-comments">
        {comments.map((comment) => <li key={comment.id}><strong>{comment.author_name}</strong><span>{comment.body}</span></li>)}
      </ul>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {canComment ? (
        <div className="review-compose">
          <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Add a review note" rows={3} maxLength={5000} />
          <button className="btn primary" type="button" onClick={submit} disabled={!body.trim()}>Post note</button>
        </div>
      ) : null}
    </article>
  )
}

function AssignedPosition({ position, session }: { position: CorePosition; session: AuthSession }) {
  const config = workspaceConfigs.find((item) => item.key === position.key)
  if (!config) return null
  return (
    <article className="card workspace-position-card">
      <div className="workspace-card-heading"><h3>{position.name}</h3><span className="badge">Assigned scope</span></div>
      <p className="muted">{position.description}</p>
      <ul className="scope-list">{config.scope.map((item) => <li key={item}>{item}</li>)}</ul>
      <div className="workspace-links">{config.links.map((link) => <Link key={link.path} className="btn outline" to={link.path}>{link.label}</Link>)}</div>
      <ReviewPanel entityId={position.id} session={session} />
    </article>
  )
}

function CoreWorkspacePage() {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAuthSession().then(setSession).catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Unable to load workspace'))
  }, [])

  return (
    <DraggableWorkspace pageKey="core-workspace">
      <SectionHeader eyebrow="Core Workspace" title="Assigned Position Scopes" subtitle="Review the scopes assigned to your account and collaborate without exposing write access." />
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {session ? (
        <>
          <PermissionStatus session={session} />
          {!session.positions.length ? <article className="card"><p className="muted">No core position is currently assigned to this account.</p></article> : null}
          <div className="workspace-position-grid">{session.positions.map((position) => <AssignedPosition key={position.id} position={position} session={session} />)}</div>
        </>
      ) : <p className="muted">Loading workspace…</p>}
    </DraggableWorkspace>
  )
}

export default CoreWorkspacePage
