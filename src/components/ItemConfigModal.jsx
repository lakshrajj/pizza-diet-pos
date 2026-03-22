import { useState, useEffect } from 'react'

export default function ItemConfigModal({ item, onAdd, onClose }) {
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [selectedAddons, setSelectedAddons] = useState(new Set())
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!item) return
    // Auto-select first variant
    if (item.variants && item.variants.length > 0) {
      setSelectedVariant(item.variants[0])
    } else {
      setSelectedVariant(null)
    }
    setSelectedAddons(new Set())
    setNote('')
  }, [item])

  if (!item) return null

  const hasVariants = item.has_variants && item.variants && item.variants.length > 0
  const addons = item.addons || []

  const getAddonPrice = (addon) => {
    if (addon.has_variant_pricing && selectedVariant && addon.variant_prices) {
      const vp = addon.variant_prices[selectedVariant.variant_name]
      if (vp !== undefined) return vp
    }
    return addon.base_price || 0
  }

  const calcTotal = () => {
    let base = hasVariants && selectedVariant ? selectedVariant.price : (item.base_price || 0)
    let addonSum = 0
    selectedAddons.forEach(id => {
      const a = addons.find(x => x.id === id)
      if (a) addonSum += getAddonPrice(a)
    })
    return base + addonSum
  }

  const toggleAddon = (id) => {
    setSelectedAddons(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAdd = () => {
    if (hasVariants && !selectedVariant) return

    // unitPrice = base/variant price only. Addons are separate line rows.
    const unitPrice = hasVariants && selectedVariant ? selectedVariant.price : (item.base_price || 0)
    const addonList = [...selectedAddons].map(id => {
      const a = addons.find(x => x.id === id)
      return { id, name: a?.name || '', emoji: a?.emoji || '', price: getAddonPrice(a) }
    })

    // Build unique row key: menuItemId + variantName + sorted addon IDs
    const variantKey = selectedVariant ? selectedVariant.variant_name : ''
    const addonKey = [...selectedAddons].sort().join('_')
    const rowKey = `${item.id}_${variantKey}_${addonKey}`

    onAdd({
      rowKey,
      menuItemId: item.id,
      name: item.name,
      variantName: selectedVariant?.variant_name || '',
      variantDesc: selectedVariant?.variant_desc || '',
      addons: addonList,
      specialNote: note,
      unitPrice,
      gstPct: item.gst_percent || 0,
      isVeg: item.is_veg,
    })
    onClose()
  }

  return (
    <div className="modal-bg open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cfg-modal">
        <div className="cfg-header">
          <div>
            <div className="cfg-name">{item.emoji || ''} {item.name.toUpperCase()}</div>
            <div className="cfg-cat">{item.category_name || ''}</div>
          </div>
          <button className="cfg-close" onClick={onClose}>×</button>
        </div>

        <div className="cfg-body">
          {/* VARIANTS / SIZES */}
          {hasVariants && (
            <div>
              <div className="cfg-sec-title">Choose Size / Variant</div>
              <div className="size-grid" style={{ gridTemplateColumns: `repeat(${Math.min(3, item.variants.length)}, 1fr)` }}>
                {item.variants.map(v => (
                  <div
                    key={v.id}
                    className={`size-card ${selectedVariant?.id === v.id ? 'sel' : ''}`}
                    onClick={() => setSelectedVariant(v)}
                  >
                    <div className="sz-label">{v.variant_name}</div>
                    {v.variant_desc && <div className="sz-dim">{v.variant_desc}</div>}
                    <div className="sz-price">₹{v.price}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ADD-ONS */}
          {addons.length > 0 && (
            <div>
              <div className="cfg-sec-title">
                Add-ons{' '}
                <span style={{ fontWeight: 400, color: 'var(--muted)', textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
                  (Optional)
                </span>
              </div>
              <div className="addon-grid">
                {addons.map(a => {
                  const price = getAddonPrice(a)
                  const sel = selectedAddons.has(a.id)
                  return (
                    <div
                      key={a.id}
                      className={`addon-card ${sel ? 'sel' : ''}`}
                      onClick={() => toggleAddon(a.id)}
                    >
                      <div className="addon-check">{sel ? '✓' : ''}</div>
                      <div className="addon-info">
                        <div className="addon-name">{a.emoji || ''} {a.name}</div>
                        <div className="addon-price">+₹{price}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* SPECIAL NOTE */}
          <div>
            <div className="cfg-sec-title">Special Instructions</div>
            <textarea
              className="cfg-note"
              placeholder="e.g. Less spicy, extra crispy base…"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
        </div>

        <div className="cfg-footer">
          <div className="cfg-total-wrap">
            <div className="cfg-total-lbl">Item Total</div>
            <div className="cfg-total-amt">₹{calcTotal()}</div>
          </div>
          <button
            className="btn-cfg-add"
            onClick={handleAdd}
            disabled={hasVariants && !selectedVariant}
          >
            ADD TO ORDER →
          </button>
        </div>
      </div>
    </div>
  )
}
