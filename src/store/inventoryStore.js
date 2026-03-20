import { create } from 'zustand'

export const useInventoryStore = create((set, get) => ({
  items: [],
  categories: [],
  lowStockCount: 0,
  loaded: false,

  loadAll: async () => {
    try {
      const [items, categories, lowStock] = await Promise.all([
        window.api.getInventory(),
        window.api.getInvCategories(),
        window.api.getLowStockCount(),
      ])
      set({ items, categories, lowStockCount: lowStock?.count || 0, loaded: true })
    } catch (e) {
      console.error('Failed to load inventory:', e)
    }
  },

  reload: async () => {
    const [items, lowStock] = await Promise.all([
      window.api.getInventory(),
      window.api.getLowStockCount(),
    ])
    set({ items, lowStockCount: lowStock?.count || 0 })
  },

  getStockStatus: (item) => {
    if (item.current_stock <= item.low_stock_threshold) return 'red'
    if (item.current_stock <= item.low_stock_threshold * 1.2) return 'yellow'
    return 'green'
  },
}))
