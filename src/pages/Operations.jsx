import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useOrderStore } from '../store/orderStore'
import { useToast } from '../components/Toast'
import ReceiptModal from '../components/ReceiptModal'

function formatCurrency(n) {
  return `₹${(n || 0).toFixed(2)}`
}

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

export default function Operations({ settings, onDayClose, onDayReopen }) {
  const toast = useToast()
  const user = useAuthStore(s => s.user)
  const { loadHeldOrder, clearOrder } = useOrderStore()

  const [activeTab, setActiveTab] = useState('dashboard')
  const [report, setReport] = useState(null)
  const [orders, setOrders] = useState([])
  const [heldOrders, setHeldOrders] = useState([])
  const [dateFrom, setDateFrom] = useState(getToday())
  const [dateTo, setDateTo] = useState(getToday())
  const [loading, setLoading] = useState(false)
  const [searchBill, setSearchBill] = useState('')
  const [foundOrder, setFoundOrder] = useState(null)
  const [showReceipt, setShowReceipt] = useState(null)
  const [dayCloseData, setDayCloseData] = useState(null)

  useEffect(() => { loadReport() }, [])
  useEffect(() => { if (activeTab === 'held') loadHeld() }, [activeTab])
  useEffect(() => { loadDayClose() }, [])

  const loadReport = async () => {
    setLoading(true)
    const r = await window.api.getDailyReport(dateFrom, dateTo)
    const o = await window.api.getOrders(dateFrom, dateTo)
    setReport(r)
    setOrders(o)
    setLoading(false)
  }

  const loadHeld = async () => {
    const h = await window.api.getHeldOrders()
    setHeldOrders(h)
  }

  const loadDayClose = async () => {
    const dc = await window.api.getDayClose()
    setDayCloseData(dc)
  }

  const handleResumeHeld = (order) => {
    loadHeldOrder(order)
    window.api.voidHeldOrder(order.id)
    toast('Order resumed in billing ✓')
    loadHeld()
  }

  const handleVoidHeld = async (id) => {
    if (!confirm('Void this held order?')) return
    await window.api.voidHeldOrder(id)
    toast('Held order voided')
    loadHeld()
  }

  const handleSearch = async () => {
    if (!searchBill.trim()) return
    let order = await window.api.getOrderByNumber(searchBill.trim())
    if (!order) {
      const res = await window.api.searchOrdersByPhone(searchBill.trim())
      order = res?.[0] || null
    }
    if (order) {
      setFoundOrder(order)
    } else {
      toast('Order not found')
    }
  }

  const handleDayClose = async () => {
    if (!confirm('Close the day? Billing will be locked until reopened.')) return
    const res = await window.api.closDay(user?.id)
    if (res.success) {
      toast('Day closed ✓')
      onDayClose()
      loadDayClose()
    } else {
      toast('Error: ' + res.error)
    }
  }

  const handleReopen = async () => {
    await window.api.reopenDay()
    toast('Day reopened')
    onDayReopen()
    loadDayClose()
  }

  const showOrderReceipt = async (order) => {
    const full = await window.api.getOrderById(order.id)
    if (!full) { toast('Order not found'); return }
    setShowReceipt({
      orderNumber: full.order_number,
      orderType: full.order_type,
      customerName: full.customer_name,
      customerPhone: full.customer_phone,
      items: full.items.map(i => ({
        name: i.item_name,
        variantName: i.variant_name || '',
        addons: JSON.parse(i.addons_json || '[]'),
        specialNote: i.special_note || '',
        qty: i.qty,
        unitPrice: i.unit_price,
        discountPct: i.discount_pct || 0,
        gstPct: i.gst_pct || 0,
      })),
      subtotal: full.subtotal,
      discount: full.total_discount,
      gst: full.total_gst,
      grandTotal: full.grand_total,
      settings,
      billedAt: full.billed_at,
    })
  }

  const dayClosed = settings?.day_closed === 'true'

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-title">📊 OPERATIONS</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          {dayClosed ? (
            <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>⚠️ Day Closed</span>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>✅ Day Open</span>
          )}
          {user?.role === 'admin' && (
            dayClosed
              ? <button className="btn btn-outline btn-sm" onClick={handleReopen}>Reopen Day</button>
              : <button className="btn btn-danger btn-sm" onClick={handleDayClose}>Close Day</button>
          )}
        </div>
      </div>

      <div className="admin-body">
        <div className="tab-bar">
          {['dashboard', 'orders', 'held', 'reprint'].map(tab => (
            <div key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
              {{ dashboard: '📊 Dashboard', orders: '🧾 Orders', held: '⏸ Held Orders', reprint: '🖨 Reprint' }[tab]}
            </div>
          ))}
        </div>

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ marginBottom: 4 }}>From</label>
                <input type="date" className="form-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 150 }} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ marginBottom: 4 }}>To</label>
                <input type="date" className="form-input" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 150 }} />
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 20 }} onClick={loadReport}>
                Apply
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>Loading report…</div>
            ) : report ? (
              <>
                <div className="stat-grid">
                  <div className="stat-card">
                    <div className="stat-label">Total Orders</div>
                    <div className="stat-value">{report.summary?.total_orders || 0}</div>
                    <div className="stat-sub">For selected period</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Total Revenue</div>
                    <div className="stat-value" style={{ fontSize: 24 }}>{formatCurrency(report.summary?.total_revenue)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Avg. Order Value</div>
                    <div className="stat-value" style={{ fontSize: 24 }}>{formatCurrency(report.summary?.avg_order_value)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">GST Collected</div>
                    <div className="stat-value" style={{ fontSize: 24 }}>{formatCurrency(report.summary?.total_gst)}</div>
                    <div className="stat-sub">Discount: {formatCurrency(report.summary?.total_discount)}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {/* Category breakdown */}
                  <div className="card">
                    <div className="card-title">Category Wise Sales</div>
                    {report.byCategory?.length === 0 ? (
                      <div style={{ color: 'var(--muted)', fontSize: 13 }}>No data</div>
                    ) : report.byCategory?.map((c, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < report.byCategory.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                        <span style={{ fontWeight: 600 }}>{c.category}</span>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatCurrency(c.revenue)}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.qty} items</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Top items */}
                  <div className="card">
                    <div className="card-title">Top 10 Items</div>
                    {report.topItems?.length === 0 ? (
                      <div style={{ color: 'var(--muted)', fontSize: 13 }}>No data</div>
                    ) : report.topItems?.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < report.topItems.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: 'var(--muted)', fontWeight: 700, fontSize: 11, minWidth: 20 }}>#{i + 1}</span>
                          <span style={{ fontWeight: 600 }}>{item.item_name}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700 }}>{item.total_qty} sold</div>
                          <div style={{ color: 'var(--accent)', fontSize: 11 }}>{formatCurrency(item.total_revenue)}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* By order type */}
                  <div className="card">
                    <div className="card-title">Order Types</div>
                    {report.byType?.map((t, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < report.byType.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                        <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{t.order_type}</span>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700 }}>{formatCurrency(t.revenue)}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.count} orders</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </>
        )}

        {/* ORDERS */}
        {activeTab === 'orders' && (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'flex-end' }}>
              <div>
                <div className="form-label">From</div>
                <input type="date" className="form-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 150 }} />
              </div>
              <div>
                <div className="form-label">To</div>
                <input type="date" className="form-input" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 150 }} />
              </div>
              <button className="btn btn-primary btn-sm" onClick={loadReport}>Apply</button>
            </div>
            <div className="card" style={{ padding: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Bill #</th>
                    <th>Customer</th>
                    <th>Type</th>
                    <th>Time</th>
                    <th className="tr">Grand Total</th>
                    <th className="tr">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>No orders found</td></tr>
                  ) : orders.map(o => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 700, fontFamily: 'Bebas Neue', fontSize: 15, letterSpacing: 1 }}>{o.order_number}</td>
                      <td>{o.customer_name || '—'} {o.customer_phone ? `· ${o.customer_phone}` : ''}</td>
                      <td style={{ textTransform: 'capitalize' }}>{o.order_type}</td>
                      <td style={{ fontSize: 12 }}>{o.billed_at ? new Date(o.billed_at).toLocaleString('en-IN') : '—'}</td>
                      <td className="tr" style={{ fontWeight: 700 }}>{formatCurrency(o.grand_total)}</td>
                      <td className="tr">
                        <button className="btn btn-outline btn-sm" onClick={() => showOrderReceipt(o)}>🖨 Receipt</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* HELD ORDERS */}
        {activeTab === 'held' && (
          <div className="card" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ref #</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Items</th>
                  <th className="tr">Total</th>
                  <th className="tr">Actions</th>
                </tr>
              </thead>
              <tbody>
                {heldOrders.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>No held orders</td></tr>
                ) : heldOrders.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{o.order_number}</td>
                    <td>{o.customer_name || '—'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{o.order_type}</td>
                    <td>{o.items?.length || 0} items</td>
                    <td className="tr" style={{ fontWeight: 700 }}>{formatCurrency(o.grand_total)}</td>
                    <td className="tr">
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => handleResumeHeld(o)}>▶ Resume</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleVoidHeld(o.id)}>Void</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* REPRINT */}
        {activeTab === 'reprint' && (
          <div>
            <div className="card" style={{ maxWidth: 500 }}>
              <div className="card-title">Find Bill to Reprint</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  className="form-input"
                  placeholder="Bill number (e.g. PD-0001) or phone number"
                  value={searchBill}
                  onChange={e => setSearchBill(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <button className="btn btn-primary" onClick={handleSearch}>Search</button>
              </div>

              {foundOrder && (
                <div style={{ marginTop: 16, padding: 14, background: 'var(--surface)', borderRadius: 8, fontSize: 13 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{foundOrder.order_number}</div>
                  <div>Customer: {foundOrder.customer_name || '—'} {foundOrder.customer_phone ? `| ${foundOrder.customer_phone}` : ''}</div>
                  <div style={{ marginTop: 4 }}>Total: {formatCurrency(foundOrder.grand_total)}</div>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 10 }}
                    onClick={() => showOrderReceipt(foundOrder)}
                  >
                    🖨 View & Reprint
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showReceipt && (
        <ReceiptModal
          receiptData={showReceipt}
          onClose={() => setShowReceipt(null)}
          onPrint={() => {
            const text = `${showReceipt.orderNumber}\n---\n`
            window.api.printReceipt(text)
            toast('Sent to printer')
          }}
        />
      )}
    </div>
  )
}
