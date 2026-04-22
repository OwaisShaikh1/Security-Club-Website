import type { TeamMember } from '../../types'
import BaseCard from './BaseCard'

interface TeamCardProps {
  member: TeamMember
}

function TeamCard({ member }: TeamCardProps) {
  return (
    <BaseCard>
      <img className="avatar" src={member.image} alt={`${member.name} portrait`} />
      <h3>{member.name}</h3>
      <p className="role">{member.role}</p>
      <p>{member.quote}</p>
      <a href={member.linkedin} target="_blank" rel="noreferrer">
        LinkedIn
      </a>
    </BaseCard>
  )
}

export default TeamCard
