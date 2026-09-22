import { useState, type FormEvent } from 'react'
import SectionHeader from '../../components/common/SectionHeader'
import DraggableWorkspace from '../../components/layout/DraggableWorkspace'
import Button from '../../components/ui/Button'
import { submitMembershipApplication } from '../../api/client'

const benefits = ['Access to CTFs', 'Workshops and labs', 'Mentor support', 'Networking opportunities']

function MembershipPage() {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSubmitting(true); setMessage(null); setError(null)
    try {
      const result = await submitMembershipApplication({ fullName: String(form.get('fullName')), studentId: String(form.get('studentId')), branch: String(form.get('branch')), academicYear: Number(form.get('academicYear')), rollNumber: String(form.get('rollNumber')), collegeEmail: String(form.get('collegeEmail')), personalEmail: String(form.get('personalEmail')) || undefined, phone: String(form.get('phone')) || undefined, graduationYear: form.get('graduationYear') ? Number(form.get('graduationYear')) : undefined, interestArea: String(form.get('interestArea')), motivation: String(form.get('motivation')) || undefined })
      setMessage(`Application #${result.id} submitted. We will contact you after review.`)
      event.currentTarget.reset()
    } catch (submissionError) { setError(submissionError instanceof Error ? submissionError.message : 'Unable to submit your application') }
    finally { setSubmitting(false) }
  }
  return <DraggableWorkspace pageKey="membership"><SectionHeader eyebrow="Membership" title="Join the Security Club" subtitle="Apply first. Approved applicants receive their member account after payment confirmation." /><div className="grid two"><article className="card"><h3>Member Benefits</h3><ul className="plain-list">{benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul><p className="muted membership-note">Your application is reviewed before membership and account access are activated.</p></article><form className="card form" onSubmit={submit}><h3>Membership application</h3><label htmlFor="fullName">Full name</label><input id="fullName" name="fullName" required /><label htmlFor="studentId">Student ID</label><input id="studentId" name="studentId" required /><label htmlFor="branch">Branch</label><input id="branch" name="branch" required /><label htmlFor="academicYear">Academic year</label><select id="academicYear" name="academicYear" defaultValue="" required><option value="" disabled>Select year</option><option value="1">First year</option><option value="2">Second year</option><option value="3">Third year</option><option value="4">Fourth year</option></select><label htmlFor="rollNumber">Roll number</label><input id="rollNumber" name="rollNumber" required /><label htmlFor="collegeEmail">College email</label><input id="collegeEmail" name="collegeEmail" type="email" required /><label htmlFor="personalEmail">Personal email <span className="muted">(optional)</span></label><input id="personalEmail" name="personalEmail" type="email" /><label htmlFor="phone">Phone <span className="muted">(optional)</span></label><input id="phone" name="phone" type="tel" /><label htmlFor="graduationYear">Graduation year <span className="muted">(optional)</span></label><input id="graduationYear" name="graduationYear" type="number" min="2000" max="2200" /><label htmlFor="interestArea">Interest area</label><select id="interestArea" name="interestArea" defaultValue="web-security"><option value="web-security">Web Security</option><option value="forensics">Forensics</option><option value="network-security">Network Security</option><option value="cryptography">Cryptography</option><option value="digital-safety">Digital Safety</option></select><label htmlFor="motivation">Why would you like to join? <span className="muted">(optional)</span></label><textarea id="motivation" name="motivation" rows={4} />{message ? <p className="form-success" role="status">{message}</p> : null}{error ? <p role="alert">{error}</p> : null}<Button type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit application'}</Button></form></div></DraggableWorkspace>
}
export default MembershipPage
