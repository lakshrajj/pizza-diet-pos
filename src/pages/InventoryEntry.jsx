import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../components/Toast'

const MOVE_TYPES = [
  { key: 'purchase',      label: 'Purchase',    color: 'var(--green)',  desc: 'Stock received' },
  { key: 'wastage',       label: 'Wastage',     color: 'var(--red)',    desc: 'Damaged/expired' },
  { key: 'manual_add',   label: 'Manual Add',  color: '#2e7d9e',       desc: 'Other additions' },
  { key: 'manual_remove',label: 'Manual Remove',color: '#b45309',      desc: 'Other deductions' },
]

export default function InventoryEntry() {
  const toast = useToast()
  const user = useAuthStore(s => s.user)

  const [allItems, setAllItems]   = useState([])
  const [entries, setEntries]     = useState([])   // { inventoryItemId, name, unit, currentStock, qty }
  const [moveType, setMoveType]   = useState('purchase')
  const [reference, setReference] = useState('')
  const [notes, setNotes]         = useState('')
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [clock, setClock]         = useState('')

  // Clock
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setClock(d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
    }
    tick()
    const id = setInterval(tick, 10000)
    return () => clearInterval(id)
  }, [])

  // Load items
  const load = async () => {
    setLoading(true)
    const items = await window.api.getInventoryForEntry()
    setAllItems(items)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  // Filtered tiles
  const filtered = allItems.filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.linked_item_name || '').toLowerCase().includes(search.toLowerCase())
  )

  // Add / increment item in entry list
  const handleTileClick = (item) => {
    const existing = entries.find(e => e.inventoryItemId === item.id)
    if (existing) {
      setEntries(entries.map(e =>
        e.inventoryItemId === item.id ? { ...e, qty: e.qty + 1 } : e
      ))
    } else {
      setEntries(prev => [...prev, {
        inventoryItemId: item.id,
        name: item.name,
        unit: item.base_unit,
        currentStock: item.current_stock,
        qty: 1,
      }])
    }
  }

  const updateQty = (id, val) => {
    const q = parseFloat(val)
    setEntries(entries.map(e => e.inventoryItemId === id ? { ...e, qty: isNaN(q) ? '' : q } : e))
  }

  const removeEntry = (id) => {
    setEntries(entries.filter(e => e.inventoryItemId !== id))
  }

  const handleSubmit = async () => {
    if (entries.length === 0) { toast('No items selected'); return }
    const invalid = entries.find(e => !e.qty || parseFloat(e.qty) <= 0)
    if (invalid) { toast(`Enter quantity for: ${invalid.name}`); return }

    setSubmitting(true)
    const payload = entries.map(e => ({
      inventory_item_id: e.inventoryItemId,
      movement_type: moveType,
      quantity: parseFloat(e.qty),
      reason: notes || MOVE_TYPES.find(m => m.key === moveType)?.desc || '',
      reference: reference,
    }))

    const res = await window.api.batchInventoryEntry(payload, user?.id)
    setSubmitting(false)

    if (res.success) {
      toast(`${entries.length} item(s) recorded ✓`)
      setEntries([])
      setReference('')
      setNotes('')
      await load()   // refresh stock figures
    } else {
      toast('Error: ' + res.error)
    }
  }

  const handleClear = () => {
    setEntries([])
    setReference('')
    setNotes('')
  }

  const selectedType = MOVE_TYPES.find(m => m.key === moveType)
  const totalItems = entries.reduce((s, e) => s + (parseFloat(e.qty) || 0), 0)

  return (
    <>
      {/* ── LEFT PANEL ── */}
      <div className="bleft">
        {/* Header */}
        <div className="chk-header">
          <div>
            <div className="chk-title">STOCK ENTRY</div>
            <div className="chk-sub">Quick inventory recording · {clock}</div>
          </div>
          <div className="chk-badge">
            <div className="chk-badge-lbl">Items</div>
            <div className="chk-badge-num">{String(entries.length).padStart(2, '0')}</div>
          </div>
        </div>

        {/* Movement type selector */}
        <div className="otype-bar">
          {MOVE_TYPES.map(t => (
            <button
              key={t.key}
              className={`otype ${moveType === t.key ? 'active' : ''}`}
              onClick={() => setMoveType(t.key)}
              style={moveType === t.key ? { background: t.color, borderColor: t.color } : {}}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
          <input
            className="search-input"
            style={{ width: '100%', boxSizing: 'border-box' }}
            placeholder="Search inventory items…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* Item tiles */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          {loading ? (
            <div style={{ color: 'var(--muted)', textAlign: 'center', paddingTop: 40 }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ color: 'var(--muted)', textAlign: 'center', paddingTop: 40 }}>
              {allItems.length === 0 ? 'No inventory items. Add items in Inventory Manager first.' : 'No results for "' + search + '"'}
            </div>
          ) : (
            <div className="tiles">
              {filtered.map(item => {
                const inEntry = entries.find(e => e.inventoryItemId === item.id)
                return (
                  <div
                    key={item.id}
                    className={`tile ${inEntry ? 'tile-active' : ''}`}
                    onClick={() => handleTileClick(item)}
                    style={inEntry ? { outline: '2px solid var(--accent)', outlineOffset: -2 } : {}}
                  >
                    <div className="tile-name" style={{ fontSize: 12 }}>{item.name}</div>
                    {item.linked_item_name && (
                      <div style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 600, marginTop: 1 }}>
                        🍕 {item.linked_item_name}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                      Stock: {item.current_stock} {item.base_unit}
                    </div>
                    {inEntry && (
                      <div style={{
                        position: 'absolute', top: 4, right: 4,
                        background: 'var(--accent)', color: '#fff',
                        borderRadius: '50%', width: 18, height: 18,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700,
                      }}>
                        {inEntry.qty}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="bright">
        {/* Entry list */}
        <div className="rsec" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Entry Items</span>
            <span style={{ fontSize: 11, color: selectedType?.color, fontWeight: 700 }}>
              {selectedType?.label} · {totalItems} units
            </span>
          </h4>

          {entries.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>
              Click items on the left to add them here
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {entries.map(e => (
                <div key={e.inventoryItemId} style={{
                  display: 'grid', gridTemplateColumns: '1fr 90px 28px',
                  gap: 6, alignItems: 'center',
                  padding: '6px 8px', background: 'var(--surface)',
                  borderRadius: 6, border: '1px solid var(--border)',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{e.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                      Current: {e.currentStock} {e.unit}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="number"
                      min={0.01}
                      step="any"
                      className="form-input"
                      style={{ width: '100%', padding: '4px 6px', textAlign: 'center', fontSize: 13 }}
                      value={e.qty}
                      onChange={ev => updateQty(e.inventoryItemId, ev.target.value)}
                    />
                    <span style={{ fontSize: 9, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{e.unit}</span>
                  </div>
                  <button
                    onClick={() => removeEntry(e.inventoryItemId)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--red)', fontSize: 16, lineHeight: 1, padding: 2,
                    }}
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reference + Notes */}
        <div className="rsec" style={{ borderTop: '1px solid var(--border)' }}>
          <h4>Entry Details</h4>
          <div className="cfield">
            <label>Reference #</label>
            <input
              type="text"
              placeholder="e.g. INV-001, Supplier Bill#"
              value={reference}
              onChange={e => setReference(e.target.value)}
            />
          </div>
          <div className="cfield">
            <label>Notes</label>
            <input
              type="text"
              placeholder="Reason / remarks"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="ract">
          <button
            className="btn-billed"
            onClick={handleSubmit}
            disabled={entries.length === 0 || submitting}
            style={{ background: selectedType?.color }}
          >
            <span>{submitting ? 'Saving…' : 'SUBMIT ENTRY'}</span>
            <span>›</span>
          </button>
          <div className="sacts">
            <button className="sbtn" onClick={handleClear} disabled={entries.length === 0}>
              ✕ Clear
            </button>
            <button className="sbtn" onClick={load}>↺ Refresh Stock</button>
          </div>
        </div>
      </div>
    </>
  )
}
