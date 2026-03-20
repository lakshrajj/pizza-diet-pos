import { create } from 'zustand'

let billCounter = 1

function generateTempOrderNum() {
  return `ORDER #${String(billCounter++).padStart(4, '0')}`
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
    // Check for duplicate by rowKey
    const existing = items.find(i => i.rowKey === item.rowKey)
    if (existing) {
      set({ items: items.map(i => i.rowKey === item.rowKey ? { ...i, qty: i.qty + 1 } : i) })
    } else {
      set({ items: [...items, { ...item, qty: 1, discountPct: 0 }] })
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
        return { ...i, qty: newQty }
      })
    })
  },

  setDiscount: (rowKey, pct) => {
    set({
      items: get().items.map(i =>
        i.rowKey === rowKey ? { ...i, discountPct: Math.min(100, Math.max(0, parseFloat(pct) || 0)) } : i
      )
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

  // Computed values
  getSubtotal: () => {
    return get().items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0)
  },

  getTotalDiscount: () => {
    return get().items.reduce((sum, i) => sum + (i.unitPrice * i.qty * (i.discountPct / 100)), 0)
  },

  getTotalGST: () => {
    return get().items.reduce((sum, i) => {
      const taxable = i.unitPrice * i.qty * (1 - (i.discountPct / 100))
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
