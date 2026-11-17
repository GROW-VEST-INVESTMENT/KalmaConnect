import { useCallback, useEffect, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.DEV
  ? (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '')
  : ''
const opportunities = [
  'Customer Care Assistant',
  'Marketing Assistant',
  'Business Development Personnel',
  'Community Manager',
  'Support Personnel',
  'Other',
]
const channels = [
  ['social_media', 'Social media'],
  ['community', 'Community groups'],
  ['email', 'Email'],
  ['other', 'Other'],
]
const currentMonthLabel = new Intl.DateTimeFormat('en-NG', { month: 'long', year: 'numeric' }).format(new Date())

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: 'no-store',
  })
  let payload
  try {
    payload = await response.json()
  } catch {
    throw new Error('The server returned an invalid response.')
  }
  if (!response.ok) throw new Error(payload?.message || 'Something went wrong. Please try again.')
  return payload
}

function money(value) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function date(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
}

function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [authMode, setAuthMode] = useState('register')
  const [page, setPage] = useState('Dashboard')
  const [summary, setSummary] = useState(null)
  const [data, setData] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadSummary = useCallback(async () => {
    const result = await request('/api/connect/me')
    setSummary(result)
    return result
  }, [])

  useEffect(() => {
    let active = true
    request('/api/auth/me')
      .then(async ({ user: currentUser }) => {
        if (!active) return
        setUser(currentUser)
        const result = await request('/api/connect/me')
        if (active) setSummary(result)
      })
      .catch((reason) => {
        if (reason.message !== 'Please log in to continue.') setError(reason.message)
      })
      .finally(() => {
        if (active) setChecking(false)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!user || ['Dashboard', 'Profile', 'Applications', 'Settings'].includes(page)) return
    let active = true
    const endpoint = {
      Referrals: '/api/connect/referrals',
      Earnings: '/api/connect/commissions',
      Withdrawals: '/api/connect/payouts',
      Notifications: '/api/notifications',
      Support: '/api/account/support',
    }[page]
    if (!endpoint) return
    request(endpoint)
      .then((result) => { if (active) setData((current) => ({ ...current, [page]: result })) })
      .catch((reason) => { if (active) setError(reason.message) })
    return () => { active = false }
  }, [page, user])

  const perform = async (action, successMessage) => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
      if (successMessage) setNotice(successMessage)
      await loadSummary()
      setData({})
    } catch (reason) {
      setError(reason.message || 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const signOut = async () => {
    try {
      await request('/api/auth/logout', { method: 'POST' })
    } finally {
      setUser(null)
      setSummary(null)
      setPage('Dashboard')
    }
  }

  if (checking) return <div className="loading-screen"><BrandMark /><p>Preparing your workspace…</p></div>
  if (!user) {
    return (
      <AuthPage
        mode={authMode}
        setMode={setAuthMode}
        onAuthenticated={(authenticatedUser, message) => {
          setUser(authenticatedUser)
          setNotice(message || '')
          loadSummary().catch((reason) => setError(reason.message))
        }}
        error={error}
        busy={busy}
        setBusy={setBusy}
      />
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" onClick={(event) => { event.preventDefault(); setPage('Dashboard') }}>
          <BrandMark />
          <span><strong>kalma</strong><small>CONNECT</small></span>
        </a>
        <p className="nav-label">WORKSPACE</p>
        <nav className="main-nav" aria-label="Main navigation">
          {['Dashboard', 'My Profile', 'Applications', 'Referrals', 'Earnings', 'Withdrawals', 'Notifications', 'Support', 'Settings'].map((item) => (
            <button type="button" key={item} className={page === item ? 'nav-item active' : 'nav-item'} onClick={() => { setPage(item); setError(''); setNotice('') }}>
              <span className="nav-glyph" aria-hidden="true"><Icon name={navGlyph(item)} /></span>{item}
              {item === 'Applications' && summary?.applications?.some((application) => application.status === 'pending') && <i className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="secure-note"><span className="secure-note-icon"><Icon name="sparkles" size={18} /></span><p><strong>A place to grow</strong><small>Connect with the Kalma ecosystem.</small></p></div>
          <button className="profile-chip" type="button" onClick={() => setPage('My Profile')}>
            <span className="avatar">{user.name?.[0]?.toUpperCase() || 'K'}</span>
            <span className="profile-chip-name"><strong>{user.name}</strong><small>Kalma member</small></span>
            <span className="chip-chevron">•••</span>
          </button>
          <button type="button" className="signout-button" onClick={signOut}>Sign out</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Kalma Connect</span><span>/</span><strong>{page}</strong></div>
          <div className="topbar-right">
            <button type="button" className="icon-button" aria-label="Notifications" onClick={() => setPage('Notifications')}><Icon name="notifications" /></button>
            <span className="topbar-avatar">{user.name?.[0]?.toUpperCase() || 'K'}</span>
          </div>
        </header>
        <div className="page-wrap">
          {error && <div className="alert alert-error" role="alert">{error}<button type="button" onClick={() => setError('')}>×</button></div>}
          {notice && <div className="alert alert-success" role="status">{notice}<button type="button" onClick={() => setNotice('')}>×</button></div>}
          {page === 'Dashboard' && <DashboardPage summary={summary} onNavigate={setPage} />}
          {page === 'My Profile' && <ProfilePage summary={summary} busy={busy} onSave={(phone) => perform(() => request('/api/account/profile', { method: 'PATCH', body: { phone } }), 'Profile updated.')} />}
          {page === 'Applications' && <ApplicationsPage summary={summary} busy={busy} onSubmit={(body) => perform(() => request('/api/connect/applications', { method: 'POST', body }), 'Your application has been submitted for review.')} />}
          {page === 'Referrals' && <ReferralsPage result={data.Referrals} partner={summary?.partner} busy={busy} onClaim={(promoCode) => perform(() => request('/api/connect/referrals/claim', { method: 'POST', body: { promoCode } }), 'Partner code linked to your account.')} />}
          {page === 'Earnings' && <EarningsPage result={data.Earnings} partner={summary?.partner} />}
          {page === 'Withdrawals' && <WithdrawalsPage result={data.Withdrawals} partner={summary?.partner} minimumPayoutNaira={summary?.minimumPayoutNaira} busy={busy} onSubmit={(body) => perform(() => request('/api/connect/payouts', { method: 'POST', body }), 'Your withdrawal request has been submitted.')} />}
          {page === 'Notifications' && <NotificationsPage result={data.Notifications} />}
          {page === 'Support' && <SupportPage result={data.Support} busy={busy} onSubmit={(body) => perform(() => request('/api/account/support', { method: 'POST', body }), 'Your support request has been sent.')} />}
          {page === 'Settings' && <SettingsPage user={user} onSignOut={signOut} />}
        </div>
      </main>
    </div>
  )
}

function AuthPage({ mode, setMode, onAuthenticated, error, busy, setBusy }) {
  const [form, setForm] = useState(() => ({
    name: '',
    email: '',
    phone: '',
    password: '',
    promoCode: new URLSearchParams(window.location.search).get('ref') || '',
  }))
  const [localError, setLocalError] = useState('')
  const isRegister = mode === 'register'
  const setField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setLocalError('')
    try {
      let registration
      if (isRegister) {
        registration = await request('/api/auth/register', {
          method: 'POST',
          body: {
            name: form.name,
            email: form.email,
            phone: form.phone,
            password: form.password,
            goal: 'I’m still exploring',
            product: 'undecided',
            promoCode: form.promoCode.trim(),
          },
        })
      }
      const { user } = await request('/api/auth/login', { method: 'POST', body: { email: form.email, password: form.password } })
      const successMessage = registration?.promoCodeLinked ? 'Your account was created and the partner code was linked.' : ''
      onAuthenticated(user, successMessage)
    } catch (reason) {
      setLocalError(reason.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-story">
        <a className="brand brand-light" href="/"><BrandMark /><span><strong>kalma</strong><small>CONNECT</small></span></a>
        <div className="story-copy">
          <p className="eyebrow light-eyebrow">YOUR NEXT CHAPTER STARTS HERE</p>
          <h1>Connect. Promote.<br /><em>Earn. Grow.</em></h1>
          <p>Find your place in the Kalma Capital ecosystem—whether you are ready to build a career or grow as a partner.</p>
        </div>
        <div className="story-footer"><span>OPPORTUNITY, BUILT TOGETHER</span><span>© Kalma Capital</span></div>
        <div className="story-orb" aria-hidden="true" />
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="mobile-brand"><BrandMark /><strong>kalma <small>CONNECT</small></strong></div>
          <p className="eyebrow">WELCOME TO KALMA CONNECT</p>
          <h2>{isRegister ? 'Create your account' : 'Welcome back'}</h2>
          <p className="auth-subtitle">{isRegister ? 'Start your journey with Kalma Capital.' : 'Sign in to continue to your workspace.'}</p>
          <div className="auth-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={isRegister} className={isRegister ? 'selected' : ''} onClick={() => { setMode('register'); setLocalError('') }}>Create account</button>
            <button type="button" role="tab" aria-selected={!isRegister} className={!isRegister ? 'selected' : ''} onClick={() => { setMode('login'); setLocalError('') }}>Sign in</button>
          </div>
          {(localError || error) && <div className="auth-error" role="alert">{localError || error}</div>}
          <form onSubmit={submit} className="auth-form">
            {isRegister && <label>Full name<input autoComplete="name" required maxLength={100} value={form.name} onChange={setField('name')} placeholder="e.g. Ada Okafor" /></label>}
            <label>Email address<input type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={setField('email')} placeholder="you@example.com" /></label>
            {isRegister && <label>Phone number <span className="optional">Optional</span><input type="tel" autoComplete="tel" maxLength={32} value={form.phone} onChange={setField('phone')} placeholder="+234 800 000 0000" /></label>}
            <label>Password<input type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={8} value={form.password} onChange={setField('password')} placeholder="At least 8 characters" /></label>
            {isRegister && <label className="promo-code-field">Promo code <span className="optional">Optional</span><input autoCapitalize="characters" autoComplete="off" value={form.promoCode} onChange={setField('promoCode')} placeholder="e.g. KC-ADA02" maxLength={24} aria-describedby="promo-code-hint" /><small id="promo-code-hint">Have a partner’s code? Add it here to link your account.</small></label>}
            <button type="submit" className="primary-button full-button" disabled={busy}>{busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'} <Icon name="arrow-right" size={18} /></button>
          </form>
          <p className="auth-legal">By continuing, you agree to Kalma Capital’s terms and privacy policy.</p>
        </div>
      </section>
    </div>
  )
}

function DashboardPage({ summary, onNavigate }) {
  const firstName = (summary?.profile?.name || 'there').trim().split(/\s+/)[0]
  const applications = summary?.applications || []
  const activeApplications = applications.filter((application) => !['approved', 'rejected'].includes(application.status))
  const partner = summary?.partner
  return (
    <>
      <div className="welcome-row">
        <div><p className="eyebrow">YOUR KALMA CONNECT</p><h1>Good to see you, {firstName}<span className="wave">.</span></h1><p className="muted">Your opportunities and progress, all in one place.</p></div>
        <button type="button" className="primary-button" onClick={() => onNavigate('Applications')}>Explore opportunities <Icon name="arrow-right" size={18} /></button>
      </div>
      <section className="hero-card">
        <div className="hero-card-copy"><span className="hero-kicker">KALMA CONNECT</span><h2>Make your next move<br />with purpose.</h2><p>Apply for an opportunity or become a Connect Partner and help more people discover Kalma.</p><button type="button" className="hero-cta" onClick={() => onNavigate('Applications')}>Find your opportunity <Icon name="arrow-up-right" size={18} /></button></div>
        <div className="hero-art" aria-hidden="true"><span className="art-ring ring-one" /><span className="art-ring ring-two" /><span className="art-star">✳</span><span className="art-spark">✦</span><span className="art-letter">K</span></div>
      </section>
      <div className="section-heading"><div><p className="eyebrow">YOUR OVERVIEW</p><h2>Progress at a glance</h2></div><span className="date-pill">{currentMonthLabel}</span></div>
      <div className="stat-grid">
        <StatCard label="Applications in progress" value={activeApplications.length} caption={activeApplications.length ? 'Keep an eye on your status' : 'Start exploring opportunities'} icon="applications" tone="blue" />
        <StatCard label="Partner referrals" value={partner?.referralCount || 0} caption={partner ? partner.promoCode : 'Partner access unlocks after approval'} icon="referrals" tone="green" />
        <StatCard label="Available earnings" value={money(partner?.availableBalanceNaira)} caption="Approved earnings ready to withdraw" icon="earnings" tone="gold" />
        <StatCard label="Partner status" value={partner ? (partner.status === 'active' ? 'Active' : 'Paused') : 'Not a partner'} caption={partner ? `Promo code · ${partner.promoCode}` : 'Apply to become a Connect Partner'} icon="profile" tone="violet" compact />
      </div>
      <div className="content-grid">
        <section className="surface-card activity-card"><div className="card-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h3>Your applications</h3></div><button className="text-button" type="button" onClick={() => onNavigate('Applications')}>View all <Icon name="arrow-right" size={16} /></button></div>
          {applications.length ? <div className="application-list">{applications.slice(0, 3).map((application) => <ApplicationRow key={application.id} application={application} />)}</div> : <EmptyState title="Your next step starts here" text="Explore open opportunities and submit an application when you are ready." action="Browse opportunities" onClick={() => onNavigate('Applications')} />}
        </section>
        <section className="surface-card side-card"><div className="card-heading"><div><p className="eyebrow">GET STARTED</p><h3>Choose your path</h3></div></div>
          <button className="path-card" type="button" onClick={() => onNavigate('Applications')}><span className="path-icon path-blue"><Icon name="briefcase" /></span><span><strong>Find an opportunity</strong><small>Build your career with Kalma.</small></span><b><Icon name="arrow-right" size={18} /></b></button>
          <button className="path-card" type="button" onClick={() => onNavigate('Applications')}><span className="path-icon path-gold"><Icon name="referrals" /></span><span><strong>Become a partner</strong><small>Refer and grow with us.</small></span><b><Icon name="arrow-right" size={18} /></b></button>
          <div className="help-note"><span><Icon name="support" size={16} /></span><p>Need a hand?<br /><button type="button" onClick={() => onNavigate('Support')}>Visit our support centre</button></p></div>
        </section>
      </div>
    </>
  )
}

function StatCard({ label, value, caption, icon, tone, compact }) {
  return <article className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}><Icon name={icon} size={19} /></span></div><strong className={compact ? 'stat-value compact' : 'stat-value'}>{value}</strong><small>{caption}</small></article>
}

function ProfilePage({ summary, busy, onSave }) {
  const profile = summary?.profile || {}
  const associate = summary?.associate
  const partner = summary?.partner
  const [phone, setPhone] = useState(profile.phone || '')
  const submit = (event) => {
    event.preventDefault()
    onSave(phone.trim())
  }
  return <PageTitle eyebrow="ACCOUNT" title="My profile" subtitle="Your Kalma Connect identity and access." >
    <div className="profile-layout"><section className="surface-card profile-main"><div className="profile-identity"><span className="large-avatar">{profile.name?.[0]?.toUpperCase() || 'K'}</span><div><h3>{profile.name}</h3><p>{profile.email}</p></div></div><div className="detail-list"><Detail label="Full name" value={profile.name} /><Detail label="Email address" value={profile.email} /></div><form className="profile-phone-form" onSubmit={submit}><label>Phone number<input type="tel" maxLength={32} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+234 800 000 0000" /><small>Only your phone number can be changed here.</small></label><button className="secondary-button" type="submit" disabled={busy || phone === (profile.phone || '')}>{busy ? 'Saving…' : 'Save phone number'}</button></form></section>
      <section className="surface-card access-card"><p className="eyebrow">YOUR ACCESS</p><h3>Connected to Kalma</h3><p className="muted">Your application and partner permissions are managed by the Kalma team.</p>{associate && <div className="access-row"><span className="access-mark"><Icon name="check" size={16} /></span><span><strong>Associate</strong><small>{associate.assignedRole}</small></span><span className="status-pill approved">Active</span></div>}{partner && <div className="access-row"><span className="access-mark"><Icon name="referrals" size={16} /></span><span><strong>Connect Partner</strong><small>Promo code · {partner.promoCode}</small></span><span className={`status-pill ${partner.status}`}>{partner.status}</span></div>}</section>
    </div>
  </PageTitle>
}

function ApplicationsPage({ summary, busy, onSubmit }) {
  const [type, setType] = useState('applicant')
  const [roleInterest, setRoleInterest] = useState(opportunities[0])
  const [motivation, setMotivation] = useState('')
  const [experience, setExperience] = useState('')
  const [selectedChannels, setSelectedChannels] = useState([])
  const applications = summary?.applications || []
  const hasActiveApplication = applications.some((application) => application.type === type && !['approved', 'rejected'].includes(application.status))
  const toggleChannel = (value) => setSelectedChannels((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])
  const submit = (event) => {
    event.preventDefault()
    onSubmit({ type, motivation, roleInterest: type === 'applicant' ? roleInterest : '', experience, promotionChannels: type === 'partner' ? selectedChannels : [] })
  }
  return <PageTitle eyebrow="YOUR JOURNEY" title="Applications" subtitle="Explore a path and let us know why it is right for you.">
    <div className="application-page-grid"><section className="surface-card application-form-card"><div className="card-heading"><div><p className="eyebrow">NEW APPLICATION</p><h3>Tell us what you’re looking for</h3></div></div>
      <div className="choice-row"><button type="button" className={type === 'applicant' ? 'choice-card selected' : 'choice-card'} onClick={() => setType('applicant')}><span className="choice-icon"><Icon name="briefcase" size={20} /></span><strong>Join the team</strong><small>Apply for a role at Kalma.</small></button><button type="button" className={type === 'partner' ? 'choice-card selected' : 'choice-card'} onClick={() => setType('partner')}><span className="choice-icon"><Icon name="referrals" size={20} /></span><strong>Become a partner</strong><small>Share Kalma with your network.</small></button></div>
      {hasActiveApplication ? <div className="inline-notice">You already have an application in progress for this path. You can apply again after it has been reviewed.</div> :
        <form className="stack-form" onSubmit={submit}>
          {type === 'applicant' ? <label>Opportunity<select value={roleInterest} onChange={(event) => setRoleInterest(event.target.value)}>{opportunities.map((role) => <option key={role}>{role}</option>)}</select></label> :
            <fieldset className="channel-field"><legend>Where would you promote Kalma?</legend><div className="channel-options">{channels.map(([value, label]) => <label key={value} className="check-option"><input type="checkbox" checked={selectedChannels.includes(value)} onChange={() => toggleChannel(value)} />{label}</label>)}</div></fieldset>}
          <label>{type === 'applicant' ? 'Relevant experience' : 'Relevant experience or community reach'} <span className="optional">Optional</span><textarea rows="3" maxLength={3000} value={experience} onChange={(event) => setExperience(event.target.value)} placeholder="Share a little about your background…" /></label>
          <label>{type === 'applicant' ? 'Why are you interested in this role?' : 'Why would you like to partner with Kalma?'}<textarea rows="4" minLength={30} maxLength={2000} required value={motivation} onChange={(event) => setMotivation(event.target.value)} placeholder="Tell us what motivates you and how you hope to contribute…" /><small className="field-hint">At least 30 characters. {motivation.length}/2000</small></label>
          <button type="submit" disabled={busy || (type === 'partner' && selectedChannels.length === 0)} className="primary-button">{busy ? 'Submitting…' : 'Submit application'} <Icon name="arrow-right" size={18} /></button>
        </form>}
    </section>
    <section className="surface-card timeline-card"><p className="eyebrow">YOUR SUBMISSIONS</p><h3>Application status</h3>{applications.length ? applications.map((application) => <ApplicationRow key={application.id} application={application} />) : <EmptyState title="Nothing submitted yet" text="When you apply, the latest status will appear here." />}</section></div>
  </PageTitle>
}

function ReferralsPage({ result, partner, busy, onClaim }) {
  return <PageTitle eyebrow="PARTNER PROGRAM" title="Referrals" subtitle="Share your code and keep track of the people you bring into the Kalma community.">
    {!partner ? <><AccessPrompt title="Partner tools unlock after approval" text="Submit a Connect Partner application to get your own unique code and start tracking referrals." /><ReferralCodeForm busy={busy} onClaim={onClaim} /></> :
      <><section className="referral-banner"><div><p className="eyebrow">YOUR PARTNER CODE</p><h2>{partner.promoCode}</h2><p>Share your code or link when inviting new Kalma members.</p></div><div className="referral-actions"><button type="button" className="copy-button" onClick={() => navigator.clipboard?.writeText(partner.promoCode)}>Copy code</button><button type="button" className="copy-button" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/?ref=${encodeURIComponent(partner.promoCode)}`)}>Copy invite link</button></div></section>
        <section className="surface-card table-card"><div className="card-heading"><div><p className="eyebrow">REFERRAL ACTIVITY</p><h3>{partner.referralCount} total signups</h3></div></div><ReferralTable referrals={result?.referrals || []} /></section></>}
  </PageTitle>
}

function ReferralCodeForm({ busy, onClaim }) {
  const [promoCode, setPromoCode] = useState('')
  const submit = (event) => {
    event.preventDefault()
    onClaim(promoCode.trim())
  }
  return <section className="surface-card referral-claim-card"><div><p className="eyebrow">INVITED BY A PARTNER?</p><h3>Link a partner code</h3><p className="muted">If you have not linked a referral code to this account, enter it here.</p></div><form onSubmit={submit}><input required maxLength={24} value={promoCode} onChange={(event) => setPromoCode(event.target.value)} placeholder="e.g. KC-ADA02" /><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Linking…' : 'Link code'} <Icon name="arrow-right" size={18} /></button></form></section>
}

function ReferralTable({ referrals }) {
  if (!referrals.length) return <EmptyState title="No referrals yet" text="Your referral signups will appear here once someone creates an account with your code." />
  return <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Registered</th><th>Status</th></tr></thead><tbody>{referrals.map((referral) => <tr key={referral._id}><td>{date(referral.registeredAt || referral.createdAt)}</td><td><span className={`status-pill ${referral.status}`}>{referral.status}</span></td></tr>)}</tbody></table></div>
}

function EarningsPage({ result, partner }) {
  if (!partner) return <PageTitle eyebrow="PARTNER PROGRAM" title="Earnings" subtitle="Review commissions generated from eligible partner activity."><AccessPrompt title="Earnings are available to approved partners" text="Apply to become a Connect Partner. Earnings are reviewed by the Kalma team before becoming withdrawable." /></PageTitle>
  return <PageTitle eyebrow="PARTNER PROGRAM" title="Earnings" subtitle="Your commission activity and available balance.">
    <div className="stat-grid earnings-stats"><StatCard label="Available to withdraw" value={money(partner.availableBalanceNaira)} caption="Approved balance after active requests" icon="earnings" tone="green" /><StatCard label="Pending review" value={money(partner.earnings.pendingNaira)} caption="Waiting for administrator review" icon="clock" tone="gold" /><StatCard label="Total referrals" value={partner.referralCount} caption="Accounts registered with your code" icon="referrals" tone="blue" /></div>
    <section className="surface-card table-card"><div className="card-heading"><div><p className="eyebrow">COMMISSION HISTORY</p><h3>Recent earnings</h3></div></div>{result?.commissions?.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Activity</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>{result.commissions.map((item) => <tr key={item._id}><td>{item.type === 'registration' ? 'Registration reward' : item.type}</td><td>{date(item.createdAt)}</td><td>{money(item.amountNaira)}</td><td><span className={`status-pill ${item.status}`}>{item.status}</span></td></tr>)}</tbody></table></div> : <EmptyState title="Your earnings will show here" text="Approved commissions will appear here after they have been reviewed." />}</section>
  </PageTitle>
}

function WithdrawalsPage({ result, partner, minimumPayoutNaira = 1000, busy, onSubmit }) {
  const [amount, setAmount] = useState('')
  const [banks, setBanks] = useState([])
  const [bankId, setBankId] = useState('')
  const [bankError, setBankError] = useState('')
  useEffect(() => {
    if (!partner) return
    request('/api/account/banks')
      .then((response) => setBanks(response.accounts || response.banks || []))
      .catch((reason) => setBankError(reason.message))
  }, [partner])
  const submit = (event) => {
    event.preventDefault()
    onSubmit({ amountNaira: Number(amount), linkedBankId: bankId })
  }
  return <PageTitle eyebrow="PARTNER PROGRAM" title="Withdrawals" subtitle="Request a withdrawal to one of your linked bank accounts.">
    {!partner ? <AccessPrompt title="Withdrawals unlock after partner approval" text="Withdrawals are available for approved partners with cleared earnings." /> : <>
      <div className="withdrawal-balance"><div><p className="eyebrow">AVAILABLE BALANCE</p><strong>{money(partner.availableBalanceNaira)}</strong><small>Requests can be submitted any day. Payouts are processed on Mondays.</small></div><span className="balance-mark"><Icon name="banknote" size={23} /></span></div>
      <div className="application-page-grid"><section className="surface-card"><p className="eyebrow">NEW REQUEST</p><h3>Withdrawal details</h3><form className="stack-form" onSubmit={submit}>
        <label>Amount (NGN)<input type="number" min={minimumPayoutNaira} step="1" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="e.g. 5000" /><small className="field-hint">Minimum withdrawal: {money(minimumPayoutNaira)}. Must not exceed your available balance.</small></label>
        <label>Pay to<select required value={bankId} onChange={(event) => setBankId(event.target.value)}><option value="">Choose a linked bank account</option>{banks.map((bank) => <option value={bank.id || bank._id} key={bank.id || bank._id}>{bank.bankName} ···· {bank.accountLast4}</option>)}</select></label>
        {bankError && <p className="inline-error">{bankError}</p>}
        {!banks.length && !bankError && <p className="inline-notice">Link a bank account in your Kalma Capital account before requesting a withdrawal.</p>}
        <button className="primary-button" disabled={busy || !banks.length || Number(amount) > partner.availableBalanceNaira}>{busy ? 'Submitting…' : 'Request withdrawal'} <Icon name="arrow-right" size={18} /></button>
      </form></section>
      <section className="surface-card timeline-card"><p className="eyebrow">HISTORY</p><h3>Withdrawal requests</h3>{result?.payouts?.length ? result.payouts.map((payout) => <div className="payout-row" key={payout._id}><span className="payout-icon"><Icon name="banknote" size={17} /></span><span><strong>{money(payout.amountNaira)}</strong><small>{date(payout.createdAt)}{payout.paymentReference ? ` · Ref ${payout.paymentReference}` : ''}</small></span><span className={`status-pill ${payout.status}`}>{payout.status}</span></div>) : <EmptyState title="No withdrawal requests" text="Your requests and payout updates will appear here." />}</section></div>
    </>}
  </PageTitle>
}

function NotificationsPage({ result }) {
  const notifications = result?.notifications || result?.items || []
  return <PageTitle eyebrow="YOUR ACCOUNT" title="Notifications" subtitle="Important updates about your applications and Connect activity.">
    <section className="surface-card table-card">{notifications.length ? notifications.map((item) => <div className="notification-row" key={item.id || item._id}><span className="notification-mark"><Icon name="notifications" size={17} /></span><div><strong>{item.title || 'Kalma Connect update'}</strong><p>{item.message || item.body}</p><small>{date(item.createdAt)}</small></div></div>) : <EmptyState title="You’re all caught up" text="Updates from the Kalma team will show here." />}</section>
  </PageTitle>
}

function SupportPage({ result, busy, onSubmit }) {
  const [category, setCategory] = useState('other')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const submit = (event) => { event.preventDefault(); onSubmit({ category, subject, message }) }
  const requests = result?.requests || result?.supportRequests || []
  return <PageTitle eyebrow="HELP & GUIDANCE" title="Support" subtitle="Need help with your application, partner profile or payout? Send us a message.">
    <div className="application-page-grid"><section className="surface-card"><p className="eyebrow">CONTACT SUPPORT</p><h3>How can we help?</h3><form className="stack-form" onSubmit={submit}><label>Topic<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="account">Account</option><option value="verification">Verification</option><option value="payments">Payments</option><option value="technical">Technical issue</option><option value="other">Other</option></select></label><label>Subject<input required minLength={3} maxLength={120} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="What do you need help with?" /></label><label>Message<textarea rows="5" minLength={10} maxLength={2000} required value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Share a few details so our team can help…" /></label><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send message'} <Icon name="arrow-right" size={18} /></button></form></section><section className="surface-card"><p className="eyebrow">YOUR REQUESTS</p><h3>Recent conversations</h3>{requests.length ? requests.map((item) => <div className="support-row" key={item.reference || item.id || item._id}><strong>{item.subject}</strong><small>{date(item.createdAt)} · {item.status || 'Received'}</small><p>{item.message || item.description}</p></div>) : <EmptyState title="Nothing to follow up on" text="Your support requests will be tracked here." />}</section></div>
  </PageTitle>
}

function SettingsPage({ user, onSignOut }) {
  return <PageTitle eyebrow="ACCOUNT PREFERENCES" title="Settings" subtitle="Manage your access to Kalma Connect.">
    <section className="surface-card settings-card"><div className="settings-row"><div><strong>Account email</strong><small>Used for Kalma Capital account access.</small></div><span>{user.email}</span></div><div className="settings-row"><div><strong>Security</strong><small>Your session is protected by Kalma Capital account authentication.</small></div><span className="status-pill approved">Secure session</span></div><div className="settings-row"><div><strong>Need to leave?</strong><small>Sign out of this device.</small></div><button type="button" className="secondary-button" onClick={onSignOut}>Sign out</button></div></section>
  </PageTitle>
}

function ApplicationRow({ application }) {
  return <div className="application-row"><span className={`application-icon ${application.type}`}><Icon name={application.type === 'partner' ? 'referrals' : 'applications'} size={18} /></span><div className="application-info"><strong>{application.type === 'partner' ? 'Connect Partner' : application.roleInterest || 'Kalma opportunity'}</strong><small>{application.type === 'partner' ? 'Partner application' : 'Talent application'} · {date(application.createdAt)}</small>{application.reviewNote && <small className="review-note">{application.reviewNote}</small>}</div><span className={`status-pill ${application.status}`}>{application.status.replaceAll('_', ' ')}</span></div>
}

function Detail({ label, value }) {
  return <div className="detail-row"><span>{label}</span><strong>{value || '—'}</strong></div>
}

function PageTitle({ eyebrow, title, subtitle, children }) {
  return <><div className="page-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{subtitle}</p></div>{children}</>
}

function EmptyState({ title, text, action, onClick }) {
  return <div className="empty-state"><span className="empty-mark"><Icon name="sparkles" size={18} /></span><strong>{title}</strong><p>{text}</p>{action && <button type="button" className="text-button" onClick={onClick}>{action} <Icon name="arrow-right" size={16} /></button>}</div>
}

function AccessPrompt({ title, text }) {
  return <section className="surface-card access-prompt"><span className="prompt-mark"><Icon name="profile" size={21} /></span><h3>{title}</h3><p>{text}</p></section>
}

function navGlyph(label) {
  return ({
    Dashboard: 'dashboard',
    'My Profile': 'profile',
    Applications: 'applications',
    Referrals: 'referrals',
    Earnings: 'earnings',
    Withdrawals: 'withdrawals',
    Notifications: 'notifications',
    Support: 'support',
    Settings: 'settings',
  })[label] || 'dashboard'
}

function BrandMark() {
  return <svg className="brand-symbol" aria-hidden="true" viewBox="0 0 40 40">
    <path d="M14 10v20m12-20L14 20l12 10" fill="none" stroke="#e5c88c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="27.5" cy="10" r="1.5" fill="#e5c88c" />
  </svg>
}

function Icon({ name, size = 20 }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const icons = {
    dashboard: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
    profile: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
    applications: <><rect x="5" y="4.5" width="14" height="17" rx="2" /><path d="M9 4.5v-1h6v1M8.5 10h7M8.5 14h7M8.5 18h4" /></>,
    briefcase: <><rect x="3.5" y="7" width="17" height="13" rx="2" /><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7M3.5 12h17M10 12v2h4v-2" /></>,
    referrals: <><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="m8.3 10.8 7.3-3.6m-7.3 5.9 7.3 3.6" /></>,
    earnings: <><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="M7 9h.01M17 15h.01M12 8.5v7m2-5.5c-.5-.5-1.2-.8-2-.8-1.1 0-1.8.5-1.8 1.3s.7 1.1 1.8 1.4 1.8.6 1.8 1.4-.7 1.4-1.9 1.4c-.9 0-1.6-.3-2.2-.8" /></>,
    withdrawals: <><path d="M7 7h12l-3-3m3 3-3 3M17 17H5l3 3m-3-3 3-3" /></>,
    notifications: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    support: <><path d="M4 13v-1a8 8 0 0 1 16 0v1" /><rect x="3.5" y="12" width="4" height="7" rx="2" /><rect x="16.5" y="12" width="4" height="7" rx="2" /><path d="M17 20c-1 1-2.3 1.5-4 1.5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1a1.8 1.8 0 1 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 1 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3h-.2a1.8 1.8 0 1 1 0-3.6h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 1 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 1 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    'arrow-right': <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    'arrow-up-right': <><path d="M7 17 17 7M8 7h9v9" /></>,
    sparkles: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15ZM5 16l.6 1.4L7 18l-1.4.6L5 20l-.6-1.4L3 18l1.4-.6L5 16Z" /></>,
    check: <path d="m5 12 4.5 4.5L19 7" />,
    banknote: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M7 9H6v1M17 15h1v-1" /></>,
  }
  return <svg className="app-icon" aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" {...common}>{icons[name] || icons.dashboard}</svg>
}

export default App
