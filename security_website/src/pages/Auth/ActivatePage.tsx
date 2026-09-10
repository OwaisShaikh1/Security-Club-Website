import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import Button from '../../components/ui/Button'
import DraggableWorkspace from '../../components/layout/DraggableWorkspace'
import { activateAccount } from '../../api/client'

function ActivatePage() {
  const [searchParams] = useSearchParams()
  const [token, setToken] = useState(searchParams.get('token') ?? '')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [complete, setComplete] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password !== confirmation) {
      setError('Passwords do not match')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await activateAccount(token, password)
      setComplete(true)
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to activate account')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DraggableWorkspace pageKey="activate">
      <section className="auth-page">
        <div className="card auth-card">
          <h2>Activate membership account</h2>
          {complete ? (
            <>
              <p>Your password is set. You can now sign in after payment activation.</p>
              <Button type="button" onClick={() => window.location.assign('/login')}>Go to login</Button>
            </>
          ) : (
            <form className="form" onSubmit={submit}>
              <label htmlFor="activation-token">Activation token</label>
              <input id="activation-token" value={token} onChange={(event) => setToken(event.target.value)} required />
              <label htmlFor="activation-password">New password</label>
              <input id="activation-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
              <label htmlFor="activation-confirmation">Confirm password</label>
              <input id="activation-confirmation" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required minLength={8} />
              {error ? <p role="alert">{error}</p> : null}
              <Button type="submit" disabled={submitting}>{submitting ? 'Activating...' : 'Set password'}</Button>
            </form>
          )}
        </div>
      </section>
    </DraggableWorkspace>
  )
}

export default ActivatePage
