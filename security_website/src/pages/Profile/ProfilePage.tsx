import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuthSession, logout } from '../../api/client'
import SectionHeader from '../../components/common/SectionHeader'
import DraggableWorkspace from '../../components/layout/DraggableWorkspace'
import type { AuthSession } from '../../types'

interface ProfilePageProps {
  session?: AuthSession
  onSessionChange?: (session: AuthSession) => void
}

function ProfilePage({ session, onSessionChange }: ProfilePageProps) {
  const navigate = useNavigate()
  const [loadedSession, setLoadedSession] = useState<AuthSession | null>(session ?? null)

  useEffect(() => {
    if (session) return
    getAuthSession().then(setLoadedSession).catch(() => navigate('/'))
  }, [session, navigate])

  const currentSession = session ?? loadedSession
  if (!currentSession) return <DraggableWorkspace pageKey="profile"><section className="auth-page"><div className="card auth-card"><p className="muted">Loading profile…</p></div></section></DraggableWorkspace>

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      onSessionChange?.({
        authenticated: false,
        role: 'visitor',
        user: null,
        permissions: [],
        positions: [],
      })
      navigate('/')
    }
  }

  return (
    <DraggableWorkspace pageKey="profile">
      <SectionHeader
        eyebrow="Account"
        title="Profile"
        subtitle="Manage your club identity, access, and membership status."
      />

      <div className="card profile-card">
        <div className="profile-header-row">
          <div className="profile-avatar" aria-hidden="true">
            {currentSession.user?.displayName?.charAt(0)?.toUpperCase() ?? 'S'}
          </div>
          <div>
            <h3>{currentSession.user?.displayName ?? 'Security Club Member'}</h3>
            <p className="muted">{currentSession.user?.email ?? 'No email available'}</p>
          </div>
        </div>

        <div className="profile-meta-grid">
          <div className="card info-block">
            <span className="eyebrow subtle">Role</span>
            <strong>{currentSession.role}</strong>
          </div>
          <div className="card info-block">
            <span className="eyebrow subtle">Permissions</span>
            <strong>{currentSession.permissions.length}</strong>
          </div>
          <div className="card info-block">
            <span className="eyebrow subtle">Positions</span>
            <strong>{currentSession.positions.length}</strong>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Access overview</h3>
        <ul className="plain-list">
          {currentSession.permissions.length > 0 ? (
            currentSession.permissions.map((permission) => <li key={permission}>{permission}</li>)
          ) : (
            <li>No explicit permissions granted yet.</li>
          )}
        </ul>
      </div>

      <div className="card">
        <h3>Position assignments</h3>
        <ul className="plain-list">
          {currentSession.positions.length > 0 ? (
            currentSession.positions.map((position) => <li key={position.key}>{position.name}</li>)
          ) : (
            <li>No core positions assigned.</li>
          )}
        </ul>
      </div>

      <div className="actions compact-actions">
        <button type="button" className="button button-secondary" onClick={() => navigate('/dashboard')}>Open dashboard</button>
        <button type="button" className="button button-danger" onClick={handleLogout}>Log out</button>
      </div>
    </DraggableWorkspace>
  )
}

export default ProfilePage
