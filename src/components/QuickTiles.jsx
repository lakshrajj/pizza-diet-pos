import { useState, useRef, useEffect } from 'react'
import { useMenuStore } from '../store/menuStore'

export default function QuickTiles({ onItemSelect, billableItems = [] }) {
  const { items, categories } = useMenuStore()
  const [activeCat, setActiveCat] = useState(null)
  const [featured, setFeatured] = useState([])  // IDs like "menu_15" / "inv_5"
  const tilesRef = useRef(null)

  // Load quick-add config on mount
  useEffect(() => {
    window.api.getQuickAddConfig().then(ids => setFeatured(ids || [])).catch(() => {})
  }, [])

  // Build featured items list
  const featuredItems = featured.flatMap(fid => {
    if (fid.startsWith('inv_')) {
      const invId = parseInt(fid.replace('inv_', ''))
      const inv = billableItems.find(b => b.id === invId)
      return inv ? [{
        id: fid,
        name: inv.name,
        has_variants: false,
        base_price: inv.sale_price || 0,
        is_veg: 1,
        gst_percent: 0,
        _isInventory: true,
        _inventoryId: inv.id,
        _featured: true,
      }] : []
    } else {
      const menuId = parseInt(fid.replace('menu_', ''))
      const m = items.find(i => i.id === menuId)
      return m ? [{ ...m, _featured: true }] : []
    }
  })

  const filteredItems = activeCat === 'featured'
    ? []
    : activeCat === 'billable'
      ? []
      : activeCat
        ? items.filter(i => i.category_id === activeCat)
        : items

  const showFeatured  = activeCat === 'featured'  || activeCat === null
  const showBillable  = activeCat === 'billable'  || activeCat === null

  const scroll = (dir) => {
    if (!tilesRef.current) return
    tilesRef.current.scrollLeft += dir * 300
  }

  const renderMenuTile = (item, keyPrefix = '') => {
    const basePrice = item.has_variants && item.variants?.length
      ? item.variants[0].price
      : item.base_price
    return (
      <div
        key={`${keyPrefix}menu-${item.id}`}
        className="tile"
        style={item._featured ? { borderColor: '#f59e0b', borderWidth: 2, borderStyle: 'solid' } : undefined}
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
  }

  const renderInvTile = (inv, keyPrefix = '') => (
    <div
      key={`${keyPrefix}inv-${inv._inventoryId || inv.id}`}
      className="tile"
      onClick={() => onItemSelect({
        id: `inv_${inv._inventoryId || inv.id}`,
        name: inv.name,
        has_variants: false,
        base_price: inv.sale_price || inv.base_price || 0,
        is_veg: 1,
        gst_percent: 0,
        _isInventory: true,
        _inventoryId: inv._inventoryId || inv.id,
      })}
      style={{ borderColor: inv._featured ? '#f59e0b' : 'var(--accent)', borderWidth: inv._featured ? 2 : 1, borderStyle: 'solid' }}
    >
      <div className="tile-icon">🧾</div>
      <div className="tile-name">{inv.name}</div>
      <div className="tile-price">₹{inv.sale_price || inv.base_price || 0}</div>
      <div className="tile-size" style={{ fontSize: 9, color: 'var(--accent)' }}>stock</div>
    </div>
  )

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
          {featuredItems.length > 0 && (
            <button
              className={`cpill ${activeCat === 'featured' ? 'active' : ''}`}
              onClick={() => setActiveCat('featured')}
            >
              ⭐ Featured
            </button>
          )}
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
            >
              🧾 Inventory
            </button>
          )}
        </div>
        <div className="tnav-wrap">
          <button className="tnav" onClick={() => scroll(-1)}>‹</button>
          <button className="tnav" onClick={() => scroll(1)}>›</button>
        </div>
      </div>
      <div className="tiles" ref={tilesRef}>

        {/* Featured items (shown in "Featured" tab or at top of "All") */}
        {showFeatured && featuredItems.map(item =>
          item._isInventory ? renderInvTile(item, 'feat-') : renderMenuTile(item, 'feat-')
        )}

        {/* Regular menu items (skip ones already shown as featured in "All" view) */}
        {filteredItems
          .filter(item => activeCat !== null || !featured.includes(`menu_${item.id}`))
          .map(item => renderMenuTile(item))
        }

        {/* Billable inventory items */}
        {showBillable && billableItems
          .filter(inv => activeCat !== null || !featured.includes(`inv_${inv.id}`))
          .map(inv => renderInvTile(inv))
        }

        {filteredItems.length === 0 && !showFeatured && !(showBillable && billableItems.length > 0) && (
          <div style={{ padding: '16px', color: 'var(--muted)', fontSize: 13 }}>
            No items in this category
          </div>
        )}
        {activeCat === 'featured' && featuredItems.length === 0 && (
          <div style={{ padding: '16px', color: 'var(--muted)', fontSize: 13 }}>
            No featured items yet. Pin items in Operations → Quick Add.
          </div>
        )}
      </div>
    </div>
  )
}
