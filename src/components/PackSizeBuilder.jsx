export default function PackSizeBuilder({ packs, onChange }) {
  const addRow = () => {
    onChange([...packs, { pack_name: '', units_in_pack: '', purchase_price: '' }])
  }

  const update = (i, field, val) => {
    const next = packs.map((p, idx) => idx === i ? { ...p, [field]: val } : p)
    onChange(next)
  }

  const remove = (i) => {
    onChange(packs.filter((_, idx) => idx !== i))
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pack Name</div>
        <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Units in Pack</div>
        <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Purchase Price</div>
        <div />
      </div>
      {packs.map((p, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 8 }}>
          <input
            className="form-input"
            placeholder="e.g. 1kg Block"
            value={p.pack_name}
            onChange={e => update(i, 'pack_name', e.target.value)}
          />
          <input
            className="form-input"
            type="number"
            placeholder="Units in pack"
            value={p.units_in_pack}
            onChange={e => update(i, 'units_in_pack', e.target.value)}
          />
          <input
            className="form-input"
            type="number"
            placeholder="₹ Purchase price"
            value={p.purchase_price}
            onChange={e => update(i, 'purchase_price', e.target.value)}
          />
          <button className="btn btn-danger btn-icon" onClick={() => remove(i)}>×</button>
        </div>
      ))}
      <div className="vb-add" onClick={addRow}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
        <span>Add Pack Size</span>
      </div>
    </div>
  )
}
