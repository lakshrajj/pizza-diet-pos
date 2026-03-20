import { create } from 'zustand'

export const useMenuStore = create((set, get) => ({
  items: [],
  categories: [],
  subcategories: [],
  addons: [],
  loaded: false,

  loadAll: async () => {
    try {
      const [items, categories, subcategories, addons] = await Promise.all([
        window.api.getMenuItemsForBilling(),
        window.api.getCategories(),
        window.api.getSubcategories(),
        window.api.getAddons(),
      ])
      set({ items, categories, subcategories, addons, loaded: true })
    } catch (e) {
      console.error('Failed to load menu:', e)
    }
  },

  reload: async () => {
    set({ loaded: false })
    await get().loadAll()
  },

  searchItems: (query) => {
    const q = query.toLowerCase()
    return get().items.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.category_name?.toLowerCase().includes(q)
    )
  },

  getItemsByCategory: (catId) => {
    if (!catId) return get().items
    return get().items.filter(i => i.category_id === catId)
  },
}))
