import type { ReactNode } from 'react'
import CTFPage from '../pages/CTF/CTFPage'
import ContactPage from '../pages/Contact/ContactPage'
import DashboardPage from '../pages/Dashboard/DashboardPage'
import EventsPage from '../pages/Events/EventsPage'
import FlagshipsPage from '../pages/Flagships/FlagshipsPage'
import GalleryPage from '../pages/Gallery/GalleryPage'
import HomePage from '../pages/Home/HomePage'
import LeaderboardPage from '../pages/Leaderboard/LeaderboardPage'
import MembershipPage from '../pages/Membership/MembershipPage'
import TeamPage from '../pages/Team/TeamPage'

export interface NavItem {
  path: string
  label: string
}

export interface AppRoute {
  path: string
  label: string
  element: ReactNode
}

export const appRoutes: AppRoute[] = [
  { path: '/', label: 'Home', element: <HomePage /> },
  { path: '/events', label: 'Events', element: <EventsPage /> },
  { path: '/flagships', label: 'Flagships', element: <FlagshipsPage /> },
  { path: '/team', label: 'Team', element: <TeamPage /> },
  { path: '/gallery', label: 'Gallery', element: <GalleryPage /> },
  { path: '/leaderboard', label: 'Leaderboard', element: <LeaderboardPage /> },
  { path: '/membership', label: 'Membership', element: <MembershipPage /> },
  { path: '/contact', label: 'Contact', element: <ContactPage /> },
  { path: '/dashboard', label: 'Dashboard', element: <DashboardPage /> },
  { path: '/ctf', label: 'CTF', element: <CTFPage /> },
]

export const navItems: NavItem[] = appRoutes.map(({ path, label }) => ({ path, label }))
