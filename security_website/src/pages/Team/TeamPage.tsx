import TeamCard from '../../components/cards/TeamCard'
import SectionHeader from '../../components/common/SectionHeader'
import DraggableWorkspace from '../../components/layout/DraggableWorkspace'
import { team } from '../../data/team'

function TeamPage() {
  return (
    <DraggableWorkspace pageKey="team">
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
    </DraggableWorkspace>
  )
}

export default TeamPage
