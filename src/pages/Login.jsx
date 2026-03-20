import { useState } from 'react'
import { useAuthStore } from '../store/authStore'

export default function Login() {
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore(s => s.login)

  const doLogin = async () => {
    if (!userId.trim() || !password) {
      setError('Please enter User ID and Password')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await window.api.login(userId.trim(), password)
      if (res.success) {
        login(res.user)
      } else {
        setError(res.error || 'Invalid ID or Password')
      }
    } catch (e) {
      setError('Login failed. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="screen-login">
      <div className="lcard">
        <div className="l-brand">🍕 Pizza Diet</div>
        <div className="l-sub">Point of Sale</div>

        <div className="lf">
          <label>User ID</label>
          <input
            type="text"
            placeholder="Enter staff ID"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && document.getElementById('lpw').focus()}
            autoFocus
          />
        </div>

        <div className="lf">
          <label>Password</label>
          <input
            id="lpw"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doLogin()}
          />
        </div>

        <label className="remember">
          <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
          Remember me
        </label>

        <button className="btn-login" onClick={doLogin} disabled={loading}>
          {loading ? 'Logging in...' : 'LOGIN →'}
        </button>

        <div className="lerr">{error}</div>
      </div>
    </div>
  )
}
