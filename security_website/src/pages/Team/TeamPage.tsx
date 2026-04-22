import TeamCard from '../../components/cards/TeamCard'
import SectionHeader from '../../components/common/SectionHeader'
import { team } from '../../data/team'

function TeamPage() {
  return (
    <div className="page team-page">
      <SectionHeader
        eyebrow="Team"
        title="Meet the Builders"
        subtitle="Mentors, organizers, and competitive participants behind club initiatives."
      />

      <div className="grid three">
        {team.map((member) => (
          <TeamCard key={member.id} member={member} />
        ))}
      </div>
    </div>
  )
}

export default TeamPage
