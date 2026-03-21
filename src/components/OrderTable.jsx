import { useRef, useState, useEffect } from 'react'
import { useOrderStore } from '../store/orderStore'
import { useMenuStore } from '../store/menuStore'
import { useAuthStore } from '../store/authStore'

function pad(n, len = 2) {
  return String(n).padStart(len, '0')
}

// ── Inline edit modal ─────────────────────────────────────────────────────────
function EditItemModal({ item, onSave, onClose }) {
  const user = useAuthStore(s => s.user)
  const [note, setNote]   = useState(item.specialNote || '')
  const [price, setPrice] = useState(item.unitPrice || 0)
  const [disc, setDisc]   = useState(item.discountPct || 0)

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
          {/* Discount */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Discount (%)</label>
            <input
              className="form-input"
              type="number" min={0} max={100}
              value={disc}
              onChange={e => setDisc(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
            />
          </div>
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
            onClick={() => onSave({ specialNote: note, unitPrice: parseFloat(price) || 0, discountPct: parseFloat(disc) || 0 })}
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

  const [query, setQuery]     = useState('')
  const [ddOpen, setDdOpen]   = useState(false)
  const [ddItems, setDdItems] = useState([])
  const [ddIdx, setDdIdx]     = useState(-1)
  const [editItem, setEditItem] = useState(null)   // row being edited
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSearch = (val) => {
    setQuery(val)
    setDdIdx(-1)
    if (!val.trim()) { setDdOpen(false); setDdItems([]); return }

    // Search menu items
    const menuResults = searchItems(val)

    // Search billable inventory items
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
        category_name: '🧾 Billable Stock',
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
              <th style={{ width: 58 }}>Disc%</th>
              <th className="tr" style={{ width: 76 }}>Total</th>
              <th style={{ width: 50 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const lineTotal = Math.round(item.unitPrice * item.qty * (1 - (item.discountPct || 0) / 100) * 100) / 100
              return (
                <tr key={item.rowKey}>
                  <td className="td-num">{pad(i + 1)}</td>
                  <td className="td-name">
                    <div className="td-name-main">
                      {item.isVeg ? <span className="veg-dot">🟢 </span> : null}
                      {item.name}
                      {item.variantName ? <span style={{ fontWeight: 500, color: 'var(--muted)', fontSize: 11 }}> · {item.variantName}</span> : null}
                    </div>
                    <div className="td-name-sub">
                      {item.addons && item.addons.map(a => (
                        <span key={a.id || a.name} className="addon-tag">{a.name}</span>
                      ))}
                      {item.specialNote && (
                        <span style={{ fontStyle: 'italic', fontSize: 10, color: 'var(--muted)' }}>
                          * {item.specialNote}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="td-qty">
                    <div className="qctrl">
                      <button className="qbtn" onClick={() => changeQty(item.rowKey, -1)}>−</button>
                      <span className="qval">{pad(item.qty)}</span>
                      <button className="qbtn" onClick={() => changeQty(item.rowKey, 1)}>+</button>
                    </div>
                  </td>
                  <td className="td-price">₹{item.unitPrice}</td>
                  <td className="td-disc">
                    <input
                      className="dinp"
                      type="number"
                      value={item.discountPct || 0}
                      min={0} max={100}
                      onChange={e => setDiscount(item.rowKey, e.target.value)}
                    />
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
