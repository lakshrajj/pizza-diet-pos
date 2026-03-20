import { useState, useEffect } from 'react'
import { useInventoryStore } from '../store/inventoryStore'
import { useToast } from '../components/Toast'
import StockMovementModal from '../components/StockMovementModal'
import PackSizeBuilder from '../components/PackSizeBuilder'

const UNITS = ['grams', 'ml', 'pcs', 'kg', 'litre', 'packets', 'boxes']
const STEPS = ['Basic Info', 'Pack Sizes', 'Opening Stock']

function InventoryForm({ item, categories, onSave, onClose }) {
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [data, setData] = useState({
    name: item?.name || '',
    category_id: item?.category_id || '',
    subcategory: item?.subcategory || '',
    base_unit: item?.base_unit || 'grams',
    low_stock_threshold: item?.low_stock_threshold || '',
    supplier_name: item?.supplier_name || '',
    notes: item?.notes || '',
    active: item?.active !== false,
    has_packs: false,
    pack_sizes: item?.pack_sizes || [],
    current_stock: item?.current_stock || '',
  })

  const set = (field, val) => setData(d => ({ ...d, [field]: val }))

  const handleSave = async () => {
    if (!data.name.trim()) { toast('Item name required'); return }
    if (!data.category_id) { toast('Category required'); return }
    if (!data.base_unit) { toast('Unit required'); return }

    const payload = {
      ...data,
      category_id: parseInt(data.category_id),
      low_stock_threshold: parseFloat(data.low_stock_threshold) || 0,
      current_stock: parseFloat(data.current_stock) || 0,
      pack_sizes: data.pack_sizes.map(p => ({
        pack_name: p.pack_name,
        units_in_pack: parseFloat(p.units_in_pack) || 0,
        purchase_price: parseFloat(p.purchase_price) || 0,
      })),
    }

    let res
    if (item?.id) {
      res = await window.api.updateInventoryItem(item.id, payload)
    } else {
      res = await window.api.addInventoryItem(payload)
    }

    if (res.success) { toast('Saved ✓'); onSave() }
    else toast('Error: ' + res.error)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-wide">
        <div className="modal-header">
          <div className="modal-title">{item ? 'EDIT INVENTORY ITEM' : 'ADD INVENTORY ITEM'}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ padding: '0 24px' }}>
          <div className="steps">
            {STEPS.map((s, i) => (
              <div key={i} className={`step ${step === i ? 'active' : i < step ? 'done' : ''}`} onClick={() => setStep(i)}>
                {i < step ? '✓ ' : ''}{s}
              </div>
            ))}
          </div>
        </div>
        <div className="modal-body">
          {step === 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Item Name *</label>
                <input className="form-input" value={data.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Mozzarella Cheese" />
              </div>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select className="form-input form-select" value={data.category_id} onChange={e => set('category_id', e.target.value)}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Base Unit *</label>
                <select className="form-input form-select" value={data.base_unit} onChange={e => set('base_unit', e.target.value)}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Low Stock Threshold ({data.base_unit})</label>
                <input className="form-input" type="number" min={0} value={data.low_stock_threshold} onChange={e => set('low_stock_threshold', e.target.value)} placeholder="e.g. 500" />
              </div>
              <div className="form-group">
                <label className="form-label">Supplier Name</label>
                <input className="form-input" value={data.supplier_name} onChange={e => set('supplier_name', e.target.value)} placeholder="e.g. ABC Wholesalers" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Notes</label>
                <input className="form-input" value={data.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes" />
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="toggle-wrap" style={{ marginBottom: 20 }}>
                <label className="toggle">
                  <input type="checkbox" checked={data.has_packs} onChange={e => set('has_packs', e.target.checked)} />
                  <span className="slider" />
                </label>
                <span style={{ fontSize: 13, fontWeight: 600 }}>This item is purchased in packs</span>
              </div>
              {data.has_packs ? (
                <PackSizeBuilder packs={data.pack_sizes} onChange={p => set('pack_sizes', p)} />
              ) : (
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                  Enable this if you buy the item in packs (e.g. cheese by the block, cups in a box).
                  Stock is always tracked in the base unit ({data.base_unit}).
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="form-group">
                <label className="form-label">Current Stock ({data.base_unit})</label>
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  value={data.current_stock}
                  onChange={e => set('current_stock', e.target.value)}
                  placeholder="0"
                  style={{ maxWidth: 200 }}
                  autoFocus
                />
              </div>
              <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
                This will be logged as an Opening Stock entry.
              </p>
            </div>
          )}
        </div>
        <div className="modal-footer">
          {step > 0 && <button className="btn btn-outline" onClick={() => setStep(s => s - 1)}>← Back</button>}
          {step < STEPS.length - 1 ? (
            <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}>Next →</button>
          ) : (
            <button className="btn btn-primary" onClick={handleSave}>{item ? 'Save Changes' : 'Add Item'}</button>
          )}
        </div>
      </div>
    </div>
  )
}

function MovementsModal({ item, onClose }) {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.getStockMovements(item.id).then(m => { setMovements(m); setLoading(false) })
  }, [item.id])

  const typeLabel = {
    purchase: '📦 Purchase', wastage: '🗑 Wastage', sale: '🧾 Sale',
    manual_add: '➕ Manual Add', manual_remove: '➖ Manual Remove',
    opening: '🏁 Opening', manual_set: '⚙ Set',
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-wide">
        <div className="modal-header">
          <div className="modal-title">{item.name} — MOVEMENTS</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {loading ? <div style={{ textAlign: 'center', color: 'var(--muted)' }}>Loading…</div> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Type</th>
                  <th>Qty ({item.base_unit})</th>
                  <th>Reason</th>
                  <th>Reference</th>
                  <th>Staff</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>No movements yet</td></tr>
                ) : movements.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontSize: 12 }}>{new Date(m.created_at).toLocaleString('en-IN')}</td>
                    <td>{typeLabel[m.movement_type] || m.movement_type}</td>
                    <td style={{ fontWeight: 700, color: m.movement_type === 'sale' || m.movement_type === 'wastage' || m.movement_type === 'manual_remove' ? 'var(--red)' : 'var(--green)' }}>
                      {m.movement_type === 'sale' || m.movement_type === 'wastage' || m.movement_type === 'manual_remove' ? '-' : '+'}{m.quantity}
                    </td>
                    <td>{m.reason || '—'}</td>
                    <td>{m.reference_id || '—'}</td>
                    <td>{m.staff_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default function Inventory() {
  const toast = useToast()
  const { items, categories, loadAll, reload, getStockStatus } = useInventoryStore()
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [adjustItem, setAdjustItem] = useState(null)
  const [movementsItem, setMovementsItem] = useState(null)
  const [filterCat, setFilterCat] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAll().then(() => setLoading(false))
  }, [])

  const deleteItem = async (id) => {
    if (!confirm('Delete this inventory item?')) return
    await window.api.deleteInventoryItem(id)
    toast('Deleted')
    reload()
  }

  const filtered = items.filter(i => {
    const matchCat = !filterCat || i.category_id === parseInt(filterCat)
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const stockColor = { green: 'stock-ok', yellow: 'stock-warn', red: 'stock-low' }
  const rowClass = { green: 'row-green', yellow: 'row-yellow', red: 'row-red' }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-title">📦 INVENTORY MANAGER</div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowForm(true) }}>
            + Add Item
          </button>
        </div>
      </div>

      <div className="admin-body">
        <div className="search-bar">
          <input
            className="search-input"
            placeholder="Search inventory…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="form-input form-select"
            style={{ width: 200 }}
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 12, fontSize: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, background: 'rgba(45,122,58,0.3)', borderRadius: 2, display: 'inline-block' }} />
            Good stock
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, background: 'rgba(196,125,16,0.3)', borderRadius: 2, display: 'inline-block' }} />
            Near threshold
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, background: 'rgba(192,57,43,0.3)', borderRadius: 2, display: 'inline-block' }} />
            Low stock
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>Loading…</div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>Current Stock</th>
                  <th>Threshold</th>
                  <th>Supplier</th>
                  <th className="tr">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
                      {items.length === 0 ? 'No inventory items. Click "+ Add Item" to start.' : 'No results.'}
                    </td>
                  </tr>
                ) : filtered.map(item => {
                  const status = getStockStatus(item)
                  return (
                    <tr key={item.id} className={rowClass[status]}>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td>{item.category_name || '—'}</td>
                      <td style={{ color: 'var(--muted)', fontSize: 12 }}>{item.base_unit}</td>
                      <td>
                        <span className={stockColor[status]}>
                          {item.current_stock} {item.base_unit}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {item.low_stock_threshold} {item.base_unit}
                      </td>
                      <td style={{ fontSize: 12 }}>{item.supplier_name || '—'}</td>
                      <td className="tr">
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn btn-primary btn-sm" onClick={() => setAdjustItem(item)}>Adjust</button>
                          <button className="btn btn-outline btn-sm" onClick={() => setMovementsItem(item)}>Log</button>
                          <button className="btn btn-outline btn-sm" onClick={() => { setEditItem(item); setShowForm(true) }}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteItem(item.id)}>Del</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <InventoryForm
          item={editItem}
          categories={categories}
          onSave={() => { setShowForm(false); setEditItem(null); reload() }}
          onClose={() => { setShowForm(false); setEditItem(null) }}
        />
      )}

      {adjustItem && (
        <StockMovementModal
          item={adjustItem}
          onClose={() => setAdjustItem(null)}
          onDone={() => { setAdjustItem(null); reload() }}
        />
      )}

      {movementsItem && (
        <MovementsModal
          item={movementsItem}
          onClose={() => setMovementsItem(null)}
        />
      )}
    </div>
  )
}
