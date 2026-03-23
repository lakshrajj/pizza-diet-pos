const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // Auth
  login: (username, password) => ipcRenderer.invoke('auth:login', username, password),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSetting: (key, value) => ipcRenderer.invoke('settings:update', key, value),
  updateSettings: (updates) => ipcRenderer.invoke('settings:updateMany', updates),

  // Categories
  getCategories: () => ipcRenderer.invoke('category:getAll'),
  addCategory: (data) => ipcRenderer.invoke('category:add', data),
  updateCategory: (id, data) => ipcRenderer.invoke('category:update', id, data),
  deleteCategory: (id) => ipcRenderer.invoke('category:delete', id),

  getSubcategories: () => ipcRenderer.invoke('subcategory:getAll'),
  addSubcategory: (data) => ipcRenderer.invoke('subcategory:add', data),
  updateSubcategory: (id, data) => ipcRenderer.invoke('subcategory:update', id, data),
  deleteSubcategory: (id) => ipcRenderer.invoke('subcategory:delete', id),

  // Menu Items
  getMenuItems: () => ipcRenderer.invoke('menu:getItems'),
  getMenuItemsForBilling: () => ipcRenderer.invoke('menu:getItemsForBilling'),
  addMenuItem: (data) => ipcRenderer.invoke('menu:addItem', data),
  updateMenuItem: (id, data) => ipcRenderer.invoke('menu:updateItem', id, data),
  deleteMenuItem: (id) => ipcRenderer.invoke('menu:deleteItem', id),
  toggleMenuItemActive: (id, active) => ipcRenderer.invoke('menu:toggleActive', id, active),
  getMenuIngredients: (menuItemId) => ipcRenderer.invoke('menu:getIngredients', menuItemId),

  // Add-ons
  getAddons: () => ipcRenderer.invoke('addon:getAll'),
  addAddon: (data) => ipcRenderer.invoke('addon:add', data),
  updateAddon: (id, data) => ipcRenderer.invoke('addon:update', id, data),
  deleteAddon: (id) => ipcRenderer.invoke('addon:delete', id),

  // Variant names (for addon size-based pricing setup)
  getVariantNames: () => ipcRenderer.invoke('variant:getAll'),

  // Inventory Categories
  getInvCategories: () => ipcRenderer.invoke('invCategory:getAll'),
  addInvCategory: (data) => ipcRenderer.invoke('invCategory:add', data),
  updateInvCategory: (id, data) => ipcRenderer.invoke('invCategory:update', id, data),
  deleteInvCategory: (id) => ipcRenderer.invoke('invCategory:delete', id),

  // Inventory Items
  getInventory: () => ipcRenderer.invoke('inventory:getAll'),
  getLowStockCount: () => ipcRenderer.invoke('inventory:getLowStock'),
  addInventoryItem: (data) => ipcRenderer.invoke('inventory:addItem', data),
  updateInventoryItem: (id, data) => ipcRenderer.invoke('inventory:updateItem', id, data),
  deleteInventoryItem: (id) => ipcRenderer.invoke('inventory:deleteItem', id),
  adjustStock: (data) => ipcRenderer.invoke('inventory:adjustStock', data),
  getStockMovements: (itemId) => ipcRenderer.invoke('inventory:getMovements', itemId),

  // Inventory Entry (billing-style)
  getInventoryForEntry: () => ipcRenderer.invoke('inventory:getAllForEntry'),
  batchInventoryEntry: (entries, staffId) => ipcRenderer.invoke('inventory:batchEntry', entries, staffId),
  getInventoryTransactions: (from, to) => ipcRenderer.invoke('inventory:getTransactions', from, to),

  // Customer lookup
  getCustomerByPhone: (phone) => ipcRenderer.invoke('customer:getByPhone', phone),

  // Orders
  createOrder: (data) => ipcRenderer.invoke('order:create', data),
  holdOrder: (data) => ipcRenderer.invoke('order:hold', data),
  getHeldOrders: () => ipcRenderer.invoke('order:getHeld'),
  voidHeldOrder: (id) => ipcRenderer.invoke('order:voidHeld', id),
  getOrderById: (id) => ipcRenderer.invoke('order:getById', id),
  getOrderByNumber: (number) => ipcRenderer.invoke('order:getByNumber', number),
  searchOrdersByPhone: (phone) => ipcRenderer.invoke('order:searchByPhone', phone),

  // Reports
  getDailyReport: (from, to) => ipcRenderer.invoke('reports:daily', from, to),
  getOrders: (from, to) => ipcRenderer.invoke('reports:orders', from, to),
  getByCategoryItems: (from, to) => ipcRenderer.invoke('reports:byCategoryItems', from, to),
  getStockConsumed: (from, to) => ipcRenderer.invoke('reports:stockConsumed', from, to),

  // Day Close
  getDayClose: () => ipcRenderer.invoke('dayClose:get'),
  closDay: (userId) => ipcRenderer.invoke('dayClose:close', userId),
  reopenDay: () => ipcRenderer.invoke('dayClose:reopen'),

  // Users
  getUsers: () => ipcRenderer.invoke('users:getAll'),
  addUser: (data) => ipcRenderer.invoke('users:add', data),
  updateUser: (id, data) => ipcRenderer.invoke('users:update', id, data),
  deleteUser: (id) => ipcRenderer.invoke('users:delete', id),

  // Customers
  getCustomers: () => ipcRenderer.invoke('customers:getAll'),
  addCustomer: (data) => ipcRenderer.invoke('customers:add', data),
  updateCustomer: (id, data) => ipcRenderer.invoke('customers:update', id, data),
  deleteCustomer: (id) => ipcRenderer.invoke('customers:delete', id),
  getCustomerOrders: (phone) => ipcRenderer.invoke('customers:getOrders', phone),

  // Quick Add config
  getQuickAddConfig: () => ipcRenderer.invoke('quickAdd:getConfig'),
  saveQuickAddConfig: (ids) => ipcRenderer.invoke('quickAdd:saveConfig', ids),

  // Billable inventory for billing
  getBillableInventory: () => ipcRenderer.invoke('inventory:getBillable'),

  // Print
  printReceipt: (text) => ipcRenderer.invoke('print:receipt', text),
})
