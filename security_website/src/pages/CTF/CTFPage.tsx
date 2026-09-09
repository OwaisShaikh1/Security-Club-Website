import ChallengeCard from '../../components/cards/ChallengeCard'
import SectionHeader from '../../components/common/SectionHeader'
import DraggableWorkspace from '../../components/layout/DraggableWorkspace'
import Button from '../../components/ui/Button'
import { challenges } from '../../data/ctf'

function CTFPage() {
  return (
    <DraggableWorkspace pageKey="ctf">
      <SectionHeader
        eyebrow="CTF Arena"
        title="Capture The Flag"
        subtitle="Choose a challenge, submit your flag, and climb the leaderboard."
      />

      <div className="grid three">
        {challenges.map((challenge) => (
          <ChallengeCard key={challenge.id} challenge={challenge} />
        ))}
      </div>

      <form className="card form" onSubmit={(event) => event.preventDefault()}>
        <h3>Flag Submission</h3>
        <label htmlFor="challenge">Challenge</label>
        <select id="challenge" name="challenge" defaultValue={String(challenges[0].id)}>
          {challenges.map((challenge) => (
            <option key={challenge.id} value={challenge.id}>{challenge.title}</option>
          ))}
        </select>

        <label htmlFor="flag">Flag</label>
        <input id="flag" name="flag" placeholder="flag{...}" required />

        <Button type="submit">Submit Flag</Button>
      </form>
    </DraggableWorkspace>
  )
}

export default CTFPage
