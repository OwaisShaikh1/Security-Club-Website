import SectionHeader from '../../components/common/SectionHeader'
import DraggableWorkspace from '../../components/layout/DraggableWorkspace'
import Button from '../../components/ui/Button'

const benefits = ['Access to CTFs', 'Workshops and labs', 'Mentor support', 'Networking opportunities']

function MembershipPage() {
  return (
    <DraggableWorkspace pageKey="membership">
      <SectionHeader
        eyebrow="Membership"
        title="Join the Security Club"
        subtitle="Become part of a practical cybersecurity community with guided growth tracks."
      />

      <div className="grid two">
        <article className="card">
          <h3>Member Benefits</h3>
          <ul className="plain-list">
            {benefits.map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>
        </article>

        <form className="card form" onSubmit={(event) => event.preventDefault()}>
          <h3>Membership Form</h3>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" placeholder="Your full name" required />

          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" placeholder="you@college.edu" required />

          <label htmlFor="interest">Interest Area</label>
          <select id="interest" name="interest" defaultValue="web-security">
            <option value="web-security">Web Security</option>
            <option value="forensics">Forensics</option>
            <option value="network">Network Security</option>
            <option value="crypto">Cryptography</option>
          </select>

          <Button type="submit">Submit Application</Button>
        </form>
      </div>
    </DraggableWorkspace>
  )
}

export default MembershipPage
