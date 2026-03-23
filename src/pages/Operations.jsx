import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useOrderStore } from '../store/orderStore'
import { useToast } from '../components/Toast'
import ReceiptModal from '../components/ReceiptModal'

function fmt(n) { return `₹${(n || 0).toFixed(2)}` }
function fmtQty(n) { return (n || 0).toFixed(2).replace(/\.00$/, '') }
function getToday() { return new Date().toISOString().slice(0, 10) }

// ── Date filter bar ────────────────────────────────────────────────────────
function DateFilter({ from, to, onFrom, onTo, onApply, loading }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 16, flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>From</div>
        <input type="date" className="form-input" value={from} onChange={e => onFrom(e.target.value)} style={{ width: 148 }} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>To</div>
        <input type="date" className="form-input" value={to} onChange={e => onTo(e.target.value)} style={{ width: 148 }} />
      </div>
      {['today', 'week', 'month'].map(p => (
        <button key={p} className="btn btn-outline btn-sm"
          onClick={() => {
            const now = new Date()
            if (p === 'today') { const d = getToday(); onFrom(d); onTo(d) }
            else if (p === 'week') {
              const d = new Date(now); d.setDate(d.getDate() - 6)
              onFrom(d.toISOString().slice(0, 10)); onTo(getToday())
            } else {
              onFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)); onTo(getToday())
            }
          }}
          style={{ alignSelf: 'flex-end' }}
        >
          {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
        </button>
      ))}
      <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-end' }} onClick={onApply} disabled={loading}>
        {loading ? '…' : 'Apply'}
      </button>
    </div>
  )
}

export default function Operations({ settings, onDayClose, onDayReopen }) {
  const toast = useToast()
  const user = useAuthStore(s => s.user)
  const { loadHeldOrder } = useOrderStore()

  const [activeTab, setActiveTab] = useState('sales')
  const [dateFrom, setDateFrom] = useState(getToday())
  const [dateTo, setDateTo] = useState(getToday())
  const [loading, setLoading] = useState(false)

  // Sales panel data
  const [report, setReport]           = useState(null)
  const [catReport, setCatReport]     = useState(null)   // { groups, grand_qty, grand_revenue }
  const [orders, setOrders]           = useState([])

  // Stock panel data
  const [stockConsumed, setStockConsumed] = useState([])

  // Other tabs
  const [heldOrders, setHeldOrders]   = useState([])
  const [searchBill, setSearchBill]   = useState('')
  const [foundOrder, setFoundOrder]   = useState(null)
  const [showReceipt, setShowReceipt] = useState(null)
  const [dayCloseData, setDayCloseData] = useState(null)

  useEffect(() => { loadReport(); loadDayClose() }, [])
  useEffect(() => { if (activeTab === 'held') loadHeld() }, [activeTab])

  const loadReport = async () => {
    setLoading(true)
    const [r, o, cat, stock] = await Promise.all([
      window.api.getDailyReport(dateFrom, dateTo),
      window.api.getOrders(dateFrom, dateTo),
      window.api.getByCategoryItems(dateFrom, dateTo),
      window.api.getStockConsumed(dateFrom, dateTo),
    ])
    setReport(r); setOrders(o); setCatReport(cat); setStockConsumed(stock)
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
    if (order) setFoundOrder(order)
    else toast('Order not found')
  }

  const handleDayClose = async () => {
    if (!confirm('Close the day? Billing will be locked until reopened.')) return
    const res = await window.api.closDay(user?.id)
    if (res.success) { toast('Day closed ✓'); onDayClose(); loadDayClose() }
    else toast('Error: ' + res.error)
  }

  const handleReopen = async () => {
    await window.api.reopenDay()
    toast('Day reopened'); onDayReopen(); loadDayClose()
  }

  const showOrderReceipt = async (order) => {
    const full = await window.api.getOrderById(order.id)
    if (!full) { toast('Order not found'); return }
    setShowReceipt({
      orderNumber: full.order_number, orderType: full.order_type,
      customerName: full.customer_name, customerPhone: full.customer_phone,
      items: full.items.map(i => ({
        name: i.item_name, variantName: i.variant_name || '',
        addons: JSON.parse(i.addons_json || '[]'), specialNote: i.special_note || '',
        qty: i.qty, unitPrice: i.unit_price, discountPct: i.discount_pct || 0, gstPct: i.gst_pct || 0,
      })),
      subtotal: full.subtotal, discount: full.total_discount, gst: full.total_gst,
      grandTotal: full.grand_total, settings, billedAt: full.billed_at,
    })
  }

  const dayClosed = settings?.day_closed === 'true'

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-title">📊 INVENTORY & SALES</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          {dayClosed
            ? <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>⚠️ Day Closed</span>
            : <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>✅ Day Open</span>
          }
          {user?.role === 'admin' && (
            dayClosed
              ? <button className="btn btn-outline btn-sm" onClick={handleReopen}>Reopen Day</button>
              : <button className="btn btn-danger btn-sm" onClick={handleDayClose}>Close Day</button>
          )}
        </div>
      </div>

      <div className="admin-body">
        <div className="tab-bar">
          {[
            { key: 'sales',   label: '📊 Sales & Stock' },
            { key: 'orders',  label: '🧾 Orders' },
            { key: 'held',    label: '⏸ Held Orders' },
            { key: 'reprint', label: '🖨 Reprint' },
          ].map(t => (
            <div key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
              {t.label}
            </div>
          ))}
        </div>

        {/* ── SALES & STOCK — two-panel ──────────────────────────────────── */}
        {activeTab === 'sales' && (
          <>
            <DateFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} onApply={loadReport} loading={loading} />

            {/* Summary bar */}
            {report?.summary && (
              <div className="stat-grid" style={{ marginBottom: 16 }}>
                <div className="stat-card">
                  <div className="stat-label">Total Orders</div>
                  <div className="stat-value">{report.summary.total_orders || 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Revenue</div>
                  <div className="stat-value" style={{ fontSize: 22 }}>{fmt(report.summary.total_revenue)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Avg. Order</div>
                  <div className="stat-value" style={{ fontSize: 22 }}>{fmt(report.summary.avg_order_value)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">GST Collected</div>
                  <div className="stat-value" style={{ fontSize: 22 }}>{fmt(report.summary.total_gst)}</div>
                  <div className="stat-sub">Disc: {fmt(report.summary.total_discount)}</div>
                </div>
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>Loading report…</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>

                {/* ── LEFT — Top Selling by Category ────────────────────── */}
                <div className="card" style={{ padding: 0 }}>
                  <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>📈 Top Selling — By Category</div>
                    {catReport && (
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {catReport.grand_qty} items · {fmt(catReport.grand_revenue)}
                      </div>
                    )}
                  </div>

                  {!catReport || catReport.groups.length === 0 ? (
                    <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No sales data for this period</div>
                  ) : (
                    <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: 'var(--surface2)', position: 'sticky', top: 0 }}>
                            <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', width: 55 }}>Qty</th>
                            <th style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', width: 90 }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {catReport.groups.map((grp, gi) => (
                            <>
                              {/* Category header row */}
                              <tr key={`grp_${gi}`} style={{ background: 'var(--surface2)' }}>
                                <td colSpan={3} style={{ padding: '7px 14px', fontWeight: 700, fontSize: 12, color: 'var(--accent)', letterSpacing: '0.04em' }}>
                                  ▶ {grp.cat_emoji} {grp.category.toUpperCase()}
                                </td>
                              </tr>

                              {/* Item rows */}
                              {grp.items.map((item, ii) => (
                                <tr key={`item_${gi}_${ii}`} style={{ borderBottom: '1px solid var(--border)' }}>
                                  <td style={{ padding: '7px 14px 7px 24px', color: 'var(--text)' }}>{item.item_name}</td>
                                  <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{item.total_qty}</td>
                                  <td style={{ padding: '7px 14px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--text)' }}>{fmt(item.total_revenue)}</td>
                                </tr>
                              ))}

                              {/* Group total */}
                              <tr key={`gtot_${gi}`} style={{ background: 'rgba(var(--accent-rgb,255,107,0),0.06)', borderBottom: '2px solid var(--border)' }}>
                                <td style={{ padding: '6px 14px 6px 24px', fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>Group Total</td>
                                <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, fontSize: 12, fontFamily: 'monospace' }}>{grp.total_qty}</td>
                                <td style={{ padding: '6px 14px', textAlign: 'right', fontWeight: 700, fontSize: 12, fontFamily: 'monospace', color: 'var(--accent)' }}>{fmt(grp.total_revenue)}</td>
                              </tr>
                            </>
                          ))}

                          {/* Grand total */}
                          <tr style={{ background: 'var(--surface2)', borderTop: '2px solid var(--border)' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 700, fontSize: 13 }}>GRAND TOTAL</td>
                            <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>{catReport.grand_qty}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, fontSize: 14, fontFamily: 'monospace', color: 'var(--accent)' }}>{fmt(catReport.grand_revenue)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* ── RIGHT — Stock Consumed ─────────────────────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Order type breakdown */}
                  {report?.byType?.length > 0 && (
                    <div className="card" style={{ padding: 0 }}>
                      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>
                        🛵 Sales by Order Type
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: 'var(--surface2)' }}>
                            <th style={{ padding: '7px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Type</th>
                            <th style={{ padding: '7px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', width: 70 }}>Orders</th>
                            <th style={{ padding: '7px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', width: 100 }}>Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.byType.map((t, i) => (
                            <tr key={i} style={{ borderBottom: i < report.byType.length - 1 ? '1px solid var(--border)' : 'none' }}>
                              <td style={{ padding: '8px 14px', fontWeight: 600, textTransform: 'capitalize' }}>
                                {{ dine: '🪑 Dine-In', takeaway: '🥡 Takeaway', delivery: '🛵 Delivery' }[t.order_type] || t.order_type}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{t.count}</td>
                              <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)' }}>{fmt(t.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Stock consumed */}
                  <div className="card" style={{ padding: 0 }}>
                    <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>📦 Stock Consumed</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Recipe deductions from sales</div>
                    </div>

                    {stockConsumed.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No stock deductions for this period</div>
                    ) : (
                      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: 'var(--surface2)', position: 'sticky', top: 0 }}>
                              <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Stock Item</th>
                              <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', width: 90 }}>Consumed</th>
                              <th style={{ padding: '8px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', width: 90 }}>In Stock</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stockConsumed.map((s, i) => (
                              <tr key={i} style={{ borderBottom: i < stockConsumed.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                <td style={{ padding: '8px 14px', fontWeight: 600 }}>{s.item_name}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#c05000', fontWeight: 700 }}>
                                  −{fmtQty(s.total_consumed)} {s.base_unit}
                                </td>
                                <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: s.current_stock < 0 ? 'var(--red)' : s.current_stock < 10 ? '#e67e22' : 'var(--green)' }}>
                                  {fmtQty(s.current_stock)} {s.base_unit}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Top 10 items (compact) */}
                  {report?.topItems?.length > 0 && (
                    <div className="card" style={{ padding: 0 }}>
                      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>
                        🏆 Top 10 Items
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <tbody>
                          {report.topItems.map((item, i) => (
                            <tr key={i} style={{ borderBottom: i < report.topItems.length - 1 ? '1px solid var(--border)' : 'none' }}>
                              <td style={{ padding: '7px 14px', width: 28 }}>
                                <span style={{ fontWeight: 800, color: i < 3 ? 'var(--accent)' : 'var(--muted)', fontSize: 12 }}>#{i + 1}</span>
                              </td>
                              <td style={{ padding: '7px 6px', fontWeight: 600 }}>{item.item_name}</td>
                              <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, width: 55 }}>{item.total_qty}</td>
                              <td style={{ padding: '7px 14px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700, width: 90 }}>{fmt(item.total_revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}
          </>
        )}

        {/* ── ORDERS ─────────────────────────────────────────────────────── */}
        {activeTab === 'orders' && (
          <>
            <DateFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} onApply={loadReport} loading={loading} />
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
                      <td className="tr" style={{ fontWeight: 700 }}>{fmt(o.grand_total)}</td>
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

        {/* ── HELD ORDERS ────────────────────────────────────────────────── */}
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
                    <td className="tr" style={{ fontWeight: 700 }}>{fmt(o.grand_total)}</td>
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

        {/* ── REPRINT ────────────────────────────────────────────────────── */}
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
                  <div style={{ marginTop: 4 }}>Total: {fmt(foundOrder.grand_total)}</div>
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => showOrderReceipt(foundOrder)}>
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
          receiptData={{ ...showReceipt, _type: 'customer' }}
          onClose={() => setShowReceipt(null)}
          onPrint={() => { window.api.printReceipt(`${showReceipt.orderNumber}\n---\n`); toast('Sent to printer') }}
          onPrintKitchen={() => {}}
        />
      )}
    </div>
  )
}
