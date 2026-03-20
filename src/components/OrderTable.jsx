import { useRef, useState, useEffect } from 'react'
import { useOrderStore } from '../store/orderStore'
import { useMenuStore } from '../store/menuStore'

function pad(n, len = 2) {
  return String(n).padStart(len, '0')
}

export default function OrderTable({ onItemSelect }) {
  const { items, removeItem, changeQty, setDiscount } = useOrderStore()
  const { searchItems } = useMenuStore()
  const [query, setQuery] = useState('')
  const [ddOpen, setDdOpen] = useState(false)
  const [ddItems, setDdItems] = useState([])
  const [ddIdx, setDdIdx] = useState(-1)
  const inputRef = useRef(null)

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus()
  }, [])

  const handleSearch = (val) => {
    setQuery(val)
    setDdIdx(-1)
    if (!val.trim()) { setDdOpen(false); setDdItems([]); return }
    const results = searchItems(val)
    setDdItems(results)
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
            <th style={{ width: 30 }}></th>
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
                <td className="td-del">
                  <button className="dbtn" onClick={() => removeItem(item.rowKey)}>×</button>
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
            <td></td>
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
  )
}
