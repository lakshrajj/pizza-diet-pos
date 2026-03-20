export default function VariantBuilder({ variants, onChange }) {
  const addRow = () => {
    onChange([...variants, { variant_name: '', variant_desc: '', price: '' }])
  }

  const update = (i, field, val) => {
    const next = variants.map((v, idx) => idx === i ? { ...v, [field]: val } : v)
    onChange(next)
  }

  const remove = (i) => {
    onChange(variants.filter((_, idx) => idx !== i))
  }

  return (
    <div>
      {variants.map((v, i) => (
        <div key={i} className="vb-row" style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
          <input
            className="form-input"
            placeholder="Variant name (e.g. Small)"
            value={v.variant_name}
            onChange={e => update(i, 'variant_name', e.target.value)}
          />
          <input
            className="form-input"
            placeholder='Description (e.g. 7")'
            value={v.variant_desc}
            onChange={e => update(i, 'variant_desc', e.target.value)}
          />
          <input
            className="form-input"
            type="number"
            placeholder="Price ₹"
            value={v.price}
            onChange={e => update(i, 'price', e.target.value)}
          />
          <button
            className="btn btn-danger btn-icon"
            onClick={() => remove(i)}
            title="Remove"
          >×</button>
        </div>
      ))}
      <div className="vb-add" onClick={addRow}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
        <span>Add Variant</span>
      </div>
    </div>
  )
}
