import { useState, useEffect } from 'react'
import { useToast } from '../components/Toast'
import VariantBuilder from '../components/VariantBuilder'

const GST_OPTIONS = [0, 5, 12, 18]
const STEPS = ['Basic Info', 'Variants', 'Add-ons', 'Ingredients']

// ── Helpers: convert between flat ingredients[] and per-variant map ─────────
function ingredientsToVariantMap(ingredients, variants) {
  // Returns { "Small": [{inventory_item_id, stock_item_name, base_unit, quantity}], ... }
  const map = {}
  variants.forEach(v => { map[v.variant_name] = [] })
  ingredients.forEach(ing => {
    if (!ing.variant_quantities || ing.variant_quantities.length === 0) {
      // base_quantity applies to all variants
      if (ing.base_quantity > 0) {
        variants.forEach(v => {
          map[v.variant_name].push({
            inventory_item_id: ing.inventory_item_id,
            stock_item_name: ing.stock_item_name,
            base_unit: ing.base_unit || '',
            quantity: ing.base_quantity,
          })
        })
      }
    } else {
      ing.variant_quantities.forEach(vq => {
        if (vq.quantity > 0 && map[vq.variant_name]) {
          map[vq.variant_name].push({
            inventory_item_id: ing.inventory_item_id,
            stock_item_name: ing.stock_item_name,
            base_unit: ing.base_unit || '',
            quantity: vq.quantity,
          })
        }
      })
    }
  })
  return map
}

function variantMapToIngredients(variantMap, variants) {
  // Collect all unique stock items used across any variant
  const stockMap = new Map()
  variants.forEach(v => {
    ;(variantMap[v.variant_name] || []).forEach(item => {
      if (!stockMap.has(item.inventory_item_id)) {
        stockMap.set(item.inventory_item_id, {
          inventory_item_id: item.inventory_item_id,
          stock_item_name: item.stock_item_name,
          base_unit: item.base_unit,
          base_quantity: 0,
          variant_quantities: [],
        })
      }
    })
  })
  // Fill variant_quantities for each stock item
  variants.forEach(v => {
    stockMap.forEach((ing, stockId) => {
      const match = (variantMap[v.variant_name] || []).find(i => i.inventory_item_id === stockId)
      ing.variant_quantities.push({
        variant_name: v.variant_name,
        quantity: match ? match.quantity : 0,
      })
    })
  })
  return Array.from(stockMap.values())
}

// ── Stock Item Picker (shared) ───────────────────────────────────────────────
function StockPicker({ stockItems, exclude, onPick, onClose }) {
  const [search, setSearch] = useState('')
  const options = stockItems.filter(s =>
    !exclude.includes(s.id) &&
    s.name.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div style={{ marginTop: 8 }}>
      <input
        autoFocus
        className="form-input"
        placeholder="Search stock items…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        onKeyDown={e => e.key === 'Escape' && onClose()}
      />
      <div style={{
        border: '1px solid var(--border)', borderRadius: 8, marginTop: 4,
        maxHeight: 180, overflowY: 'auto', background: 'var(--surface)',
      }}>
        {options.length === 0 ? (
          <div style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: 13 }}>
            {stockItems.length === 0 ? 'No stock items yet — add in Stock Manager first.' : 'No more items to add.'}
          </div>
        ) : options.map(s => (
          <div
            key={s.id}
            onClick={() => onPick(s)}
            style={{
              padding: '9px 14px', cursor: 'pointer', fontSize: 13,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '1px solid var(--border)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
            onMouseLeave={e => e.currentTarget.style.background = ''}
          >
            <span style={{ fontWeight: 600 }}>{s.name}</span>
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>{s.base_unit || 'units'}</span>
          </div>
        ))}
      </div>
      <button className="btn btn-outline btn-sm" style={{ marginTop: 6 }} onClick={onClose}>Cancel</button>
    </div>
  )
}

// ── Ingredient Builder ─────────────────────────────────────────────────────
function IngredientBuilder({ ingredients, variants, hasVariants, stockItems, onChange }) {
  const [showPicker, setShowPicker] = useState(false)
  // For variant mode: which variant tab is active
  const [activeVariant, setActiveVariant] = useState(variants[0]?.variant_name || '')
  const [showVariantPicker, setShowVariantPicker] = useState(false)

  // ── NON-VARIANT MODE ─────────────────────────────────────────────────────
  if (!hasVariants) {
    const addIngredient = (s) => {
      onChange([...ingredients, {
        inventory_item_id: s.id,
        stock_item_name: s.name,
        base_unit: s.base_unit || '',
        base_quantity: 1,
        variant_quantities: [],
      }])
      setShowPicker(false)
    }
    const remove = (idx) => onChange(ingredients.filter((_, i) => i !== idx))
    const updateQty = (idx, val) => {
      const next = [...ingredients]
      next[idx] = { ...next[idx], base_quantity: parseFloat(val) || 0 }
      onChange(next)
    }
    const excludeIds = ingredients.map(i => i.inventory_item_id)

    return (
      <div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
          Add stock items used to make this dish. Quantity will auto-deduct on every sale.
        </p>
        {ingredients.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 110px 36px', gap: 8,
              padding: '5px 8px', background: 'var(--surface2)', borderRadius: 6,
              fontSize: 11, fontWeight: 700, color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
            }}>
              <div>Stock Item</div>
              <div style={{ textAlign: 'center' }}>Qty used</div>
              <div />
            </div>
            {ingredients.map((ing, idx) => (
              <div key={ing.inventory_item_id} style={{
                display: 'grid', gridTemplateColumns: '1fr 110px 36px',
                gap: 8, alignItems: 'center', padding: '6px 8px',
                borderBottom: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {ing.stock_item_name}
                  {ing.base_unit && <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>({ing.base_unit})</span>}
                </div>
                <input type="number" min="0" step="0.1"
                  style={{ width: '100%', padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, textAlign: 'center', background: 'var(--surface)', color: 'var(--text)' }}
                  value={ing.base_quantity}
                  onChange={e => updateQty(idx, e.target.value)}
                />
                <button type="button" onClick={() => remove(idx)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 18, lineHeight: 1, padding: 4 }}>×</button>
              </div>
            ))}
          </div>
        )}
        {showPicker
          ? <StockPicker stockItems={stockItems} exclude={excludeIds} onPick={addIngredient} onClose={() => setShowPicker(false)} />
          : <button className="btn btn-outline btn-sm" onClick={() => setShowPicker(true)}>+ Add Stock Item</button>
        }
      </div>
    )
  }

  // ── VARIANT MODE ─────────────────────────────────────────────────────────
  // Convert flat ingredients[] to per-variant map for editing
  const variantMap = ingredientsToVariantMap(ingredients, variants)

  const updateVariantMap = (newMap) => {
    onChange(variantMapToIngredients(newMap, variants))
  }

  const currentItems = variantMap[activeVariant] || []
  const excludeIds = currentItems.map(i => i.inventory_item_id)

  const addToVariant = (s) => {
    const newMap = { ...variantMap }
    newMap[activeVariant] = [
      ...(newMap[activeVariant] || []),
      { inventory_item_id: s.id, stock_item_name: s.name, base_unit: s.base_unit || '', quantity: 1 },
    ]
    updateVariantMap(newMap)
    setShowVariantPicker(false)
  }

  const removeFromVariant = (stockId) => {
    const newMap = { ...variantMap }
    newMap[activeVariant] = (newMap[activeVariant] || []).filter(i => i.inventory_item_id !== stockId)
    updateVariantMap(newMap)
  }

  const updateVariantItemQty = (stockId, val) => {
    const newMap = { ...variantMap }
    newMap[activeVariant] = (newMap[activeVariant] || []).map(i =>
      i.inventory_item_id === stockId ? { ...i, quantity: parseFloat(val) || 0 } : i
    )
    updateVariantMap(newMap)
  }

  // Count configured variants for summary badge
  const configuredCount = variants.filter(v => (variantMap[v.variant_name] || []).length > 0).length

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
        Each size has its own recipe. Select a size tab and add the stock items for that size.
        {configuredCount > 0 && (
          <span style={{ marginLeft: 8, color: 'var(--accent)', fontWeight: 600 }}>
            {configuredCount}/{variants.length} sizes configured
          </span>
        )}
      </p>

      {/* Variant tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {variants.map(v => {
          const hasItems = (variantMap[v.variant_name] || []).length > 0
          const isActive = activeVariant === v.variant_name
          return (
            <button
              key={v.variant_name}
              type="button"
              onClick={() => { setActiveVariant(v.variant_name); setShowVariantPicker(false) }}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
                border: `2px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                background: isActive ? 'var(--accent)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {v.variant_name}
              {hasItems && <span style={{ fontSize: 11, opacity: 0.85 }}>✓</span>}
            </button>
          )
        })}
      </div>

      {/* Current variant items */}
      <div style={{
        border: '1px solid var(--border)', borderRadius: 8,
        padding: 12, background: 'var(--surface2)', marginBottom: 10,
        minHeight: 60,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          {activeVariant} Recipe
        </div>

        {currentItems.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 13, paddingBottom: 4 }}>
            No stock items for {activeVariant} yet.
          </div>
        ) : currentItems.map(item => (
          <div key={item.inventory_item_id} style={{
            display: 'grid', gridTemplateColumns: '1fr 100px 32px',
            gap: 8, alignItems: 'center', marginBottom: 6,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {item.stock_item_name}
              {item.base_unit && <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>({item.base_unit})</span>}
            </div>
            <input type="number" min="0" step="0.1"
              style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, textAlign: 'center', background: 'var(--surface)', color: 'var(--text)' }}
              value={item.quantity}
              onChange={e => updateVariantItemQty(item.inventory_item_id, e.target.value)}
            />
            <button type="button" onClick={() => removeFromVariant(item.inventory_item_id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 18, lineHeight: 1, padding: 2 }}>×</button>
          </div>
        ))}

        {showVariantPicker ? (
          <StockPicker
            stockItems={stockItems}
            exclude={excludeIds}
            onPick={addToVariant}
            onClose={() => setShowVariantPicker(false)}
          />
        ) : (
          <button className="btn btn-outline btn-sm" style={{ marginTop: 4 }} onClick={() => setShowVariantPicker(true)}>
            + Add to {activeVariant}
          </button>
        )}
      </div>
    </div>
  )
}

function ItemForm({ item, categories, subcategories, addons, inventoryItems, onSave, onClose }) {
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [data, setData] = useState({
    name: item?.name || '',
    category_id: item?.category_id || '',
    subcategory_id: item?.subcategory_id || '',
    emoji: item?.emoji || '',
    is_veg: item?.is_veg !== undefined ? !!item.is_veg : true,
    gst_percent: item?.gst_percent ?? 0,
    show_in_menu: item?.show_in_menu !== undefined ? !!item.show_in_menu : true,
    active: item?.active !== undefined ? !!item.active : true,
    has_variants: !!item?.has_variants,
    base_price: item?.base_price || '',
    variants: item?.variants || [],
    selected_addons: [],
    ingredients: item?.ingredients?.map(ing => ({
      inventory_item_id: ing.inventory_item_id,
      stock_item_name: ing.stock_item_name,
      base_unit: ing.base_unit || '',
      base_quantity: ing.base_quantity,
      variant_quantities: ing.variant_quantities || [],
    })) || [],
  })

  const filteredSubs = subcategories.filter(s => s.category_id === parseInt(data.category_id))
  const categoryAddons = addons.filter(a =>
    a.category_ids?.includes(parseInt(data.category_id)) && a.active
  )

  const set = (field, val) => setData(d => ({ ...d, [field]: val }))

  const validate = () => {
    if (!data.name.trim()) { toast('Item name is required'); return false }
    if (!data.category_id) { toast('Category is required'); return false }
    if (data.has_variants && data.variants.length === 0) { toast('Add at least one variant'); return false }
    if (data.has_variants) {
      for (const v of data.variants) {
        if (!v.variant_name.trim() || !v.price) { toast('Fill all variant fields'); return false }
      }
    }
    if (!data.has_variants && !data.base_price) { toast('Price is required'); return false }
    return true
  }

  const handleSave = async () => {
    if (!validate()) return
    const payload = {
      ...data,
      category_id: parseInt(data.category_id),
      subcategory_id: data.subcategory_id ? parseInt(data.subcategory_id) : null,
      base_price: parseFloat(data.base_price) || 0,
      gst_percent: parseFloat(data.gst_percent) || 0,
      variants: data.variants.map(v => ({
        variant_name: v.variant_name,
        variant_desc: v.variant_desc || '',
        price: parseFloat(v.price) || 0,
      })),
    }

    let res
    if (item?.id) {
      res = await window.api.updateMenuItem(item.id, payload)
    } else {
      res = await window.api.addMenuItem(payload)
    }

    if (res.success) {
      toast(item?.id ? 'Item updated ✓' : 'Item added ✓')
      onSave()
    } else {
      toast('Error: ' + res.error)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box modal-wide">
        <div className="modal-header">
          <div className="modal-title">{item ? 'EDIT ITEM' : 'ADD NEW ITEM'}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{ padding: '0 24px' }}>
          <div className="steps">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className={`step ${step === i ? 'active' : i < step ? 'done' : ''}`}
                onClick={() => setStep(i)}
              >
                {i < step ? '✓ ' : ''}{s}
              </div>
            ))}
          </div>
        </div>

        <div className="modal-body">
          {/* STEP 1 — Basic Info */}
          {step === 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Item Name *</label>
                <input className="form-input" value={data.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Margherita Pizza" />
              </div>

              <div className="form-group">
                <label className="form-label">Category *</label>
                <select className="form-input form-select" value={data.category_id} onChange={e => set('category_id', e.target.value)}>
                  <option value="">Select category</option>
                  {categories.filter(c => c.active).map(c => (
                    <option key={c.id} value={c.id}>{c.emoji ? `${c.emoji} ` : ''}{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Sub-category</label>
                <select className="form-input form-select" value={data.subcategory_id} onChange={e => set('subcategory_id', e.target.value)}>
                  <option value="">None</option>
                  {filteredSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Emoji / Icon</label>
                <input className="form-input" value={data.emoji} onChange={e => set('emoji', e.target.value)} placeholder="🍕" maxLength={4} />
              </div>

              <div className="form-group">
                <label className="form-label">GST %</label>
                <select className="form-input form-select" value={data.gst_percent} onChange={e => set('gst_percent', e.target.value)}>
                  {GST_OPTIONS.map(g => <option key={g} value={g}>{g}%</option>)}
                </select>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div className="toggle-wrap">
                  <label className="toggle">
                    <input type="checkbox" checked={data.is_veg} onChange={e => set('is_veg', e.target.checked)} />
                    <span className="slider" />
                  </label>
                  <span style={{ fontSize: 13 }}>🟢 Vegetarian</span>
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div className="toggle-wrap">
                  <label className="toggle">
                    <input type="checkbox" checked={data.show_in_menu} onChange={e => set('show_in_menu', e.target.checked)} />
                    <span className="slider" />
                  </label>
                  <span style={{ fontSize: 13 }}>Show in Menu</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Variants */}
          {step === 1 && (
            <div>
              <div className="toggle-wrap" style={{ marginBottom: 20 }}>
                <label className="toggle">
                  <input type="checkbox" checked={data.has_variants} onChange={e => set('has_variants', e.target.checked)} />
                  <span className="slider" />
                </label>
                <span style={{ fontSize: 13, fontWeight: 600 }}>This item has multiple sizes / variants</span>
              </div>

              {data.has_variants ? (
                <VariantBuilder
                  variants={data.variants}
                  onChange={v => set('variants', v)}
                />
              ) : (
                <div className="form-group">
                  <label className="form-label">Price *</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="₹0.00"
                    value={data.base_price}
                    onChange={e => set('base_price', e.target.value)}
                    style={{ maxWidth: 200 }}
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 3 — Add-ons */}
          {step === 2 && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                Add-ons are linked to categories. Select the category above, then add-ons for that category will show here automatically.
              </p>
              {categoryAddons.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: 13, padding: '20px 0' }}>
                  No add-ons configured for this category yet. Go to Add-on Manager to create them.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {categoryAddons.map(a => (
                    <div
                      key={a.id}
                      className={`addon-card ${data.selected_addons.includes(a.id) ? 'sel' : ''}`}
                      onClick={() => {
                        const next = data.selected_addons.includes(a.id)
                          ? data.selected_addons.filter(id => id !== a.id)
                          : [...data.selected_addons, a.id]
                        set('selected_addons', next)
                      }}
                    >
                      <div className="addon-check">{data.selected_addons.includes(a.id) ? '✓' : ''}</div>
                      <div className="addon-info">
                        <div className="addon-name">{a.emoji || ''} {a.name}</div>
                        <div className="addon-price">₹{a.base_price}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 4 — Ingredients / Recipe */}
          {step === 3 && (
            <IngredientBuilder
              ingredients={data.ingredients}
              variants={data.variants}
              hasVariants={data.has_variants}
              stockItems={inventoryItems}
              onChange={ings => set('ingredients', ings)}
            />
          )}
        </div>

        <div className="modal-footer">
          {step > 0 && (
            <button className="btn btn-outline" onClick={() => setStep(s => s - 1)}>← Back</button>
          )}
          {step < STEPS.length - 1 ? (
            <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}>Next →</button>
          ) : (
            <button className="btn btn-primary" onClick={handleSave}>
              {item ? 'Save Changes' : 'Add Item'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MenuManager() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [addons, setAddons] = useState([])
  const [inventoryItems, setInventoryItems] = useState([])
  const [activeTab, setActiveTab] = useState('items')   // items | addons
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [showAddonForm, setShowAddonForm] = useState(false)
  const [editAddon, setEditAddon] = useState(null)
  const [filterCat, setFilterCat] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    const [it, cats, subs, ads, inv] = await Promise.all([
      window.api.getMenuItems(),
      window.api.getCategories(),
      window.api.getSubcategories(),
      window.api.getAddons(),
      window.api.getInventory(),
    ])
    setItems(it)
    setCategories(cats)
    setSubcategories(subs)
    setAddons(ads)
    setInventoryItems(inv)
    setLoading(false)
  }

  const deleteItem = async (id) => {
    if (!confirm('Delete this item?')) return
    await window.api.deleteMenuItem(id)
    toast('Item deleted')
    loadAll()
  }

  const toggleActive = async (id, current) => {
    await window.api.toggleMenuItemActive(id, !current)
    loadAll()
  }

  const deleteAddon = async (id) => {
    if (!confirm('Delete this add-on?')) return
    await window.api.deleteAddon(id)
    toast('Add-on deleted')
    loadAll()
  }

  const filteredItems = items.filter(i => {
    const matchCat = !filterCat || i.category_id === parseInt(filterCat)
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-title">🍕 MENU MANAGER</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          {activeTab === 'items' && (
            <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowForm(true) }}>
              + Add Item
            </button>
          )}
          {activeTab === 'addons' && (
            <button className="btn btn-primary" onClick={() => { setEditAddon(null); setShowAddonForm(true) }}>
              + Add Add-on
            </button>
          )}
        </div>
      </div>

      <div className="admin-body">
        <div className="tab-bar">
          <div className={`tab ${activeTab === 'items' ? 'active' : ''}`} onClick={() => setActiveTab('items')}>Menu Items</div>
          <div className={`tab ${activeTab === 'addons' ? 'active' : ''}`} onClick={() => setActiveTab('addons')}>Add-on Manager</div>
        </div>

        {activeTab === 'items' && (
          <>
            <div className="search-bar">
              <input
                className="search-input"
                placeholder="Search items…"
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

            {loading ? (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>Loading…</div>
            ) : (
              <div className="card" style={{ padding: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Icon</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Variants</th>
                      <th>Price</th>
                      <th>GST%</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th className="tr">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
                          {items.length === 0 ? 'No items yet. Click "+ Add Item" to get started.' : 'No results'}
                        </td>
                      </tr>
                    ) : filteredItems.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontSize: 20 }}>{item.emoji || '🍽️'}</td>
                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                        <td>{item.category_name || '—'}</td>
                        <td>
                          {item.has_variants
                            ? <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>
                                {item.variants?.length || 0} sizes
                              </span>
                            : '—'}
                        </td>
                        <td>
                          {item.has_variants && item.variants?.length
                            ? `₹${item.variants[0].price}+`
                            : `₹${item.base_price}`}
                        </td>
                        <td>{item.gst_percent}%</td>
                        <td>
                          <span className={`tag ${item.is_veg ? 'tag-veg' : 'tag-nveg'}`}>
                            {item.is_veg ? '🟢 Veg' : '🔴 Non-Veg'}
                          </span>
                        </td>
                        <td>
                          <span className={`tag ${item.active ? 'tag-active' : 'tag-inactive'}`}>
                            {item.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="tr">
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button className="btn btn-outline btn-sm" onClick={() => { setEditItem(item); setShowForm(true) }}>Edit</button>
                            <button className="btn btn-outline btn-sm" onClick={() => toggleActive(item.id, item.active)}>
                              {item.active ? 'Disable' : 'Enable'}
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => deleteItem(item.id)}>Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'addons' && (
          <AddonTab
            addons={addons}
            categories={categories}
            onRefresh={loadAll}
            showForm={showAddonForm}
            editAddon={editAddon}
            onShowForm={() => setShowAddonForm(true)}
            onCloseForm={() => { setShowAddonForm(false); setEditAddon(null) }}
            onEditAddon={(a) => { setEditAddon(a); setShowAddonForm(true) }}
            onDeleteAddon={deleteAddon}
            toast={toast}
          />
        )}
      </div>

      {showForm && (
        <ItemForm
          item={editItem}
          categories={categories}
          subcategories={subcategories}
          addons={addons}
          inventoryItems={inventoryItems}
          onSave={() => { setShowForm(false); setEditItem(null); loadAll() }}
          onClose={() => { setShowForm(false); setEditItem(null) }}
        />
      )}
    </div>
  )
}

// ── Addon tab ──────────────────────────────────────────────────────────────
function AddonTab({ addons, categories, onRefresh, showForm, editAddon, onCloseForm, onEditAddon, onDeleteAddon, toast }) {
  const [data, setData] = useState({ name: '', emoji: '', base_price: '', has_variant_pricing: false, variant_prices: [], category_ids: [], active: true })

  useEffect(() => {
    if (editAddon) {
      setData({
        name: editAddon.name || '',
        emoji: editAddon.emoji || '',
        base_price: editAddon.base_price || '',
        has_variant_pricing: !!editAddon.has_variant_pricing,
        variant_prices: editAddon.variant_prices || [],
        category_ids: editAddon.category_ids || [],
        active: editAddon.active !== false,
      })
    } else {
      setData({ name: '', emoji: '', base_price: '', has_variant_pricing: false, variant_prices: [], category_ids: [], active: true })
    }
  }, [editAddon, showForm])

  const set = (field, val) => setData(d => ({ ...d, [field]: val }))

  const saveAddon = async () => {
    if (!data.name.trim()) { toast('Add-on name required'); return }
    const payload = {
      ...data,
      base_price: parseFloat(data.base_price) || 0,
      variant_prices: data.variant_prices.map(vp => ({ ...vp, price: parseFloat(vp.price) || 0 })),
    }
    let res
    if (editAddon?.id) {
      res = await window.api.updateAddon(editAddon.id, payload)
    } else {
      res = await window.api.addAddon(payload)
    }
    if (res.success) { toast('Add-on saved ✓'); onCloseForm(); onRefresh() }
    else toast('Error: ' + res.error)
  }

  const toggleCat = (id) => {
    const ids = data.category_ids
    set('category_ids', ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id])
  }

  return (
    <>
      <div className="card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Icon</th>
              <th>Name</th>
              <th>Base Price</th>
              <th>Linked Categories</th>
              <th>Status</th>
              <th className="tr">Actions</th>
            </tr>
          </thead>
          <tbody>
            {addons.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>No add-ons yet.</td></tr>
            ) : addons.map(a => (
              <tr key={a.id}>
                <td style={{ fontSize: 20 }}>{a.emoji || '➕'}</td>
                <td style={{ fontWeight: 600 }}>{a.name}</td>
                <td>₹{a.base_price}</td>
                <td>
                  {a.category_ids?.length > 0
                    ? a.category_ids.map(cid => categories.find(c => c.id === cid)?.name).filter(Boolean).join(', ')
                    : <span style={{ color: 'var(--muted)' }}>All</span>}
                </td>
                <td><span className={`tag ${a.active ? 'tag-active' : 'tag-inactive'}`}>{a.active ? 'Active' : 'Inactive'}</span></td>
                <td className="tr">
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => onEditAddon(a)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => onDeleteAddon(a.id)}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <div className="modal-title">{editAddon ? 'EDIT ADD-ON' : 'ADD ADD-ON'}</div>
              <button className="modal-close" onClick={onCloseForm}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input className="form-input" value={data.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Extra Cheese" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Emoji / Icon</label>
                    <input className="form-input" value={data.emoji} onChange={e => set('emoji', e.target.value)} placeholder="🧀" maxLength={4} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Base Price ₹</label>
                    <input className="form-input" type="number" value={data.base_price} onChange={e => set('base_price', e.target.value)} placeholder="0" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Link to Categories</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                    {categories.filter(c => c.active).map(c => (
                      <button
                        key={c.id}
                        className={`cpill ${data.category_ids.includes(c.id) ? 'active' : ''}`}
                        onClick={() => toggleCat(c.id)}
                        type="button"
                      >
                        {c.emoji || ''} {c.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="toggle-wrap">
                  <label className="toggle">
                    <input type="checkbox" checked={data.active} onChange={e => set('active', e.target.checked)} />
                    <span className="slider" />
                  </label>
                  <span style={{ fontSize: 13 }}>Active</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={onCloseForm}>Cancel</button>
              <button className="btn btn-primary" onClick={saveAddon}>Save Add-on</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
