import { useState, useRef } from 'react'
import { useMenuStore } from '../store/menuStore'

export default function QuickTiles({ onItemSelect, billableItems = [] }) {
  const { items, categories } = useMenuStore()
  const [activeCat, setActiveCat] = useState(null)
  const tilesRef = useRef(null)

  // 'billable' is a virtual category key
  const filteredItems = activeCat === 'billable'
    ? []
    : activeCat
      ? items.filter(i => i.category_id === activeCat)
      : items

  const showBillable = activeCat === 'billable' || activeCat === null

  const scroll = (dir) => {
    if (!tilesRef.current) return
    tilesRef.current.scrollLeft += dir * 300
  }

  return (
    <div className="qbar">
      <div className="qbar-head">
        <span className="qbar-lbl">Quick Add</span>
        <div className="cpills">
          <button
            className={`cpill ${!activeCat ? 'active' : ''}`}
            onClick={() => setActiveCat(null)}
          >
            All
          </button>
          {categories.filter(c => c.active).map(cat => (
            <button
              key={cat.id}
              className={`cpill ${activeCat === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCat(cat.id)}
            >
              {cat.emoji ? `${cat.emoji} ` : ''}{cat.name}
            </button>
          ))}
          {billableItems.length > 0 && (
            <button
              className={`cpill ${activeCat === 'billable' ? 'active' : ''}`}
              onClick={() => setActiveCat('billable')}
              style={{ background: activeCat === 'billable' ? 'var(--accent)' : undefined }}
            >
              🧾 Billable
            </button>
          )}
        </div>
        <div className="tnav-wrap">
          <button className="tnav" onClick={() => scroll(-1)}>‹</button>
          <button className="tnav" onClick={() => scroll(1)}>›</button>
        </div>
      </div>
      <div className="tiles" ref={tilesRef}>
        {/* Menu items */}
        {filteredItems.map(item => {
          const basePrice = item.has_variants && item.variants?.length
            ? item.variants[0].price
            : item.base_price
          return (
            <div
              key={`menu-${item.id}`}
              className="tile"
              onClick={() => onItemSelect(item)}
            >
              <div className="tile-icon">{item.emoji || '🍽️'}</div>
              <div className="tile-name">{item.name}</div>
              <div className="tile-price">₹{basePrice}</div>
              {item.has_variants && (
                <div className="tile-size">
                  {item.variants?.length ? item.variants.map(v => v.variant_name).join(' / ') : 'Variants'}
                </div>
              )}
            </div>
          )
        })}

        {/* Billable inventory items */}
        {showBillable && billableItems.map(inv => (
          <div
            key={`inv-${inv.id}`}
            className="tile"
            onClick={() => onItemSelect({
              id: `inv_${inv.id}`,
              name: inv.name,
              has_variants: false,
              base_price: inv.sale_price || 0,
              is_veg: 1,
              gst_percent: 0,
              _isInventory: true,
              _inventoryId: inv.id,
            })}
            style={{ borderColor: 'var(--accent)', borderWidth: 1, borderStyle: 'solid' }}
          >
            <div className="tile-icon">🧾</div>
            <div className="tile-name">{inv.name}</div>
            <div className="tile-price">₹{inv.sale_price || 0}</div>
            <div className="tile-size" style={{ fontSize: 9, color: 'var(--accent)' }}>stock</div>
          </div>
        ))}

        {filteredItems.length === 0 && !(showBillable && billableItems.length > 0) && (
          <div style={{ padding: '16px', color: 'var(--muted)', fontSize: 13 }}>
            No items in this category
          </div>
        )}
      </div>
    </div>
  )
}
