import { useState, useEffect } from 'react'
import { useToast } from '../components/Toast'

// ── Customer Form Modal ───────────────────────────────────────────────────────
function CustomerForm({ customer, onSave, onClose }) {
  const toast = useToast()
  const [data, setData] = useState({
    name:    customer?.name    || '',
    phone:   customer?.phone   || '',
    address: customer?.address || '',
    notes:   customer?.notes   || '',
  })
  const set = (k, v) => setData(d => ({ ...d, [k]: v }))

  const handleSave = async () => {
    if (!data.name.trim())  { toast('Name is required');  return }
    if (!data.phone.trim()) { toast('Phone is required'); return }
    const res = customer?.id
      ? await window.api.updateCustomer(customer.id, data)
      : await window.api.addCustomer(data)
    if (res.success) { toast('Saved ✓'); onSave() }
    else toast('Error: ' + res.error)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div className="modal-title">{customer ? 'EDIT CUSTOMER' : 'ADD CUSTOMER'}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Name *</label>
              <input className="form-input" value={data.name} onChange={e => set('name', e.target.value)} placeholder="Customer name" autoFocus />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Phone * (must be unique)</label>
              <input className="form-input" value={data.phone} onChange={e => set('phone', e.target.value)} placeholder="e.g. 9876543210" />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Address</label>
            <input className="form-input" value={data.address} onChange={e => set('address', e.target.value)} placeholder="Full address" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Notes</label>
            <input className="form-input" value={data.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes about this customer" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>{customer ? 'Save Changes' : 'Add Customer'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Order History Modal ───────────────────────────────────────────────────────
function OrderHistoryModal({ customer, onClose }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!customer.phone) { setLoading(false); return }
    window.api.getCustomerOrders(customer.phone).then(o => {
      setOrders(o || [])
      setLoading(false)
    })
  }, [customer.phone])

  const initials = (name) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const typeLabel = { dine: 'Dine-In', takeaway: 'Takeaway', delivery: 'Delivery' }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box modal-wide" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="cust-avatar">{initials(customer.name)}</div>
            <div>
              <div className="modal-title" style={{ fontSize: 20 }}>{customer.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                📞 {customer.phone || '—'}
                {customer.address ? ` · 📍 ${customer.address}` : ''}
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, borderBottom: '1px solid var(--border)', background: 'var(--border)' }}>
          {[
            { label: 'Total Orders', value: customer.total_orders || 0 },
            { label: 'Total Spent', value: `₹${(customer.total_spent || 0).toFixed(2)}` },
            { label: 'Last Order', value: customer.last_order_at ? new Date(customer.last_order_at).toLocaleDateString('en-IN') : 'Never' },
          ].map(s => (
            <div key={s.label} style={{ padding: '14px 20px', background: 'var(--surface)', textAlign: 'center' }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)', fontWeight: 700 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: 'var(--accent)' }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="modal-body" style={{ padding: '16px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>Loading…</div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>No order history yet</div>
          ) : (
            orders.map(o => (
              <div key={o.id} className="order-hist-row">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'Bebas Neue', letterSpacing: 1, color: 'var(--accent)' }}>
                      {o.order_number}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {typeLabel[o.order_type] || o.order_type}
                      {o.customer_address ? ` · ${o.customer_address}` : ''}
                    </div>
                    <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text)' }}>
                      {o.items_summary || '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>₹{(o.grand_total || 0).toFixed(2)}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {o.billed_at ? new Date(o.billed_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CustomerManager() {
  const toast = useToast()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [editCust, setEditCust]   = useState(null)
  const [histCust, setHistCust]   = useState(null)

  const load = () => {
    setLoading(true)
    window.api.getCustomers().then(c => { setCustomers(c || []); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (c) => {
    if (!confirm(`Delete ${c.name}? Their order history is preserved.`)) return
    const res = await window.api.deleteCustomer(c.id)
    if (res.success) { toast('Deleted'); load() }
    else toast('Error: ' + res.error)
  }

  const initials = (name) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const filtered = customers.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.address || '').toLowerCase().includes(q)
  })

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-title">👥 CUSTOMER MANAGEMENT</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{customers.length} customers</span>
          <button className="btn btn-primary" onClick={() => { setEditCust(null); setShowForm(true) }}>
            + Add Customer
          </button>
        </div>
      </div>

      <div className="admin-body">
        {/* Search */}
        <div className="search-bar">
          <input
            className="search-input"
            placeholder="Search by name, phone, address…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Summary stats */}
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-label">Total Customers</div>
            <div className="stat-value">{customers.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Repeat Customers</div>
            <div className="stat-value">{customers.filter(c => (c.total_orders || 0) > 1).length}</div>
            <div className="stat-sub">2+ orders</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Revenue</div>
            <div className="stat-value" style={{ fontSize: 22 }}>
              ₹{customers.reduce((s, c) => s + (c.total_spent || 0), 0).toFixed(0)}
            </div>
          </div>
        </div>

        {/* Customer table */}
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>Loading…</div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}></th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Total Orders</th>
                  <th>Total Spent</th>
                  <th>Last Order</th>
                  <th className="tr">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
                      {customers.length === 0 ? 'No customers yet. Customers are added automatically when orders are billed with a phone number.' : 'No results.'}
                    </td>
                  </tr>
                ) : filtered.map(c => (
                  <tr key={c.id}>
                    <td style={{ padding: '10px 8px 10px 14px' }}>
                      <div className="cust-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                        {initials(c.name)}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{c.name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{c.phone || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.address || '—'}
                    </td>
                    <td>
                      <span style={{
                        background: (c.total_orders || 0) > 0 ? 'var(--accent-lt)' : 'var(--surface)',
                        color: (c.total_orders || 0) > 0 ? 'var(--accent)' : 'var(--muted)',
                        padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                      }}>
                        {c.total_orders || 0}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: (c.total_spent || 0) > 0 ? 'var(--green)' : 'var(--muted)' }}>
                      {(c.total_spent || 0) > 0 ? `₹${(c.total_spent).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {c.last_order_at ? new Date(c.last_order_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="tr">
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => setHistCust(c)}>📋 History</button>
                        <button className="btn btn-outline btn-sm" onClick={() => { setEditCust(c); setShowForm(true) }}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <CustomerForm
          customer={editCust}
          onSave={() => { setShowForm(false); setEditCust(null); load() }}
          onClose={() => { setShowForm(false); setEditCust(null) }}
        />
      )}

      {histCust && (
        <OrderHistoryModal
          customer={histCust}
          onClose={() => setHistCust(null)}
        />
      )}
    </div>
  )
}
