import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import DraggableWorkspace from '../../components/layout/DraggableWorkspace'
import { login } from '../../api/client'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login({ email, password })
      window.location.assign('/')
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to log in')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DraggableWorkspace pageKey="login">
      <section className="auth-page">
        <div className="card auth-card">
          <h2>Log in</h2>
          <p className="muted">Access your Security Club account.</p>
          <form className="form" onSubmit={submit}>
            <label htmlFor="login-email">Email</label>
            <input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <label htmlFor="login-password">Password</label>
            <input id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
            {error ? <p role="alert">{error}</p> : null}
            <Button type="submit" disabled={submitting}>{submitting ? 'Logging in...' : 'Log in'}</Button>
          </form>
          <p className="muted">Need an account? <Link to="/register">Register</Link></p>
        </div>
      </section>
    </DraggableWorkspace>
  )
}

export default LoginPage
