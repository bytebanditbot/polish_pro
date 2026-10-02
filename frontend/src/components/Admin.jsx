import { useCallback, useEffect, useState } from 'react'

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem('adminToken') || '')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [bookings, setBookings] = useState([])
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')

  const logout = useCallback(() => {
    sessionStorage.removeItem('adminToken')
    setToken('')
    setBookings([])
  }, [])

  const load = useCallback(async () => {
    setError('')
    try {
      const res = await fetch('/api/admin/bookings', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) return logout()
      if (!res.ok) throw new Error()
      setBookings(await res.json())
    } catch {
      setError('Could not load bookings.')
    }
  }, [token, logout])

  useEffect(() => {
    if (token) load()
  }, [token, load])

  async function handleLogin(e) {
    e.preventDefault()
    setLoginError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) return setLoginError(data.error || 'Login failed.')
      sessionStorage.setItem('adminToken', data.token)
      setToken(data.token)
      setPassword('')
    } catch {
      setLoginError('Could not reach the server.')
    }
  }

  async function setStatus(id, status) {
    if (status === 'cancelled' && !window.confirm('Cancel this booking?')) return
    const res = await fetch(`/api/admin/bookings/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    })
    if (res.status === 401) return logout()
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Could not update booking.')
      return
    }
    load()
  }

  if (!token) {
    return (
      <main className="admin">
        <h1>Admin login</h1>
        <form className="form" onSubmit={handleLogin}>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button className="btn" type="submit">Log in</button>
          {loginError && <p className="error">{loginError}</p>}
        </form>
        <p><a href="#/">← Back to the site</a></p>
      </main>
    )
  }

  const shown = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter)

  return (
    <main className="admin">
      <div className="admin-head">
        <h1>Bookings</h1>
        <div>
          <a href="#/" style={{ marginRight: '1rem' }}>View site</a>
          <button className="btn" onClick={logout}>Log out</button>
        </div>
      </div>

      <div className="slots">
        {['all', 'pending', 'confirmed', 'cancelled'].map((f) => (
          <button key={f} className={`slot ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}
      {shown.length === 0 && <p className="meta">No bookings.</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th><th>Service</th><th>Customer</th><th>Car</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((b) => (
              <tr key={b.id}>
                <td>{new Date(b.slot_start).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</td>
                <td>{b.service_name}<br /><span className="meta">{b.price_eur} €</span></td>
                <td>
                  {b.customer_name}<br />
                  <span className="meta">{b.customer_email}{b.customer_phone ? ` · ${b.customer_phone}` : ''}</span>
                </td>
                <td>{b.car_model || '–'}</td>
                <td><span className={`badge ${b.status}`}>{b.status}</span></td>
                <td className="actions">
                  {b.status === 'pending' && (
                    <button className="slot" onClick={() => setStatus(b.id, 'confirmed')}>Confirm</button>
                  )}
                  {b.status !== 'cancelled' && (
                    <button className="slot" onClick={() => setStatus(b.id, 'cancelled')}>Cancel</button>
                  )}
                  {b.status === 'cancelled' && (
                    <button className="slot" onClick={() => setStatus(b.id, 'pending')}>Restore</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
