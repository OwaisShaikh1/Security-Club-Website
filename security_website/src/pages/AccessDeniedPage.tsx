import DraggableWorkspace from '../components/layout/DraggableWorkspace'

interface AccessDeniedPageProps {
  requestedPath: string
}

function AccessDeniedPage({ requestedPath }: AccessDeniedPageProps) {
  return (
    <DraggableWorkspace pageKey="access-denied">
      <section className="auth-page">
        <div className="card auth-card">
          <h2>Access denied</h2>
          <p className="muted">You do not have permission to open <strong>{requestedPath}</strong>.</p>
          <p className="muted">This area requires a higher role, a specific permission, or a matching division position.</p>
        </div>
      </section>
    </DraggableWorkspace>
  )
}

export default AccessDeniedPage
