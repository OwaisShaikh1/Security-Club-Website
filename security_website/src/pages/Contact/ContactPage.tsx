import SectionHeader from '../../components/common/SectionHeader'
import DraggableWorkspace from '../../components/layout/DraggableWorkspace'
import Button from '../../components/ui/Button'

function ContactPage() {
  return (
    <DraggableWorkspace pageKey="contact">
      <SectionHeader
        eyebrow="Contact"
        title="Get in Touch"
        subtitle="Reach out for collaborations, event invites, or workshop partnerships."
      />

      <div className="grid two">
        <article className="card">
          <h3>Contact Info</h3>
          <p>Email: securityclub@college.edu</p>
          <p>Location: DBIT Innovation Lab</p>
          <p>Office Hours: Tue and Thu, 4 PM to 6 PM</p>
        </article>

        <form className="card form" onSubmit={(event) => event.preventDefault()}>
          <h3>Contact Form</h3>
          <label htmlFor="contact-name">Name</label>
          <input id="contact-name" name="contact-name" required />

          <label htmlFor="contact-email">Email</label>
          <input id="contact-email" name="contact-email" type="email" required />

          <label htmlFor="message">Message</label>
          <textarea id="message" name="message" rows={5} required />

          <Button type="submit" variant="secondary">Send Message</Button>
        </form>
      </div>
    </DraggableWorkspace>
  )
}

export default ContactPage
