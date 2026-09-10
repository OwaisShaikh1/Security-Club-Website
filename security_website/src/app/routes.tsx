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
import ProfilePage from '../pages/Profile/ProfilePage'
import LoginPage from '../pages/Auth/LoginPage'
import RegisterPage from '../pages/Auth/RegisterPage'
import ActivatePage from '../pages/Auth/ActivatePage'
import AdminPage from '../pages/Admin/AdminPage'
import CoreWorkspacePage from '../pages/Core/CoreWorkspacePage'
import FacultyCoordinatorPage from '../pages/Core/FacultyCoordinatorPage'
import PresidentPage from '../pages/Core/PresidentPage'
import VicePresidentPage from '../pages/Core/VicePresidentPage'
import EditorialHeadPage from '../pages/Core/EditorialHeadPage'
import TechnicalHeadPage from '../pages/Core/TechnicalHeadPage'
import ResearchHeadPage from '../pages/Core/ResearchHeadPage'
import EventHeadPage from '../pages/Core/EventHeadPage'
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
  requiredPermission?: string
  requiredPosition?: string
}

export const appRoutes: AppRoute[] = [
  { path: '/', label: 'Home', element: <HomePage />, requiredRole: 'visitor' },
  { path: '/events', label: 'Events', element: <EventsPage />, requiredRole: 'visitor' },
  { path: '/flagships', label: 'Flagships', element: <FlagshipsPage />, requiredRole: 'member', requiredPermission: 'content.read' },
  { path: '/team', label: 'Team', element: <TeamPage />, requiredRole: 'member', requiredPermission: 'content.read' },
  { path: '/gallery', label: 'Gallery', element: <GalleryPage />, requiredRole: 'visitor' },
  { path: '/leaderboard', label: 'Leaderboard', element: <LeaderboardPage />, requiredRole: 'member', requiredPermission: 'pages.view_member' },
  { path: '/membership', label: 'Membership', element: <MembershipPage />, requiredRole: 'visitor' },
  { path: '/contact', label: 'Contact', element: <ContactPage />, requiredRole: 'visitor' },
  { path: '/dashboard', label: 'Dashboard', element: <DashboardPage />, requiredRole: 'member', requiredPermission: 'pages.view_member' },
  { path: '/ctf', label: 'CTF', element: <CTFPage />, requiredRole: 'member', requiredPermission: 'pages.view_member' },
  { path: '/profile', label: 'Profile', element: <ProfilePage />, requiredRole: 'member' },
  { path: '/login', label: 'Log in', element: <LoginPage />, requiredRole: 'visitor' },
  { path: '/register', label: 'Register', element: <RegisterPage />, requiredRole: 'visitor' },
  { path: '/activate', label: 'Activate', element: <ActivatePage />, requiredRole: 'visitor' },
  { path: '/admin', label: 'Admin', element: <AdminPage />, requiredRole: 'admin', requiredPermission: 'permissions.manage' },
  { path: '/core-workspace', label: 'Core Workspace', element: <CoreWorkspacePage />, requiredRole: 'member', requiredPermission: 'content.read' },
  { path: '/core/faculty-coordinator', label: 'Faculty Coordinator', element: <FacultyCoordinatorPage />, requiredRole: 'member', requiredPermission: 'content.read', requiredPosition: 'faculty-coordinator' },
  { path: '/core/president', label: 'President', element: <PresidentPage />, requiredRole: 'member', requiredPermission: 'content.read', requiredPosition: 'president' },
  { path: '/core/vice-president', label: 'Vice-president', element: <VicePresidentPage />, requiredRole: 'member', requiredPermission: 'content.read', requiredPosition: 'vice-president' },
  { path: '/core/editorial-head', label: 'Editorial Head', element: <EditorialHeadPage />, requiredRole: 'member', requiredPermission: 'content.read', requiredPosition: 'editorial-head' },
  { path: '/core/technical-head', label: 'Technical Head', element: <TechnicalHeadPage />, requiredRole: 'member', requiredPermission: 'content.read', requiredPosition: 'technical-head' },
  { path: '/core/research-head', label: 'Research Head', element: <ResearchHeadPage />, requiredRole: 'member', requiredPermission: 'content.read', requiredPosition: 'research-head' },
  { path: '/core/event-head', label: 'Event Head', element: <EventHeadPage />, requiredRole: 'member', requiredPermission: 'content.read', requiredPosition: 'event-head' },
]

export const navItems: NavItem[] = appRoutes.map(({ path, label }) => ({ path, label }))
