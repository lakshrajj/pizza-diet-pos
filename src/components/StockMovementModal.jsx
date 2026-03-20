import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useToast } from './Toast'

const MOVEMENT_TYPES = [
  { key: 'purchase', label: 'Purchase (Add Stock)' },
  { key: 'wastage', label: 'Wastage (Remove Stock)' },
  { key: 'manual_add', label: 'Manual Add' },
  { key: 'manual_remove', label: 'Manual Remove' },
  { key: 'opening', label: 'Opening Entry' },
]

export default function StockMovementModal({ item, onClose, onDone }) {
  const toast = useToast()
  const user = useAuthStore(s => s.user)
  const [data, setData] = useState({
    movement_type: 'purchase',
    quantity: '',
    reason: '',
    reference_id: '',
  })
  const [loading, setLoading] = useState(false)

  const set = (field, val) => setData(d => ({ ...d, [field]: val }))

  const handleSave = async () => {
    if (!data.quantity || parseFloat(data.quantity) <= 0) {
      toast('Enter a valid quantity')
      return
    }
    setLoading(true)
    const res = await window.api.adjustStock({
      inventory_item_id: item.id,
      movement_type: data.movement_type,
      quantity: parseFloat(data.quantity),
      reason: data.reason,
      reference_id: data.reference_id,
      staff_id: user?.id,
    })
    setLoading(false)

    if (res.success) {
      toast(`Stock updated! New stock: ${res.new_stock} ${item.base_unit}`)
      onDone()
    } else {
      toast('Error: ' + res.error)
    }
  }

  if (!item) return null

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <div className="modal-title">ADJUST STOCK</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--surface)', borderRadius: 8, fontSize: 13 }}>
            <span style={{ fontWeight: 700 }}>{item.name}</span>
            <span style={{ color: 'var(--muted)', marginLeft: 10 }}>
              Current: {item.current_stock} {item.base_unit}
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Movement Type *</label>
            <select className="form-input form-select" value={data.movement_type} onChange={e => set('movement_type', e.target.value)}>
              {MOVEMENT_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Quantity ({item.base_unit}) *</label>
            <input
              className="form-input"
              type="number"
              min={0}
              placeholder="Enter quantity"
              value={data.quantity}
              onChange={e => set('quantity', e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Reason</label>
            <input
              className="form-input"
              placeholder="e.g. Weekly purchase from supplier"
              value={data.reason}
              onChange={e => set('reason', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Reference # (Optional)</label>
            <input
              className="form-input"
              placeholder="Invoice / Bill number"
              value={data.reference_id}
              onChange={e => set('reference_id', e.target.value)}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving…' : 'Save Movement'}
          </button>
        </div>
      </div>
    </div>
  )
}
