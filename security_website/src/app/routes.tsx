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
import LoginPage from '../pages/Auth/LoginPage'
import RegisterPage from '../pages/Auth/RegisterPage'
import type { UserRole } from '../api/client'

export interface NavItem {
  path: string
  label: string
}

export interface AppRoute {
  path: string
  label: string
  element: ReactNode
  requiredRole: UserRole
}

export const appRoutes: AppRoute[] = [
  { path: '/', label: 'Home', element: <HomePage />, requiredRole: 'visitor' },
  { path: '/events', label: 'Events', element: <EventsPage />, requiredRole: 'visitor' },
  { path: '/flagships', label: 'Flagships', element: <FlagshipsPage />, requiredRole: 'core' },
  { path: '/team', label: 'Team', element: <TeamPage />, requiredRole: 'core' },
  { path: '/gallery', label: 'Gallery', element: <GalleryPage />, requiredRole: 'visitor' },
  { path: '/leaderboard', label: 'Leaderboard', element: <LeaderboardPage />, requiredRole: 'member' },
  { path: '/membership', label: 'Membership', element: <MembershipPage />, requiredRole: 'visitor' },
  { path: '/contact', label: 'Contact', element: <ContactPage />, requiredRole: 'visitor' },
  { path: '/dashboard', label: 'Dashboard', element: <DashboardPage />, requiredRole: 'member' },
  { path: '/ctf', label: 'CTF', element: <CTFPage />, requiredRole: 'member' },
  { path: '/login', label: 'Log in', element: <LoginPage />, requiredRole: 'visitor' },
  { path: '/register', label: 'Register', element: <RegisterPage />, requiredRole: 'visitor' },
]

export const navItems: NavItem[] = appRoutes.map(({ path, label }) => ({ path, label }))
