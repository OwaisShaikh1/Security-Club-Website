import { useEffect, useState } from 'react'
import DraggableWorkspace from '../../components/layout/DraggableWorkspace'
import SectionHeader from '../../components/common/SectionHeader'
import {
  assignCorePosition,
  getAdminArchitecture,
  removeCorePosition,
  setRolePermission,
  setUserRole,
  type AdminUser,
  type CorePositionAssignment,
  type ArchitectureRole,
} from '../../api/client'

function AdminPage() {
  const [roles, setRoles] = useState<ArchitectureRole[]>([])
  const [positions, setPositions] = useState<CorePositionAssignment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [userId, setUserId] = useState('')
  const [positionKey, setPositionKey] = useState('')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')

  useEffect(() => {
    getAdminArchitecture()
      .then((architecture) => {
        setRoles(architecture.roles)
        setPositions(architecture.positions)
        setUsers(architecture.users)
        setPositionKey((current) => current || architecture.positions[0]?.key || '')
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Unable to load permissions'))
  }, [])

  const toggle = async (roleKey: string, permissionKey: string, enabled: boolean) => {
    const key = `${roleKey}:${permissionKey}`
    setSaving(key)
    setError(null)
    try {
      await setRolePermission(roleKey, permissionKey, enabled)
      setRoles((current) => current.map((role) => role.key !== roleKey ? role : {
        ...role,
        permissions: role.permissions.map((permission) => permission.key !== permissionKey ? permission : { ...permission, enabled }),
      }))
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Unable to update permission')
    } finally {
      setSaving(null)
    }
  }

  const refreshPositions = async () => {
    const architecture = await getAdminArchitecture()
    setPositions(architecture.positions)
    setUsers(architecture.users)
  }

  const changeRole = async (userId: number, role: 'member' | 'core') => {
    setSaving(`role:${userId}`)
    setError(null)
    try {
      await setUserRole(userId, role)
      await refreshPositions()
    } catch (roleError) {
      setError(roleError instanceof Error ? roleError.message : 'Unable to change role')
    } finally {
      setSaving(null)
    }
  }

  const assign = async () => {
    const numericUserId = Number(userId)
    if (!Number.isInteger(numericUserId) || numericUserId < 1 || !positionKey) {
      setError('Enter a valid user ID and choose a position.')
      return
    }
    setSaving(`assign:${positionKey}:${numericUserId}`)
    setError(null)
    try {
      await assignCorePosition(numericUserId, positionKey)
      await refreshPositions()
      setUserId('')
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : 'Unable to assign position')
    } finally {
      setSaving(null)
    }
  }

  const remove = async (assignment: CorePositionAssignment) => {
    if (!assignment.user_id) return
    setSaving(`remove:${assignment.key}:${assignment.user_id}`)
    setError(null)
    try {
      await removeCorePosition(assignment.user_id, assignment.key)
      await refreshPositions()
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Unable to remove position')
    } finally {
      setSaving(null)
    }
  }

  return (
    <DraggableWorkspace pageKey="admin">
      <SectionHeader
        eyebrow="Administration"
        title="Role and Permission Control"
        subtitle="Turn individual read, comment, and write capabilities on or off for each role."
      />
      {error ? <p role="alert">{error}</p> : null}
      <div className="admin-role-grid">
        {roles.map((role) => (
          <article className="card" key={role.key}>
            <h3>{role.name}</h3>
            <p className="muted">{role.description}</p>
            <div className="permission-list">
              {role.permissions.map((permission) => {
                const toggleKey = `${role.key}:${permission.key}`
                return (
                  <label className="permission-row" key={permission.key}>
                    <span>
                      <strong>{permission.key}</strong>
                      <small>{permission.description}</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={permission.enabled}
                      disabled={saving === toggleKey || (role.key === 'admin' && permission.key === 'permissions.manage')}
                      onChange={(event) => toggle(role.key, permission.key, event.target.checked)}
                    />
                  </label>
                )
              })}
            </div>
          </article>
        ))}
      </div>
      <article className="card admin-position-manager">
        <div className="workspace-card-heading">
          <h3>Core position assignments</h3>
          <span className="badge">Current assignments</span>
        </div>
        <p className="muted">Promote a user to member/core, then assign a seeded position. Position assignments grant read/comment workspace scope.</p>
        <div className="position-assignment-form">
          <select aria-label="User" value={selectedUserId} onChange={(event) => { setSelectedUserId(event.target.value); setUserId(event.target.value) }}>
            <option value="">Select user</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.display_name} · {user.email} · {user.role}</option>)}
          </select>
          <select aria-label="Core position" value={positionKey} onChange={(event) => setPositionKey(event.target.value)}>
            <option value="" disabled>Select position</option>
            {[...new Map(positions.map((position) => [position.key, position])).values()].map((position) => <option key={position.key} value={position.key}>{position.name}</option>)}
          </select>
          <button className="btn primary" type="button" onClick={assign} disabled={saving?.startsWith('assign:')}>Assign position</button>
        </div>
        <div className="position-assignment-form">
          {users.map((user) => (
            <div className="position-assignment-row" key={user.id}>
              <span><strong>#{user.id} {user.display_name}</strong><small>{user.email} · {user.role}</small></span>
              {user.role !== 'admin' ? (
                <select value={user.role} onChange={(event) => changeRole(user.id, event.target.value as 'member' | 'core')} disabled={saving === `role:${user.id}`}>
                  <option value="member">Member</option>
                  <option value="core">Core</option>
                </select>
              ) : <span className="badge">Admin</span>}
            </div>
          ))}
        </div>
        <div className="position-assignment-list">
          {positions.map((assignment) => (
            <div className="position-assignment-row" key={`${assignment.key}:${assignment.user_id ?? 'unassigned'}`}>
              <span><strong>{assignment.name}</strong><small>{assignment.user_id ? `${assignment.display_name ?? 'Unnamed user'} · ${assignment.email ?? `user #${assignment.user_id}`}` : 'Unassigned'}</small></span>
              {assignment.user_id ? <button className="btn outline" type="button" onClick={() => remove(assignment)} disabled={saving === `remove:${assignment.key}:${assignment.user_id}`}>Remove</button> : null}
            </div>
          ))}
        </div>
      </article>
    </DraggableWorkspace>
  )
}

export default AdminPage
