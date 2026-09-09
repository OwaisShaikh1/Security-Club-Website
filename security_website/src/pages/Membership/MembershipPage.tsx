import { useState, type FormEvent } from 'react'
import SectionHeader from '../../components/common/SectionHeader'
import DraggableWorkspace from '../../components/layout/DraggableWorkspace'
import Button from '../../components/ui/Button'
import { submitMembershipApplication } from '../../api/client'
import type { MembershipApplicationInput } from '../../types'

const benefits = ['Access to CTFs', 'Workshops and labs', 'Mentor support', 'Networking opportunities']

const initialForm: MembershipApplicationInput = {
  fullName: '',
  studentId: '',
  branch: '',
  academicYear: 1,
  rollNumber: '',
  collegeEmail: '',
  personalEmail: '',
  phone: '',
  graduationYear: new Date().getFullYear() + 3,
  interestArea: 'web-security',
  motivation: '',
}

function MembershipPage() {
  const [form, setForm] = useState<MembershipApplicationInput>(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const updateText = (field: keyof MembershipApplicationInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const updateNumber = (field: 'academicYear' | 'graduationYear', value: string) => {
    setForm((current) => ({ ...current, [field]: value ? Number(value) : undefined }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await submitMembershipApplication({
        ...form,
        personalEmail: form.personalEmail || undefined,
        phone: form.phone || undefined,
        graduationYear: form.graduationYear || undefined,
        motivation: form.motivation || undefined,
      })
      setSuccess(`Application #${response.id} submitted successfully. We will be in touch soon.`)
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to submit application')
    } finally {
      setIsSubmitting(false)
    }
  }

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

        <form className="card form" onSubmit={handleSubmit}>
          <h3>Student Registration</h3>
          <p className="muted">Membership fee: INR 100 for one year.</p>

          <div className="grid two">
            <div>
              <label htmlFor="fullName">Full name</label>
              <input id="fullName" name="fullName" value={form.fullName} onChange={(event) => updateText('fullName', event.target.value)} required />
            </div>
            <div>
              <label htmlFor="studentId">Student ID</label>
              <input id="studentId" name="studentId" value={form.studentId} onChange={(event) => updateText('studentId', event.target.value)} required />
            </div>
            <div>
              <label htmlFor="branch">Branch</label>
              <input id="branch" name="branch" value={form.branch} onChange={(event) => updateText('branch', event.target.value)} placeholder="e.g. Computer Engineering" required />
            </div>
            <div>
              <label htmlFor="academicYear">Academic year</label>
              <input id="academicYear" name="academicYear" type="number" min="1" max="10" value={form.academicYear} onChange={(event) => updateNumber('academicYear', event.target.value)} required />
            </div>
            <div>
              <label htmlFor="rollNumber">Roll number</label>
              <input id="rollNumber" name="rollNumber" value={form.rollNumber} onChange={(event) => updateText('rollNumber', event.target.value)} required />
            </div>
            <div>
              <label htmlFor="graduationYear">Graduation year</label>
              <input id="graduationYear" name="graduationYear" type="number" min="2000" max="2200" value={form.graduationYear ?? ''} onChange={(event) => updateNumber('graduationYear', event.target.value)} />
            </div>
            <div>
              <label htmlFor="collegeEmail">College email</label>
              <input id="collegeEmail" name="collegeEmail" type="email" value={form.collegeEmail} onChange={(event) => updateText('collegeEmail', event.target.value)} placeholder="you@college.edu" required />
            </div>
            <div>
              <label htmlFor="personalEmail">Personal email</label>
              <input id="personalEmail" name="personalEmail" type="email" value={form.personalEmail} onChange={(event) => updateText('personalEmail', event.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" type="tel" value={form.phone} onChange={(event) => updateText('phone', event.target.value)} />
            </div>
            <div>
              <label htmlFor="interestArea">Interest area</label>
              <select id="interestArea" name="interestArea" value={form.interestArea} onChange={(event) => updateText('interestArea', event.target.value)} required>
                <option value="web-security">Web Security</option>
                <option value="forensics">Forensics</option>
                <option value="network">Network Security</option>
                <option value="crypto">Cryptography</option>
                <option value="security-research">Security Research</option>
              </select>
            </div>
          </div>

          <label htmlFor="motivation">Why do you want to join?</label>
          <textarea id="motivation" name="motivation" rows={5} value={form.motivation} onChange={(event) => updateText('motivation', event.target.value)} placeholder="Tell us what you want to learn or contribute." />

          {error ? <p role="alert">{error}</p> : null}
          {success ? <p role="status">{success}</p> : null}
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit Application'}</Button>
        </form>
      </div>
    </DraggableWorkspace>
  )
}

export default MembershipPage
