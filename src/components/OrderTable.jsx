import { useRef, useState, useEffect } from 'react'
import { useOrderStore } from '../store/orderStore'
import { useMenuStore } from '../store/menuStore'
import { useAuthStore } from '../store/authStore'

function pad(n, len = 2) {
  return String(n).padStart(len, '0')
}

// ── Discount Popup ────────────────────────────────────────────────────────────
function DiscountPopup({ item, onApply, onClose }) {
  const [pct, setPct]   = useState(item.discountPct || '')
  const [qty, setQty]   = useState(item.discountQty || item.qty)

  const handleApply = () => {
    onApply(parseFloat(pct) || 0, parseInt(qty) || 0)
    onClose()
  }
  const handleClear = () => {
    onApply(0, 0)
    onClose()
  }

  return (
    <div
      style={{
        position: 'absolute', zIndex: 200, top: '100%', right: 0,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 14, minWidth: 210,
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Discount
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Discount %</div>
          <input
            autoFocus
            type="number" min={0} max={100}
            style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 14, textAlign: 'center', background: 'var(--surface2)', color: 'var(--text)' }}
            value={pct}
            onChange={e => setPct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
            onKeyDown={e => e.key === 'Enter' && handleApply()}
            placeholder="0"
          />
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>On how many?</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              onClick={() => setQty(q => Math.max(0, q - 1))}
              style={{ width: 26, height: 30, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer', fontSize: 16 }}
            >−</button>
            <span style={{ minWidth: 28, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>{qty}</span>
            <button
              type="button"
              onClick={() => setQty(q => Math.min(item.qty, q + 1))}
              style={{ width: 26, height: 30, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer', fontSize: 16 }}
            >+</button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>of {item.qty}</div>
        </div>
      </div>

      {pct > 0 && qty > 0 && (
        <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 10, textAlign: 'center', background: 'var(--surface2)', padding: '5px 8px', borderRadius: 6 }}>
          Save ₹{((item.unitPrice + (item.addons || []).reduce((s, a) => s + a.price, 0)) * qty * pct / 100).toFixed(0)}
          {' '}on {qty} item{qty > 1 ? 's' : ''}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button" onClick={handleClear}
          style={{ flex: 1, padding: '6px 0', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}
        >Clear</button>
        <button
          type="button" onClick={handleApply}
          style={{ flex: 2, padding: '6px 0', border: 'none', borderRadius: 6, background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
        >Apply</button>
      </div>
    </div>
  )
}

// ── Inline edit modal ─────────────────────────────────────────────────────────
function EditItemModal({ item, onSave, onClose }) {
  const user = useAuthStore(s => s.user)
  const [note, setNote]   = useState(item.specialNote || '')
  const [price, setPrice] = useState(item.unitPrice || 0)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <div className="modal-title" style={{ fontSize: 14 }}>
            EDIT: {item.name}{item.variantName ? ` · ${item.variantName}` : ''}
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Price — admin only */}
          {user?.role === 'admin' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Unit Price (₹)</label>
              <input
                className="form-input"
                type="number" min={0} step="0.01"
                value={price}
                onChange={e => setPrice(parseFloat(e.target.value) || 0)}
              />
            </div>
          )}
          {/* Special note */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Special Note / Instructions</label>
            <input
              className="form-input"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. No onions, extra spicy…"
              autoFocus
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => onSave({ specialNote: note, unitPrice: parseFloat(price) || 0 })}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function OrderTable({ onItemSelect, billableItems = [] }) {
  const { items, removeItem, changeQty, setDiscount, updateItem } = useOrderStore()
  const { searchItems } = useMenuStore()

  const [query, setQuery]       = useState('')
  const [ddOpen, setDdOpen]     = useState(false)
  const [ddItems, setDdItems]   = useState([])
  const [ddIdx, setDdIdx]       = useState(-1)
  const [editItem, setEditItem] = useState(null)
  const [discPopup, setDiscPopup] = useState(null)  // rowKey of open discount popup
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  // Close discount popup on outside click
  useEffect(() => {
    if (!discPopup) return
    const handler = () => setDiscPopup(null)
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [discPopup])

  const handleSearch = (val) => {
    setQuery(val)
    setDdIdx(-1)
    if (!val.trim()) { setDdOpen(false); setDdItems([]); return }

    const menuResults = searchItems(val)
    const q = val.toLowerCase()
    const invResults = billableItems
      .filter(i => i.name.toLowerCase().includes(q))
      .map(i => ({
        id: `inv_${i.id}`,
        name: i.name,
        has_variants: false,
        base_price: i.sale_price || 0,
        is_veg: 1,
        gst_percent: 0,
        category_name: '🧾 Inventory',
        _isInventory: true,
        _inventoryId: i.id,
      }))

    setDdItems([...menuResults, ...invResults])
    setDdOpen(true)
  }

  const pickItem = (item) => {
    setDdOpen(false)
    setQuery('')
    onItemSelect(item)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleKey = (e) => {
    if (!ddOpen) return
    if (e.key === 'ArrowDown') {
      setDdIdx(i => Math.min(i + 1, ddItems.length - 1))
      e.preventDefault()
    } else if (e.key === 'ArrowUp') {
      setDdIdx(i => Math.max(i - 1, 0))
      e.preventDefault()
    } else if (e.key === 'Enter') {
      if (ddIdx >= 0 && ddItems[ddIdx]) pickItem(ddItems[ddIdx])
      e.preventDefault()
    } else if (e.key === 'Escape') {
      setDdOpen(false)
    }
  }

  const highlight = (text, q) => {
    const idx = text.toLowerCase().indexOf(q.toLowerCase())
    if (idx < 0) return text
    return (
      <>
        {text.slice(0, idx)}
        <b style={{ color: 'var(--accent)' }}>{text.slice(idx, idx + q.length)}</b>
        {text.slice(idx + q.length)}
      </>
    )
  }

  return (
    <>
      <div className="otable-wrap">
        <table className="otable">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Item Name</th>
              <th style={{ width: 100 }}>QTY</th>
              <th style={{ width: 72 }}>Price</th>
              <th style={{ width: 68 }}>Disc</th>
              <th className="tr" style={{ width: 80 }}>Total</th>
              <th style={{ width: 50 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const addonSum = (item.addons || []).reduce((s, a) => s + (a.price || 0), 0)
              const effUnit  = item.unitPrice + addonSum
              const discAmt  = effUnit * (item.discountQty || 0) * (item.discountPct || 0) / 100
              const lineTotal = Math.round((effUnit * item.qty - discAmt) * 100) / 100
              const hasDisc  = (item.discountPct || 0) > 0 && (item.discountQty || 0) > 0

              return (
                <>
                  {/* Main item row */}
                  <tr key={item.rowKey}>
                    <td className="td-num">{pad(i + 1)}</td>
                    <td className="td-name">
                      <div className="td-name-main">
                        {item.isVeg ? <span className="veg-dot">🟢 </span> : null}
                        {item.name}
                        {item.variantName ? <span style={{ fontWeight: 500, color: 'var(--muted)', fontSize: 11 }}> · {item.variantName}</span> : null}
                      </div>
                      {item.specialNote && (
                        <div style={{ fontStyle: 'italic', fontSize: 10, color: 'var(--muted)' }}>
                          * {item.specialNote}
                        </div>
                      )}
                    </td>
                    <td className="td-qty">
                      <div className="qctrl">
                        <button className="qbtn" onClick={() => changeQty(item.rowKey, -1)}>−</button>
                        <span className="qval">{pad(item.qty)}</span>
                        <button className="qbtn" onClick={() => changeQty(item.rowKey, 1)}>+</button>
                      </div>
                    </td>
                    <td className="td-price">₹{item.unitPrice}</td>
                    <td className="td-disc" style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() => setDiscPopup(discPopup === item.rowKey ? null : item.rowKey)}
                        style={{
                          padding: '3px 7px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                          border: `1px solid ${hasDisc ? 'var(--accent)' : 'var(--border)'}`,
                          background: hasDisc ? 'var(--accent)' : 'transparent',
                          color: hasDisc ? '#fff' : 'var(--muted)',
                          cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >
                        {hasDisc ? `${item.discountPct}% ×${item.discountQty}` : 'Disc'}
                      </button>
                      {discPopup === item.rowKey && (
                        <DiscountPopup
                          item={item}
                          onApply={(pct, qty) => setDiscount(item.rowKey, pct, qty)}
                          onClose={() => setDiscPopup(null)}
                        />
                      )}
                    </td>
                    <td className="td-total">₹{lineTotal.toFixed(2)}</td>
                    <td style={{ padding: '2px 4px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button
                          className="qbtn"
                          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: 12, width: 22, height: 22 }}
                          title="Edit item"
                          onClick={() => setEditItem(item)}
                        >✏</button>
                        <button className="dbtn" onClick={() => removeItem(item.rowKey)}>×</button>
                      </div>
                    </td>
                  </tr>

                  {/* Add-on sub-rows */}
                  {(item.addons || []).map(a => (
                    <tr key={`${item.rowKey}_a_${a.id}`} style={{ background: 'var(--surface2)', opacity: 0.92 }}>
                      <td className="td-num" style={{ color: 'var(--muted)', fontSize: 10 }}>↳</td>
                      <td className="td-name" style={{ paddingLeft: 18 }}>
                        <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                          {a.emoji ? `${a.emoji} ` : '+ '}{a.name}
                        </span>
                      </td>
                      <td className="td-qty" style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center' }}>×{item.qty}</td>
                      <td className="td-price" style={{ fontSize: 12, color: 'var(--muted)' }}>₹{a.price}</td>
                      <td></td>
                      <td className="td-total" style={{ fontSize: 12, color: 'var(--muted)' }}>
                        ₹{(a.price * item.qty).toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  ))}

                  {/* Discount summary row */}
                  {hasDisc && (
                    <tr key={`${item.rowKey}_disc`} style={{ background: 'rgba(var(--accent-rgb, 255,107,0), 0.06)' }}>
                      <td></td>
                      <td colSpan={4} style={{ fontSize: 11, color: 'var(--accent)', paddingLeft: 18, fontStyle: 'italic' }}>
                        {item.discountPct}% off on {item.discountQty} of {item.qty} item{item.qty > 1 ? 's' : ''}
                      </td>
                      <td className="td-total" style={{ fontSize: 12, color: 'var(--accent)' }}>
                        −₹{discAmt.toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  )}
                </>
              )
            })}

            {/* Search / Input row */}
            <tr className="irow">
              <td className="td-num" style={{ color: 'var(--muted2)' }}>{pad(items.length + 1)}</td>
              <td colSpan={5} style={{ padding: 0 }}>
                <div className="srap">
                  <input
                    ref={inputRef}
                    className="srinp"
                    type="text"
                    placeholder="Type to add item…"
                    value={query}
                    onChange={e => handleSearch(e.target.value)}
                    onKeyDown={handleKey}
                    autoComplete="off"
                  />
                  {ddOpen && (
                    <div className="ddpop open">
                      {ddItems.length === 0 ? (
                        <div className="ddi" style={{ color: 'var(--muted)' }}>No results</div>
                      ) : ddItems.map((item, idx) => (
                        <div
                          key={item.id}
                          className={`ddi ${ddIdx === idx ? 'hi' : ''}`}
                          onMouseDown={() => pickItem(item)}
                        >
                          <div>
                            <div className="ddi-name">{highlight(item.name, query)}</div>
                            <div className="ddi-meta">
                              {item.category_name}
                              {item.has_variants ? ' · Multiple sizes' : ''}
                            </div>
                          </div>
                          <div className="ddi-price">
                            {item.has_variants ? 'from ' : ''}₹{item.has_variants && item.variants?.length ? item.variants[0].price : item.base_price}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </td>
              <td colSpan={2}></td>
            </tr>

            {/* Ghost empty rows */}
            {[items.length + 2, items.length + 3].map(k => (
              <tr key={k} className="erow">
                <td className="td-num">{pad(k)}</td>
                <td style={{ paddingLeft: 6 }}>--</td>
                <td>--</td>
                <td>--</td>
                <td></td>
                <td style={{ textAlign: 'right' }}>--</td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editItem && (
        <EditItemModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSave={(changes) => {
            updateItem(editItem.rowKey, changes)
            setEditItem(null)
          }}
        />
      )}
    </>
  )
}
