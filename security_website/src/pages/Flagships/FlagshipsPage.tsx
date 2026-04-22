import FlagshipCard from '../../components/cards/FlagshipCard'
import SectionHeader from '../../components/common/SectionHeader'
import { flagships } from '../../data/flagships'

function FlagshipsPage() {
  return (
    <div className="page">
      <SectionHeader
        eyebrow="Flagships"
        title="Club Signature Programs"
        subtitle="High-impact annual experiences that define our competitive and educational culture."
      />

      <div className="grid two">
        {flagships.map((flagship) => (
          <FlagshipCard key={flagship.id} flagship={flagship} />
        ))}
      </div>
    </div>
  )
}

export default FlagshipsPage
