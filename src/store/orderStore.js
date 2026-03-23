import { create } from 'zustand'

let billCounter = 1

// Helper: sum of addon prices for one line item (each addon has its own qty)
function addonTotal(item) {
  return (item.addons || []).reduce((s, a) => s + (a.price || 0) * (a.qty || 1), 0)
}

// Effective price per unit = base + addons
function effectiveUnit(item) {
  return item.unitPrice + addonTotal(item)
}

// Discount applies to base item price only — add-ons are always full price
function lineDiscount(item) {
  return item.unitPrice * (item.discountQty || 0) * (item.discountPct || 0) / 100
}

export const useOrderStore = create((set, get) => ({
  // Current order
  orderType: 'dine',   // dine | takeaway | delivery
  orderLabel: 'ORDER #0001',
  customerName: '',
  customerPhone: '',
  customerAddress: '',
  items: [],           // Array of order line items

  // Last billed order (for reprint)
  lastBilledOrder: null,
  lastBilledOrderNumber: null,

  setOrderType: (type) => {
    set({ orderType: type })
  },

  setCustomer: (field, value) => set({ [field]: value }),

  addItem: (item) => {
    const items = get().items
    const existing = items.find(i => i.rowKey === item.rowKey)
    if (existing) {
      set({ items: items.map(i => i.rowKey === item.rowKey ? { ...i, qty: i.qty + 1 } : i) })
    } else {
      set({ items: [...items, { ...item, qty: 1, discountPct: 0, discountQty: 0 }] })
    }
  },

  removeItem: (rowKey) => {
    set({ items: get().items.filter(i => i.rowKey !== rowKey) })
  },

  changeQty: (rowKey, delta) => {
    set({
      items: get().items.map(i => {
        if (i.rowKey !== rowKey) return i
        const newQty = Math.max(1, i.qty + delta)
        // Cap discountQty if qty decreased
        const discountQty = Math.min(i.discountQty || 0, newQty)
        return { ...i, qty: newQty, discountQty }
      })
    })
  },

  // Change qty of a specific addon on a line item (independent of pizza qty)
  changeAddonQty: (rowKey, addonId, delta) => {
    set({
      items: get().items.map(i => {
        if (i.rowKey !== rowKey) return i
        const addons = (i.addons || []).map(a => {
          if (a.id !== addonId) return a
          const newQty = Math.max(1, (a.qty || 1) + delta)
          return { ...a, qty: newQty }
        })
        return { ...i, addons }
      })
    })
  },

  // pct = discount percent, qty = how many items get the discount
  setDiscount: (rowKey, pct, qty) => {
    set({
      items: get().items.map(i => {
        if (i.rowKey !== rowKey) return i
        const discountPct = Math.min(100, Math.max(0, parseFloat(pct) || 0))
        const discountQty = Math.min(i.qty, Math.max(0, parseInt(qty) || 0))
        return { ...i, discountPct, discountQty }
      })
    })
  },

  updateItem: (rowKey, changes) => {
    set({
      items: get().items.map(i => i.rowKey === rowKey ? { ...i, ...changes } : i)
    })
  },

  clearOrder: () => {
    billCounter++
    set({
      items: [],
      orderType: 'dine',
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      orderLabel: `ORDER #${String(billCounter).padStart(4, '0')}`,
    })
  },

  loadHeldOrder: (order) => {
    const items = order.items.map((oi, idx) => ({
      rowKey: `held_${idx}_${oi.menu_item_id}`,
      menuItemId: oi.menu_item_id,
      name: oi.item_name,
      variantName: oi.variant_name || '',
      variantDesc: oi.variant_desc || '',
      addons: JSON.parse(oi.addons_json || '[]'),
      specialNote: oi.special_note || '',
      qty: oi.qty,
      unitPrice: oi.unit_price,
      discountPct: oi.discount_pct || 0,
      discountQty: oi.discount_qty || 0,
      gstPct: oi.gst_pct || 0,
      isVeg: true,
    }))
    set({
      items,
      orderType: order.order_type,
      customerName: order.customer_name || '',
      customerPhone: order.customer_phone || '',
      customerAddress: order.customer_address || '',
    })
  },

  setLastBilled: (order, number) => {
    set({ lastBilledOrder: order, lastBilledOrderNumber: number })
  },

  // ── Computed values ────────────────────────────────────────────────────────
  // Subtotal = base × pizzaQty + each addon × its own qty (addons are independent)
  getSubtotal: () => {
    return get().items.reduce((sum, i) => sum + i.unitPrice * i.qty + addonTotal(i), 0)
  },

  // Total discount = sum of discounted amounts across all items (base only)
  getTotalDiscount: () => {
    return get().items.reduce((sum, i) => sum + lineDiscount(i), 0)
  },

  getTotalGST: () => {
    return get().items.reduce((sum, i) => {
      // Taxable = base after discount + addons (each addon already has its own qty baked in)
      const taxable = (i.unitPrice * i.qty - lineDiscount(i)) + addonTotal(i)
      return sum + taxable * ((i.gstPct || 0) / 100)
    }, 0)
  },

  getGrandTotal: () => {
    const sub = get().getSubtotal()
    const disc = get().getTotalDiscount()
    const gst = get().getTotalGST()
    return sub - disc + gst
  },

  getTotalItems: () => {
    return get().items.reduce((sum, i) => sum + i.qty, 0)
  },
}))
