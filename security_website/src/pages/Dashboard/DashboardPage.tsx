import StatCard from '../../components/cards/StatCard'
import SectionHeader from '../../components/common/SectionHeader'
import DraggableWorkspace from '../../components/layout/DraggableWorkspace'

const activity = [
  'Solved Packet Ghost challenge',
  'Attended Network Defense Lab',
  'Submitted writeup for Cipher Crawl',
]

function DashboardPage() {
  return (
    <DraggableWorkspace pageKey="dashboard">
      <SectionHeader
        eyebrow="Dashboard"
        title="Member Snapshot"
        subtitle="Track progress, points, and recent activity at a glance."
      />

      <div className="grid three">
        <StatCard label="Current Rank" value="#4" />
        <StatCard label="Total Points" value="940" />
        <StatCard label="Challenges Solved" value="18" />
      </div>

      <article className="card">
        <h3>Recent Activity</h3>
        <ul className="plain-list">
          {activity.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>
    </DraggableWorkspace>
  )
}

export default DashboardPage
