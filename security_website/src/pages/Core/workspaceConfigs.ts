export interface WorkspaceConfig {
  id: number
  key: string
  name: string
  description: string
  scope: string[]
  links: Array<{ path: string; label: string }>
}

export const workspaceConfigs: WorkspaceConfig[] = [
  { id: 1, key: 'faculty-coordinator', name: 'Faculty Coordinator', description: 'Faculty oversight, guidance, and institutional coordination.', scope: ['Faculty liaison', 'Institutional approvals', 'Club guidance'], links: [{ path: '/team', label: 'Team directory' }, { path: '/contact', label: 'Contact desk' }] },
  { id: 2, key: 'president', name: 'President', description: 'Club leadership, strategy, and coordination.', scope: ['Club strategy', 'Cross-team coordination', 'Leadership review'], links: [{ path: '/dashboard', label: 'Member dashboard' }, { path: '/team', label: 'Team directory' }] },
  { id: 3, key: 'vice-president', name: 'Vice-president', description: 'Leadership support, operations, and continuity.', scope: ['Operations', 'Continuity planning', 'Team support'], links: [{ path: '/dashboard', label: 'Member dashboard' }, { path: '/events', label: 'Events' }] },
  { id: 4, key: 'editorial-head', name: 'Editorial Head', description: 'Editorial planning, publishing review, and communications.', scope: ['Editorial planning', 'Publishing review', 'Communications'], links: [{ path: '/gallery', label: 'Gallery' }, { path: '/events', label: 'Events' }] },
  { id: 5, key: 'technical-head', name: 'Technical Head', description: 'Technical program planning and engineering review.', scope: ['Technical programs', 'Engineering review', 'CTF operations'], links: [{ path: '/ctf', label: 'CTF arena' }, { path: '/flagships', label: 'Flagships' }] },
  { id: 6, key: 'research-head', name: 'Research Head', description: 'Research planning, review, and knowledge coordination.', scope: ['Research planning', 'Knowledge coordination', 'Review queues'], links: [{ path: '/flagships', label: 'Flagships' }, { path: '/gallery', label: 'Gallery' }] },
  { id: 7, key: 'event-head', name: 'Event Head', description: 'Event planning, scheduling, and delivery coordination.', scope: ['Event planning', 'Scheduling', 'Delivery coordination'], links: [{ path: '/events', label: 'Events' }, { path: '/dashboard', label: 'Member dashboard' }] },
]
