export const roles = ['admin', 'core', 'member', 'visitor']

export const pageAccess = {
  '/': 'visitor',
  '/events': 'visitor',
  '/gallery': 'visitor',
  '/contact': 'visitor',
  '/dashboard': 'member',
  '/ctf': 'member',
  '/leaderboard': 'member',
  '/membership': 'visitor',
  '/team': 'core',
  '/flagships': 'core',
}

const rank = { visitor: 0, member: 1, core: 2, admin: 3 }

export function canAccess(role, requiredRole) {
  return rank[role] >= rank[requiredRole]
}
