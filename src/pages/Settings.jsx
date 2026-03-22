import { useState, useEffect } from 'react'
import { useToast } from '../components/Toast'

const PAPER_WIDTHS = ['58', '80']
const PRINTER_PORTS = ['USB', 'COM1', 'COM2', 'COM3', 'LPT1', 'Network']

export default function Settings({ darkMode, onToggleDark }) {
  const toast = useToast()
  const [settings, setSettings] = useState({
    store_name: '',
    store_address: '',
    store_phone: '',
    store_gstin: '',
    receipt_paper_width: '80',
    printer_port: 'USB',
    bill_prefix: 'PD',
    gst_enabled: 'true',
    day_close_enabled: 'true',
    bill_reset_daily: 'false',
    auto_print: 'false',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    const s = await window.api.getSettings()
    setSettings(prev => ({ ...prev, ...s }))
    setLoading(false)
  }

  const set = (key, val) => setSettings(prev => ({ ...prev, [key]: val }))

  const save = async () => {
    setSaving(true)
    const res = await window.api.updateSettings(settings)
    setSaving(false)
    if (res.success) toast('Settings saved ✓')
    else toast('Error saving settings')
  }

  if (loading) return <div className="admin-page"><div style={{ padding: 40, color: 'var(--muted)' }}>Loading…</div></div>

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-title">⚙️ SETTINGS</div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : '💾 Save Settings'}
          </button>
        </div>
      </div>

      <div className="admin-body" style={{ maxWidth: 700 }}>
        {/* Store Info */}
        <div className="card">
          <div className="card-title">Store Information</div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Store Name</label>
              <input className="form-input" value={settings.store_name} onChange={e => set('store_name', e.target.value)} placeholder="Pizza Diet" />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input className="form-input" value={settings.store_address} onChange={e => set('store_address', e.target.value)} placeholder="Full store address" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={settings.store_phone} onChange={e => set('store_phone', e.target.value)} placeholder="+91 XXXXX XXXXX" />
              </div>
              <div className="form-group">
                <label className="form-label">GSTIN</label>
                <input className="form-input" value={settings.store_gstin} onChange={e => set('store_gstin', e.target.value)} placeholder="22AAAAA0000A1Z5" />
              </div>
            </div>
          </div>
        </div>

        {/* Billing Config */}
        <div className="card">
          <div className="card-title">Billing Configuration</div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Bill Prefix</label>
                <input className="form-input" value={settings.bill_prefix} onChange={e => set('bill_prefix', e.target.value)} placeholder="PD" maxLength={5} style={{ maxWidth: 120 }} />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Bills will be: {settings.bill_prefix || 'PD'}-0001</div>
              </div>
              <div className="form-group">
                <label className="form-label">Paper Width</label>
                <select className="form-input form-select" value={settings.receipt_paper_width} onChange={e => set('receipt_paper_width', e.target.value)} style={{ maxWidth: 150 }}>
                  {PAPER_WIDTHS.map(w => <option key={w} value={w}>{w}mm</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Printer Port</label>
              <select className="form-input form-select" value={settings.printer_port} onChange={e => set('printer_port', e.target.value)} style={{ maxWidth: 200 }}>
                {PRINTER_PORTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="card">
          <div className="card-title">Feature Toggles</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Dark Mode — managed at app level */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>🌙 Dark Mode</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Switch between light and dark theme</div>
              </div>
              <div className="toggle-wrap">
                <label className="toggle">
                  <input type="checkbox" checked={!!darkMode} onChange={onToggleDark} />
                  <span className="slider" />
                </label>
              </div>
            </div>

            {[
              { key: 'gst_enabled',       label: 'GST Enabled',              desc: 'Show GST line in payment summary and receipts' },
              { key: 'day_close_enabled', label: 'Day Close Enabled',        desc: 'Allow closing the day from Operations' },
              { key: 'bill_reset_daily',  label: 'Reset Bill Numbers Daily', desc: 'Bill counter resets to 0001 each day' },
              { key: 'auto_print',        label: 'Auto-print on Bill',       desc: 'Automatically send receipt to printer when order is billed' },
            ].map(({ key, label, desc }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{desc}</div>
                </div>
                <div className="toggle-wrap">
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings[key] === 'true'}
                      onChange={e => set(key, e.target.checked ? 'true' : 'false')}
                    />
                    <span className="slider" />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="card">
          <div className="card-title">About</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
            <div><strong>Pizza Diet POS</strong> — v1.0.0</div>
            <div>Offline Point of Sale for Pizza Diet outlets.</div>
            <div>Built with Electron + React + SQLite.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
