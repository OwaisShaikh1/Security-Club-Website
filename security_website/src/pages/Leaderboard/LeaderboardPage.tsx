import SectionHeader from '../../components/common/SectionHeader'
import DraggableWorkspace from '../../components/layout/DraggableWorkspace'
import Badge from '../../components/ui/Badge'
import { leaderboard } from '../../data/leaderboard'

function LeaderboardPage() {
  return (
    <DraggableWorkspace pageKey="leaderboard">
      <SectionHeader
        eyebrow="Leaderboard"
        title="Top Performers"
        subtitle="Competition ranking based on challenge solves, speed, and consistency."
      />

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>Score</th>
              <th>Badges</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry) => (
              <tr key={entry.rank}>
                <td>#{entry.rank}</td>
                <td>{entry.name}</td>
                <td>{entry.score}</td>
                <td>
                  <div className="badge-row">
                    {entry.badges.map((badge) => (
                      <Badge key={badge} tone="success">{badge}</Badge>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DraggableWorkspace>
  )
}

export default LeaderboardPage
