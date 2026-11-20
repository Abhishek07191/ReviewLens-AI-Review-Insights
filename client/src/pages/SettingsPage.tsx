import { useEffect, useState } from 'react'
import { CheckCircle2, Database, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react'
import { fetchHealth, getApiErrorMessage } from '../services/api'
import type { HealthResponse } from '../types/api'

export function SettingsPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [healthError, setHealthError] = useState('')

  useEffect(() => {
    let active = true
    void fetchHealth()
      .then((response) => {
        if (active) setHealth(response)
      })
      .catch((error: unknown) => {
        if (active) setHealthError(getApiErrorMessage(error))
      })
    return () => { active = false }
  }, [])

  return (
    <div className="page-content settings-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">WORKSPACE PREFERENCES</span>
          <h2>Settings</h2>
          <p>Review how your ReviewLens workspace is configured.</p>
        </div>
      </div>
      <section className="panel settings-panel">
        <div className="settings-section-heading">
          <div className="settings-icon"><KeyRound size={18} /></div>
          <div><h3>AI provider</h3><p>Groq powers review analysis and suggested replies.</p></div>
          <span className="settings-badge"><LockKeyhole size={13} /> Server-side only</span>
        </div>
        <div className="settings-info-row">
          <span>API key</span>
          <strong className={health?.aiConfigured ? 'settings-value-ok' : 'settings-value-warning'}>
            {healthError
              ? 'Server status unavailable'
              : health?.aiConfigured
                ? 'Available on the server'
                : 'Not configured'}
          </strong>
        </div>
        {healthError && <p className="settings-health-error">{healthError}</p>}
        <div className="settings-info-row">
          <span>Configuration</span>
          <strong>Set <code>GROQ_API_KEY</code> in the server environment</strong>
        </div>
        <p className="settings-note">
          The API key is never sent to or stored in the browser. Add it to the server environment or your local
          <code> .env</code> file, then restart the API. ReviewLens does not display or edit the key here.
        </p>
      </section>
      <section className="panel settings-panel">
        <div className="settings-section-heading">
          <div className="settings-icon settings-icon-green"><Database size={18} /></div>
          <div><h3>Data & privacy</h3><p>Review text and analysis are stored in the local SQLite database.</p></div>
          <span className="settings-badge settings-badge-green"><CheckCircle2 size={13} /> Protected</span>
        </div>
        <div className="settings-info-row">
          <span>Upload limit</span>
          <strong>5 MB CSV</strong>
        </div>
        <div className="settings-info-row">
          <span>Analysis cache</span>
          <strong>Persistent SHA-256 text hash</strong>
        </div>
        <p className="settings-note"><ShieldCheck size={15} /> Review text is sent to Groq only when it is not already cached.</p>
      </section>
    </div>
  )
}
