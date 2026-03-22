const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const bcrypt = require('bcryptjs')

// ─── STATE ──────────────────────────────────────────────────────────────────
let db          // better-sqlite3-compatible wrapper (see createWrapper below)
let sqlJsDb     // raw sql.js Database instance
let dbPath      // absolute path to the .db file on disk
let _inTx = false  // are we currently inside a transaction?
let mainWindow

// ─── PERSISTENCE ────────────────────────────────────────────────────────────
function saveDb() {
  if (!sqlJsDb || !dbPath) return
  const data = sqlJsDb.export()         // returns Uint8Array of the whole db
  fs.writeFileSync(dbPath, Buffer.from(data))
}

// ─── BETTER-SQLITE3 COMPATIBILITY WRAPPER ───────────────────────────────────
//
// sql.js is a pure-JS/WASM build of SQLite — no C++ compilation needed.
// Its API differs from better-sqlite3, so we provide thin wrappers that let
// all the IPC handler code below remain completely unchanged.
//
function createWrapper() {
  const normalizeParams = (args) => {
    if (!args || args.length === 0) return []
    if (args.length === 1 && Array.isArray(args[0])) return args[0]
    return Array.from(args)
  }

  return {
    // db.prepare(sql).get(...params)  → first row or undefined
    // db.prepare(sql).all(...params)  → array of rows
    // db.prepare(sql).run(...params)  → { lastInsertRowid, changes }
    prepare(sql) {
      return {
        get(...args) {
          const p = normalizeParams(args)
          const stmt = sqlJsDb.prepare(sql)
          try {
            if (p.length) stmt.bind(p)
            if (stmt.step()) return stmt.getAsObject()
            return undefined
          } finally {
            stmt.free()
          }
        },
        all(...args) {
          const p = normalizeParams(args)
          const results = []
          const stmt = sqlJsDb.prepare(sql)
          try {
            if (p.length) stmt.bind(p)
            while (stmt.step()) results.push({ ...stmt.getAsObject() })
            return results
          } finally {
            stmt.free()
          }
        },
        run(...args) {
          const p = normalizeParams(args)
          sqlJsDb.run(sql, p.length ? p : [])
          const ridRes = sqlJsDb.exec('SELECT last_insert_rowid()')
          const lastInsertRowid = ridRes.length ? (ridRes[0].values[0][0] || 0) : 0
          const changes = sqlJsDb.getRowsModified()
          if (!_inTx) saveDb()
          return { lastInsertRowid, changes }
        },
      }
    },

    // db.exec(multiStatementSql)  — used for schema creation
    exec(sql) {
      sqlJsDb.exec(sql)
      if (!_inTx) saveDb()
    },

    // db.transaction(fn)(…args)  — wraps fn in BEGIN/COMMIT
    transaction(fn) {
      return (...args) => {
        sqlJsDb.run('BEGIN')
        _inTx = true
        try {
          const result = fn(...args)
          sqlJsDb.run('COMMIT')
          _inTx = false
          saveDb()
          return result
        } catch (e) {
          _inTx = false
          try { sqlJsDb.run('ROLLBACK') } catch (_) {}
          throw e
        }
      }
    },

    // db.pragma(…) — WAL is irrelevant for in-memory sql.js; we keep FK support
    pragma(str) {
      try { sqlJsDb.run(`PRAGMA ${str}`) } catch (_) {}
    },
  }
}

// ─── DB INIT ─────────────────────────────────────────────────────────────────
async function initDB() {
  const initSqlJs = require('sql.js')
  const userDataPath = app.getPath('userData')
  dbPath = path.join(userDataPath, 'pizza-diet.db')

  // Locate the wasm binary (dev: node_modules; production: extraResources)
  let wasmPath
  if (app.isPackaged) {
    wasmPath = path.join(process.resourcesPath, 'sql-wasm.wasm')
  } else {
    // require.resolve('sql.js') → .../node_modules/sql.js/dist/sql-wasm.js
    // so dirname is .../node_modules/sql.js/dist/
    wasmPath = path.join(path.dirname(require.resolve('sql.js')), 'sql-wasm.wasm')
  }

  const SQL = await initSqlJs({ locateFile: () => wasmPath })

  // Load existing database from disk, or create a fresh one
  const fileBuffer = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null
  sqlJsDb = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database()

  db = createWrapper()
  db.pragma('foreign_keys = ON')

  createSchema()
  runMigrations()
  seedDefaults()
  saveDb()
}

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'staff',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS menu_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      emoji TEXT,
      display_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS menu_subcategories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER REFERENCES menu_categories(id),
      name TEXT NOT NULL,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER REFERENCES menu_categories(id),
      subcategory_id INTEGER REFERENCES menu_subcategories(id),
      emoji TEXT,
      has_variants INTEGER DEFAULT 0,
      base_price REAL DEFAULT 0,
      is_veg INTEGER DEFAULT 1,
      gst_percent REAL DEFAULT 0,
      show_in_menu INTEGER DEFAULT 1,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS item_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
      variant_name TEXT NOT NULL,
      variant_desc TEXT,
      price REAL NOT NULL,
      display_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS addons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      emoji TEXT,
      base_price REAL DEFAULT 0,
      has_variant_pricing INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS addon_variant_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      addon_id INTEGER REFERENCES addons(id) ON DELETE CASCADE,
      variant_name TEXT NOT NULL,
      price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS addon_categories (
      addon_id INTEGER REFERENCES addons(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES menu_categories(id) ON DELETE CASCADE,
      PRIMARY KEY (addon_id, category_id)
    );

    CREATE TABLE IF NOT EXISTS inventory_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER REFERENCES inventory_categories(id),
      subcategory TEXT,
      base_unit TEXT NOT NULL,
      low_stock_threshold REAL DEFAULT 0,
      current_stock REAL DEFAULT 0,
      supplier_name TEXT,
      notes TEXT,
      active INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inventory_pack_sizes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
      pack_name TEXT NOT NULL,
      units_in_pack REAL NOT NULL,
      purchase_price REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
      inventory_item_id INTEGER REFERENCES inventory_items(id),
      base_quantity REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ingredient_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
      variant_name TEXT NOT NULL,
      quantity REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      order_type TEXT DEFAULT 'dine',
      customer_name TEXT,
      customer_phone TEXT,
      customer_address TEXT,
      subtotal REAL DEFAULT 0,
      total_discount REAL DEFAULT 0,
      total_gst REAL DEFAULT 0,
      grand_total REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      billed_at TEXT,
      created_by INTEGER REFERENCES users(id),
      day_close_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      menu_item_id INTEGER REFERENCES menu_items(id),
      item_name TEXT NOT NULL,
      variant_name TEXT,
      variant_desc TEXT,
      qty INTEGER DEFAULT 1,
      unit_price REAL NOT NULL,
      discount_pct REAL DEFAULT 0,
      gst_pct REAL DEFAULT 0,
      addons_json TEXT DEFAULT '[]',
      special_note TEXT,
      line_total REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventory_item_id INTEGER REFERENCES inventory_items(id),
      movement_type TEXT NOT NULL,
      quantity REAL NOT NULL,
      reason TEXT,
      reference_id TEXT,
      staff_id INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS day_close_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      close_date TEXT NOT NULL,
      total_orders INTEGER DEFAULT 0,
      total_revenue REAL DEFAULT 0,
      total_discount REAL DEFAULT 0,
      total_gst REAL DEFAULT 0,
      closed_at TEXT DEFAULT (datetime('now')),
      closed_by INTEGER REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE,
      address TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `)
}

function runMigrations() {
  // v1.1 – kept for existing DBs that already have this column; no-op on fresh ones
  try { sqlJsDb.run('ALTER TABLE inventory_items ADD COLUMN linked_menu_item_id INTEGER') } catch (_) {}
  // v1.2 – billable inventory items (can be billed directly to customer)
  try { sqlJsDb.run('ALTER TABLE inventory_items ADD COLUMN is_billable INTEGER DEFAULT 0') } catch (_) {}
  // v1.2 – price for billable items
  try { sqlJsDb.run('ALTER TABLE inventory_items ADD COLUMN sale_price REAL DEFAULT 0') } catch (_) {}
}

function seedDefaults() {
  // Admin user
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin')
  if (!existing) {
    const hash = bcrypt.hashSync('admin123', 10)
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', hash, 'admin')
  }

  // Default settings
  const defaults = {
    store_name: 'Pizza Diet',
    store_address: '',
    store_phone: '',
    store_gstin: '',
    receipt_paper_width: '80',
    printer_port: 'USB',
    bill_prefix: 'PD',
    gst_enabled: 'true',
    day_close_enabled: 'true',
    bill_reset_daily: 'false',
    auto_print: 'false',
    day_closed: 'false',
    current_bill_number: '1',
    bill_last_date: '',
  }
  const upsert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
  for (const [k, v] of Object.entries(defaults)) {
    upsert.run(k, v)
  }
}

// ─── WINDOW ──────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
    title: 'Pizza Diet POS',
  })

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(async () => {
  await initDB()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  saveDb()  // final flush before quit
  if (process.platform !== 'darwin') app.quit()
})

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
  return row ? row.value : null
}

function getNextBillNumber() {
  const prefix = getSetting('bill_prefix') || 'PD'
  const resetDaily = getSetting('bill_reset_daily') === 'true'

  // Date segment used when daily reset is on — makes each day's numbers unique
  const today = new Date().toISOString().slice(0, 10)           // "2026-03-22"
  const dateTag = today.slice(2).replace(/-/g, '')              // "260322"
  const fullPrefix = resetDaily ? `${prefix}-${dateTag}` : prefix

  // Start counter from 1 on a new day, otherwise continue from saved value
  let num = 1
  if (resetDaily) {
    const lastSavedDate = getSetting('bill_last_date') || ''
    if (lastSavedDate === today) {
      num = parseInt(getSetting('current_bill_number') || '1', 10)
    }
    // Save today as last date
    db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(today, 'bill_last_date')
  } else {
    num = parseInt(getSetting('current_bill_number') || '1', 10)
  }

  // Sync num to be above any existing order with this prefix
  const maxRow = db.prepare(`
    SELECT order_number FROM orders
    WHERE order_number LIKE ? ORDER BY id DESC LIMIT 1
  `).get(`${fullPrefix}-%`)
  if (maxRow) {
    const parts = maxRow.order_number.split('-')
    const existingMax = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(existingMax) && existingMax >= num) num = existingMax + 1
  }

  // Final safety: skip any number that already exists
  let billNo = `${fullPrefix}-${String(num).padStart(4, '0')}`
  while (db.prepare('SELECT 1 FROM orders WHERE order_number = ?').get(billNo)) {
    num++
    billNo = `${fullPrefix}-${String(num).padStart(4, '0')}`
  }

  db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(String(num + 1), 'current_bill_number')
  return billNo
}

// ─── AUTH IPC ────────────────────────────────────────────────────────────────
ipcMain.handle('auth:login', (_, username, password) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username)
    if (!user) return { success: false, error: 'Invalid ID or Password' }
    const match = bcrypt.compareSync(password, user.password_hash)
    if (!match) return { success: false, error: 'Invalid ID or Password' }
    return { success: true, user: { id: user.id, username: user.username, role: user.role } }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// ─── SETTINGS IPC ────────────────────────────────────────────────────────────
ipcMain.handle('settings:get', () => {
  const rows = db.prepare('SELECT key, value FROM settings').all()
  const obj = {}
  rows.forEach(r => { obj[r.key] = r.value })
  return obj
})

ipcMain.handle('settings:update', (_, key, value) => {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
  return { success: true }
})

ipcMain.handle('settings:updateMany', (_, updates) => {
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
  const updateMany = db.transaction((items) => {
    for (const [k, v] of Object.entries(items)) stmt.run(k, v)
  })
  updateMany(updates)
  return { success: true }
})

// ─── CATEGORIES IPC ──────────────────────────────────────────────────────────
ipcMain.handle('category:getAll', () => {
  return db.prepare('SELECT * FROM menu_categories ORDER BY display_order, name').all()
})

ipcMain.handle('category:add', (_, data) => {
  const r = db.prepare('INSERT INTO menu_categories (name, emoji, display_order, active) VALUES (?, ?, ?, ?)').run(
    data.name, data.emoji || '', data.display_order || 0, data.active !== false ? 1 : 0
  )
  return { success: true, id: r.lastInsertRowid }
})

ipcMain.handle('category:update', (_, id, data) => {
  db.prepare('UPDATE menu_categories SET name=?, emoji=?, display_order=?, active=? WHERE id=?').run(
    data.name, data.emoji || '', data.display_order || 0, data.active !== false ? 1 : 0, id
  )
  return { success: true }
})

ipcMain.handle('category:delete', (_, id) => {
  db.prepare('DELETE FROM menu_categories WHERE id = ?').run(id)
  return { success: true }
})

ipcMain.handle('subcategory:getAll', () => {
  return db.prepare(`
    SELECT s.*, c.name as category_name FROM menu_subcategories s
    LEFT JOIN menu_categories c ON s.category_id = c.id ORDER BY s.name
  `).all()
})

ipcMain.handle('subcategory:add', (_, data) => {
  const r = db.prepare('INSERT INTO menu_subcategories (category_id, name, active) VALUES (?, ?, ?)').run(
    data.category_id, data.name, data.active !== false ? 1 : 0
  )
  return { success: true, id: r.lastInsertRowid }
})

ipcMain.handle('subcategory:update', (_, id, data) => {
  db.prepare('UPDATE menu_subcategories SET name=?, category_id=?, active=? WHERE id=?').run(
    data.name, data.category_id, data.active !== false ? 1 : 0, id
  )
  return { success: true }
})

ipcMain.handle('subcategory:delete', (_, id) => {
  db.prepare('DELETE FROM menu_subcategories WHERE id = ?').run(id)
  return { success: true }
})

// ─── MENU ITEMS IPC ──────────────────────────────────────────────────────────
ipcMain.handle('menu:getItems', () => {
  const items = db.prepare(`
    SELECT m.*, c.name as category_name, s.name as subcategory_name
    FROM menu_items m
    LEFT JOIN menu_categories c ON m.category_id = c.id
    LEFT JOIN menu_subcategories s ON m.subcategory_id = s.id
    ORDER BY m.name
  `).all()

  const variantsStmt = db.prepare('SELECT * FROM item_variants WHERE menu_item_id = ? ORDER BY display_order')
  const ingStmt = db.prepare(`
    SELECT ing.*, inv.name as stock_item_name, inv.base_unit
    FROM ingredients ing
    JOIN inventory_items inv ON ing.inventory_item_id = inv.id
    WHERE ing.menu_item_id = ?
  `)
  const ivStmt = db.prepare('SELECT * FROM ingredient_variants WHERE ingredient_id = ?')

  return items.map(item => {
    const ings = ingStmt.all(item.id).map(ing => ({
      ...ing,
      variant_quantities: ivStmt.all(ing.id),
    }))
    return {
      ...item,
      variants: variantsStmt.all(item.id),
      ingredients: ings,
    }
  })
})

ipcMain.handle('menu:getIngredients', (_, menuItemId) => {
  const ings = db.prepare(`
    SELECT ing.*, inv.name as stock_item_name, inv.base_unit
    FROM ingredients ing
    JOIN inventory_items inv ON ing.inventory_item_id = inv.id
    WHERE ing.menu_item_id = ?
  `).all(menuItemId)
  const ivStmt = db.prepare('SELECT * FROM ingredient_variants WHERE ingredient_id = ?')
  return ings.map(ing => ({ ...ing, variant_quantities: ivStmt.all(ing.id) }))
})

ipcMain.handle('menu:getItemsForBilling', () => {
  const items = db.prepare(`
    SELECT m.*, c.name as category_name, c.emoji as category_emoji
    FROM menu_items m
    LEFT JOIN menu_categories c ON m.category_id = c.id
    WHERE m.active = 1 AND m.show_in_menu = 1
    ORDER BY c.display_order, m.name
  `).all()

  const variantsStmt = db.prepare('SELECT * FROM item_variants WHERE menu_item_id = ? ORDER BY display_order')
  const addonsStmt = db.prepare(`
    SELECT a.*, avp.variant_name as vp_variant, avp.price as vp_price
    FROM addons a
    JOIN addon_categories ac ON a.id = ac.addon_id
    LEFT JOIN addon_variant_prices avp ON a.id = avp.addon_id
    WHERE a.active = 1 AND ac.category_id = ?
  `)

  return items.map(item => {
    const variants = variantsStmt.all(item.id)
    const addonsRaw = addonsStmt.all(item.category_id)
    // Group addon variant prices
    const addonsMap = {}
    addonsRaw.forEach(a => {
      if (!addonsMap[a.id]) {
        addonsMap[a.id] = { id: a.id, name: a.name, emoji: a.emoji, base_price: a.base_price, has_variant_pricing: a.has_variant_pricing, variant_prices: {} }
      }
      if (a.vp_variant) {
        addonsMap[a.id].variant_prices[a.vp_variant] = a.vp_price
      }
    })
    return { ...item, variants, addons: Object.values(addonsMap) }
  })
})

ipcMain.handle('menu:addItem', (_, data) => {
  const insertItem = db.transaction((d) => {
    const r = db.prepare(`
      INSERT INTO menu_items (name, category_id, subcategory_id, emoji, has_variants, base_price, is_veg, gst_percent, show_in_menu, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(d.name, d.category_id, d.subcategory_id || null, d.emoji || '', d.has_variants ? 1 : 0,
      d.base_price || 0, d.is_veg ? 1 : 0, d.gst_percent || 0, d.show_in_menu ? 1 : 0, 1)

    const itemId = r.lastInsertRowid

    if (d.has_variants && d.variants) {
      const varStmt = db.prepare('INSERT INTO item_variants (menu_item_id, variant_name, variant_desc, price, display_order) VALUES (?, ?, ?, ?, ?)')
      d.variants.forEach((v, i) => varStmt.run(itemId, v.variant_name, v.variant_desc || '', v.price, i))
    }

    if (d.addon_ids && d.addon_ids.length) {
      const acStmt = db.prepare('INSERT OR IGNORE INTO addon_categories (addon_id, category_id) VALUES (?, ?)')
      d.addon_ids.forEach(aid => acStmt.run(aid, d.category_id))
    }

    // Ingredients
    if (d.ingredients && d.ingredients.length) {
      const ingStmt = db.prepare('INSERT INTO ingredients (menu_item_id, inventory_item_id, base_quantity) VALUES (?, ?, ?)')
      const ivStmt = db.prepare('INSERT INTO ingredient_variants (ingredient_id, variant_name, quantity) VALUES (?, ?, ?)')
      d.ingredients.forEach(ing => {
        const ir = ingStmt.run(itemId, ing.inventory_item_id, ing.base_quantity || 0)
        if (ing.variant_quantities) {
          ing.variant_quantities.forEach(vq => ivStmt.run(ir.lastInsertRowid, vq.variant_name, vq.quantity))
        }
      })
    }

    return itemId
  })

  try {
    const id = insertItem(data)
    return { success: true, id }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('menu:updateItem', (_, id, data) => {
  const update = db.transaction((itemId, d) => {
    db.prepare(`
      UPDATE menu_items SET name=?, category_id=?, subcategory_id=?, emoji=?, has_variants=?,
      base_price=?, is_veg=?, gst_percent=?, show_in_menu=?, active=? WHERE id=?
    `).run(d.name, d.category_id, d.subcategory_id || null, d.emoji || '', d.has_variants ? 1 : 0,
      d.base_price || 0, d.is_veg ? 1 : 0, d.gst_percent || 0, d.show_in_menu ? 1 : 0, d.active ? 1 : 0, itemId)

    // Replace variants
    db.prepare('DELETE FROM item_variants WHERE menu_item_id = ?').run(itemId)
    if (d.has_variants && d.variants) {
      const varStmt = db.prepare('INSERT INTO item_variants (menu_item_id, variant_name, variant_desc, price, display_order) VALUES (?, ?, ?, ?, ?)')
      d.variants.forEach((v, i) => varStmt.run(itemId, v.variant_name, v.variant_desc || '', v.price, i))
    }

    // Replace ingredients
    db.prepare('DELETE FROM ingredients WHERE menu_item_id = ?').run(itemId)
    if (d.ingredients && d.ingredients.length) {
      const ingStmt = db.prepare('INSERT INTO ingredients (menu_item_id, inventory_item_id, base_quantity) VALUES (?, ?, ?)')
      const ivStmt = db.prepare('INSERT INTO ingredient_variants (ingredient_id, variant_name, quantity) VALUES (?, ?, ?)')
      d.ingredients.forEach(ing => {
        const ir = ingStmt.run(itemId, ing.inventory_item_id, ing.base_quantity || 0)
        if (ing.variant_quantities) {
          ing.variant_quantities.forEach(vq => ivStmt.run(ir.lastInsertRowid, vq.variant_name, vq.quantity))
        }
      })
    }
  })

  try {
    update(id, data)
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('menu:deleteItem', (_, id) => {
  db.prepare('DELETE FROM menu_items WHERE id = ?').run(id)
  return { success: true }
})

ipcMain.handle('menu:toggleActive', (_, id, active) => {
  db.prepare('UPDATE menu_items SET active = ? WHERE id = ?').run(active ? 1 : 0, id)
  return { success: true }
})

// ─── ADDONS IPC ──────────────────────────────────────────────────────────────
ipcMain.handle('addon:getAll', () => {
  const addons = db.prepare('SELECT * FROM addons ORDER BY name').all()
  const vpStmt = db.prepare('SELECT * FROM addon_variant_prices WHERE addon_id = ?')
  const catStmt = db.prepare('SELECT category_id FROM addon_categories WHERE addon_id = ?')
  return addons.map(a => ({
    ...a,
    variant_prices: vpStmt.all(a.id),
    category_ids: catStmt.all(a.id).map(r => r.category_id),
  }))
})

ipcMain.handle('addon:add', (_, data) => {
  try {
    const r = db.prepare('INSERT INTO addons (name, emoji, base_price, has_variant_pricing, active) VALUES (?, ?, ?, ?, ?)').run(
      data.name, data.emoji || '', data.base_price || 0, data.has_variant_pricing ? 1 : 0, 1
    )
    const addonId = r.lastInsertRowid
    if (data.variant_prices) {
      const vpStmt = db.prepare('INSERT INTO addon_variant_prices (addon_id, variant_name, price) VALUES (?, ?, ?)')
      data.variant_prices.forEach(vp => vpStmt.run(addonId, vp.variant_name, vp.price))
    }
    if (data.category_ids) {
      const acStmt = db.prepare('INSERT OR IGNORE INTO addon_categories (addon_id, category_id) VALUES (?, ?)')
      data.category_ids.forEach(cid => acStmt.run(addonId, cid))
    }
    return { success: true, id: addonId }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('addon:update', (_, id, data) => {
  try {
    db.prepare('UPDATE addons SET name=?, emoji=?, base_price=?, has_variant_pricing=?, active=? WHERE id=?').run(
      data.name, data.emoji || '', data.base_price || 0, data.has_variant_pricing ? 1 : 0, data.active ? 1 : 0, id
    )
    db.prepare('DELETE FROM addon_variant_prices WHERE addon_id = ?').run(id)
    if (data.variant_prices) {
      const vpStmt = db.prepare('INSERT INTO addon_variant_prices (addon_id, variant_name, price) VALUES (?, ?, ?)')
      data.variant_prices.forEach(vp => vpStmt.run(id, vp.variant_name, vp.price))
    }
    db.prepare('DELETE FROM addon_categories WHERE addon_id = ?').run(id)
    if (data.category_ids) {
      const acStmt = db.prepare('INSERT OR IGNORE INTO addon_categories (addon_id, category_id) VALUES (?, ?)')
      data.category_ids.forEach(cid => acStmt.run(id, cid))
    }
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('addon:delete', (_, id) => {
  db.prepare('DELETE FROM addons WHERE id = ?').run(id)
  return { success: true }
})

// ─── INVENTORY CATEGORIES ────────────────────────────────────────────────────
ipcMain.handle('invCategory:getAll', () => {
  return db.prepare('SELECT * FROM inventory_categories ORDER BY name').all()
})
ipcMain.handle('invCategory:add', (_, data) => {
  const r = db.prepare('INSERT INTO inventory_categories (name, active) VALUES (?, ?)').run(data.name, data.active !== false ? 1 : 0)
  return { success: true, id: r.lastInsertRowid }
})
ipcMain.handle('invCategory:update', (_, id, data) => {
  db.prepare('UPDATE inventory_categories SET name=?, active=? WHERE id=?').run(data.name, data.active !== false ? 1 : 0, id)
  return { success: true }
})
ipcMain.handle('invCategory:delete', (_, id) => {
  db.prepare('DELETE FROM inventory_categories WHERE id = ?').run(id)
  return { success: true }
})

// ─── INVENTORY ITEMS IPC ─────────────────────────────────────────────────────
ipcMain.handle('inventory:getAll', () => {
  const items = db.prepare(`
    SELECT i.*, c.name as category_name
    FROM inventory_items i
    LEFT JOIN inventory_categories c ON i.category_id = c.id
    ORDER BY i.name
  `).all()
  const packStmt = db.prepare('SELECT * FROM inventory_pack_sizes WHERE inventory_item_id = ?')
  return items.map(item => ({ ...item, pack_sizes: packStmt.all(item.id) }))
})

ipcMain.handle('inventory:getLowStock', () => {
  return db.prepare('SELECT COUNT(*) as count FROM inventory_items WHERE current_stock <= low_stock_threshold AND active = 1').get()
})

ipcMain.handle('inventory:addItem', (_, data) => {
  try {
    const r = db.prepare(`
      INSERT INTO inventory_items (name, category_id, subcategory, base_unit, low_stock_threshold, current_stock, supplier_name, notes, active, is_billable, sale_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.name, data.category_id, data.subcategory || '', data.base_unit, data.low_stock_threshold || 0,
      data.current_stock || 0, data.supplier_name || '', data.notes || '', 1,
      data.is_billable ? 1 : 0, data.sale_price || 0)

    const itemId = r.lastInsertRowid

    if (data.pack_sizes && data.pack_sizes.length) {
      const psStmt = db.prepare('INSERT INTO inventory_pack_sizes (inventory_item_id, pack_name, units_in_pack, purchase_price) VALUES (?, ?, ?, ?)')
      data.pack_sizes.forEach(ps => psStmt.run(itemId, ps.pack_name, ps.units_in_pack, ps.purchase_price || 0))
    }

    // Opening stock movement
    if (data.current_stock > 0) {
      db.prepare('INSERT INTO stock_movements (inventory_item_id, movement_type, quantity, reason) VALUES (?, ?, ?, ?)').run(
        itemId, 'opening', data.current_stock, 'Opening stock'
      )
    }

    return { success: true, id: itemId }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('inventory:updateItem', (_, id, data) => {
  try {
    db.prepare(`
      UPDATE inventory_items SET name=?, category_id=?, subcategory=?, base_unit=?, low_stock_threshold=?,
      supplier_name=?, notes=?, active=?, is_billable=?, sale_price=?, updated_at=datetime('now') WHERE id=?
    `).run(data.name, data.category_id, data.subcategory || '', data.base_unit, data.low_stock_threshold || 0,
      data.supplier_name || '', data.notes || '', data.active ? 1 : 0,
      data.is_billable ? 1 : 0, data.sale_price || 0, id)

    db.prepare('DELETE FROM inventory_pack_sizes WHERE inventory_item_id = ?').run(id)
    if (data.pack_sizes && data.pack_sizes.length) {
      const psStmt = db.prepare('INSERT INTO inventory_pack_sizes (inventory_item_id, pack_name, units_in_pack, purchase_price) VALUES (?, ?, ?, ?)')
      data.pack_sizes.forEach(ps => psStmt.run(id, ps.pack_name, ps.units_in_pack, ps.purchase_price || 0))
    }

    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('inventory:deleteItem', (_, id) => {
  db.prepare('DELETE FROM inventory_items WHERE id = ?').run(id)
  return { success: true }
})

ipcMain.handle('inventory:adjustStock', (_, data) => {
  try {
    const item = db.prepare('SELECT current_stock FROM inventory_items WHERE id = ?').get(data.inventory_item_id)
    if (!item) return { success: false, error: 'Item not found' }

    let newStock = item.current_stock
    const type = data.movement_type
    const qty = parseFloat(data.quantity)

    if (type === 'purchase' || type === 'opening' || type === 'manual_add') {
      newStock += qty
    } else if (type === 'wastage' || type === 'sale' || type === 'manual_remove') {
      newStock = Math.max(0, newStock - qty)
    } else if (type === 'manual_set') {
      newStock = qty
    }

    db.prepare("UPDATE inventory_items SET current_stock = ?, updated_at = datetime('now') WHERE id = ?").run(newStock, data.inventory_item_id)
    db.prepare('INSERT INTO stock_movements (inventory_item_id, movement_type, quantity, reason, reference_id, staff_id) VALUES (?, ?, ?, ?, ?, ?)').run(
      data.inventory_item_id, type, qty, data.reason || '', data.reference_id || '', data.staff_id || null
    )

    return { success: true, new_stock: newStock }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('inventory:getMovements', (_, itemId) => {
  return db.prepare(`
    SELECT sm.*, u.username as staff_name
    FROM stock_movements sm
    LEFT JOIN users u ON sm.staff_id = u.id
    WHERE sm.inventory_item_id = ?
    ORDER BY sm.created_at DESC LIMIT 100
  `).all(itemId)
})

// ─── ORDERS IPC ──────────────────────────────────────────────────────────────
ipcMain.handle('order:create', (_, data) => {
  const createOrder = db.transaction((d) => {
    const orderNumber = getNextBillNumber()

    const r = db.prepare(`
      INSERT INTO orders (order_number, order_type, customer_name, customer_phone, customer_address,
        subtotal, total_discount, total_gst, grand_total, status, billed_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'billed', datetime('now'), ?)
    `).run(orderNumber, d.order_type, d.customer_name || '', d.customer_phone || '', d.customer_address || '',
      d.subtotal, d.total_discount, d.total_gst, d.grand_total, d.created_by || null)

    const orderId = r.lastInsertRowid

    const itemStmt = db.prepare(`
      INSERT INTO order_items (order_id, menu_item_id, item_name, variant_name, variant_desc, qty, unit_price,
        discount_pct, gst_pct, addons_json, special_note, line_total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    d.items.forEach(item => {
      itemStmt.run(orderId, item.menu_item_id, item.item_name, item.variant_name || '', item.variant_desc || '',
        item.qty, item.unit_price, item.discount_pct || 0, item.gst_pct || 0,
        JSON.stringify(item.addons || []), item.special_note || '', item.line_total)
    })

    // Auto deduct ingredients for menu items
    deductInventory(d.items, orderNumber)
    // Deduct stock for billable inventory items sold directly
    deductBillableInventory(d.items, orderNumber)
    // Auto-upsert customer record ONLY for delivery orders
    if (d.order_type === 'delivery' && d.customer_phone && d.customer_phone.trim()) {
      const ph = d.customer_phone.trim()
      const existing = db.prepare('SELECT id, name, address FROM customers WHERE phone = ?').get(ph)
      if (existing) {
        // Update name/address if they weren't set before
        const newName = existing.name || (d.customer_name || '').trim()
        const newAddr = existing.address || (d.customer_address || '').trim()
        db.prepare("UPDATE customers SET name=?, address=?, updated_at=datetime('now') WHERE phone=?").run(newName, newAddr, ph)
      } else {
        db.prepare('INSERT OR IGNORE INTO customers (name, phone, address) VALUES (?, ?, ?)').run(
          (d.customer_name || '').trim() || ph, ph, (d.customer_address || '').trim()
        )
      }
    }

    return { orderId, orderNumber }
  })

  try {
    const result = createOrder(data)
    return { success: true, ...result }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

function deductBillableInventory(items, orderNumber) {
  items.forEach(item => {
    const invId = item.inventory_item_id
    if (!invId) return
    const curr = db.prepare('SELECT current_stock FROM inventory_items WHERE id = ?').get(invId)
    if (!curr) return
    // Allow negative stock — sale always goes through, stock tracked accurately
    const newStock = curr.current_stock - item.qty
    db.prepare("UPDATE inventory_items SET current_stock = ?, updated_at = datetime('now') WHERE id = ?").run(newStock, invId)
    db.prepare('INSERT INTO stock_movements (inventory_item_id, movement_type, quantity, reason, reference_id) VALUES (?, ?, ?, ?, ?)').run(
      invId, 'sale', item.qty, `Sold: ${item.item_name}`, orderNumber
    )
  })
}

function deductInventory(items, orderNumber) {
  const ingStmt = db.prepare('SELECT * FROM ingredients WHERE menu_item_id = ?')
  const ivStmt = db.prepare('SELECT * FROM ingredient_variants WHERE ingredient_id = ? AND variant_name = ?')

  items.forEach(item => {
    const ingredients = ingStmt.all(item.menu_item_id)
    ingredients.forEach(ing => {
      let qty = ing.base_quantity
      if (item.variant_name) {
        const iv = ivStmt.get(ing.id, item.variant_name)
        if (iv) qty = iv.quantity
      }
      qty *= item.qty
      if (qty <= 0) return  // Skip zero-quantity entries (variant not mapped to this stock item)

      const curr = db.prepare('SELECT current_stock FROM inventory_items WHERE id = ?').get(ing.inventory_item_id)
      if (curr) {
        const newStock = curr.current_stock - qty  // Allow negative for accurate over-use tracking
        db.prepare("UPDATE inventory_items SET current_stock = ?, updated_at = datetime('now') WHERE id = ?").run(newStock, ing.inventory_item_id)
        db.prepare('INSERT INTO stock_movements (inventory_item_id, movement_type, quantity, reason, reference_id) VALUES (?, ?, ?, ?, ?)').run(
          ing.inventory_item_id, 'sale', qty, `Recipe deduct: ${item.item_name}${item.variant_name ? ' (' + item.variant_name + ')' : ''}`, orderNumber
        )
      }
    })
  })
}

ipcMain.handle('order:hold', (_, data) => {
  try {
    const orderNumber = `HOLD-${Date.now()}`
    const r = db.prepare(`
      INSERT INTO orders (order_number, order_type, customer_name, customer_phone, customer_address,
        subtotal, total_discount, total_gst, grand_total, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'held', ?)
    `).run(orderNumber, data.order_type, data.customer_name || '', data.customer_phone || '', data.customer_address || '',
      data.subtotal, data.total_discount, data.total_gst, data.grand_total, data.created_by || null)

    const orderId = r.lastInsertRowid
    const itemStmt = db.prepare(`
      INSERT INTO order_items (order_id, menu_item_id, item_name, variant_name, variant_desc, qty, unit_price,
        discount_pct, gst_pct, addons_json, special_note, line_total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    data.items.forEach(item => {
      itemStmt.run(orderId, item.menu_item_id, item.item_name, item.variant_name || '', item.variant_desc || '',
        item.qty, item.unit_price, item.discount_pct || 0, item.gst_pct || 0,
        JSON.stringify(item.addons || []), item.special_note || '', item.line_total)
    })
    return { success: true, orderId }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('order:getHeld', () => {
  const orders = db.prepare("SELECT * FROM orders WHERE status = 'held' ORDER BY created_at DESC").all()
  const itemStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?')
  return orders.map(o => ({ ...o, items: itemStmt.all(o.id) }))
})

ipcMain.handle('order:voidHeld', (_, id) => {
  db.prepare("UPDATE orders SET status = 'void' WHERE id = ?").run(id)
  return { success: true }
})

ipcMain.handle('order:getById', (_, id) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
  if (!order) return null
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id)
  return order
})

ipcMain.handle('order:getByNumber', (_, number) => {
  const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(number)
  if (!order) return null
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id)
  return order
})

ipcMain.handle('order:searchByPhone', (_, phone) => {
  return db.prepare("SELECT * FROM orders WHERE customer_phone LIKE ? AND status = 'billed' ORDER BY created_at DESC LIMIT 20").all(`%${phone}%`)
})

// ─── REPORTS IPC ─────────────────────────────────────────────────────────────
ipcMain.handle('reports:daily', (_, dateFrom, dateTo) => {
  const from = dateFrom || new Date().toISOString().slice(0, 10)
  const to = dateTo || from

  const summary = db.prepare(`
    SELECT COUNT(*) as total_orders, SUM(grand_total) as total_revenue,
    SUM(total_discount) as total_discount, SUM(total_gst) as total_gst,
    AVG(grand_total) as avg_order_value
    FROM orders WHERE status = 'billed' AND DATE(billed_at) BETWEEN ? AND ?
  `).get(from, to)

  const byCategory = db.prepare(`
    SELECT c.name as category, SUM(oi.line_total) as revenue, SUM(oi.qty) as qty
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN menu_items m ON oi.menu_item_id = m.id
    JOIN menu_categories c ON m.category_id = c.id
    WHERE o.status = 'billed' AND DATE(o.billed_at) BETWEEN ? AND ?
    GROUP BY c.id ORDER BY revenue DESC
  `).all(from, to)

  const topItems = db.prepare(`
    SELECT oi.item_name, SUM(oi.qty) as total_qty, SUM(oi.line_total) as total_revenue
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status = 'billed' AND DATE(o.billed_at) BETWEEN ? AND ?
    GROUP BY oi.item_name ORDER BY total_qty DESC LIMIT 10
  `).all(from, to)

  const byType = db.prepare(`
    SELECT order_type, COUNT(*) as count, SUM(grand_total) as revenue
    FROM orders WHERE status = 'billed' AND DATE(billed_at) BETWEEN ? AND ?
    GROUP BY order_type
  `).all(from, to)

  return { summary, byCategory, topItems, byType }
})

ipcMain.handle('reports:orders', (_, dateFrom, dateTo) => {
  const from = dateFrom || new Date().toISOString().slice(0, 10)
  const to = dateTo || from
  return db.prepare(`
    SELECT * FROM orders WHERE status = 'billed' AND DATE(billed_at) BETWEEN ? AND ?
    ORDER BY billed_at DESC
  `).all(from, to)
})

// ─── DAY CLOSE IPC ───────────────────────────────────────────────────────────
ipcMain.handle('dayClose:get', () => {
  const today = new Date().toISOString().slice(0, 10)
  return db.prepare("SELECT * FROM day_close_log WHERE close_date = ?").get(today)
})

ipcMain.handle('dayClose:close', (_, userId) => {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const summary = db.prepare(`
      SELECT COUNT(*) as total_orders, SUM(grand_total) as total_revenue,
      SUM(total_discount) as total_discount, SUM(total_gst) as total_gst
      FROM orders WHERE status = 'billed' AND DATE(billed_at) = ?
    `).get(today)

    db.prepare(`
      INSERT OR REPLACE INTO day_close_log (close_date, total_orders, total_revenue, total_discount, total_gst, closed_at, closed_by)
      VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
    `).run(today, summary.total_orders || 0, summary.total_revenue || 0, summary.total_discount || 0, summary.total_gst || 0, userId)

    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('day_closed', 'true')
    return { success: true, summary }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('dayClose:reopen', () => {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('day_closed', 'false')
  return { success: true }
})

// ─── USERS IPC ───────────────────────────────────────────────────────────────
ipcMain.handle('users:getAll', () => {
  return db.prepare('SELECT id, username, role, active, created_at FROM users ORDER BY username').all()
})

ipcMain.handle('users:add', (_, data) => {
  try {
    const hash = bcrypt.hashSync(data.password, 10)
    const r = db.prepare('INSERT INTO users (username, password_hash, role, active) VALUES (?, ?, ?, ?)').run(
      data.username, hash, data.role || 'staff', data.active !== false ? 1 : 0
    )
    return { success: true, id: r.lastInsertRowid }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('users:update', (_, id, data) => {
  try {
    if (data.password) {
      const hash = bcrypt.hashSync(data.password, 10)
      db.prepare('UPDATE users SET username=?, password_hash=?, role=?, active=? WHERE id=?').run(
        data.username, hash, data.role, data.active ? 1 : 0, id
      )
    } else {
      db.prepare('UPDATE users SET username=?, role=?, active=? WHERE id=?').run(data.username, data.role, data.active ? 1 : 0, id)
    }
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('users:delete', (_, id) => {
  db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(id)
  return { success: true }
})

// ─── CUSTOMER LOOKUP IPC ─────────────────────────────────────────────────────
ipcMain.handle('customer:getByPhone', (_, phone) => {
  const p = (phone || '').trim()
  if (!p) return null

  // 1. Check customers table first (manually added or previously saved)
  const cust = db.prepare(`SELECT * FROM customers WHERE phone = ? OR phone LIKE ?`).get(p, `%${p}%`)

  // 2. Also check order history for name/address
  const recent = db.prepare(`
    SELECT customer_name, customer_phone, customer_address
    FROM orders WHERE customer_phone LIKE ? AND status = 'billed' AND customer_phone != ''
    ORDER BY created_at DESC LIMIT 1
  `).get(`%${p}%`)

  if (!cust && !recent) return null

  // Collect all distinct addresses (from customers table + order history)
  const orderAddrs = db.prepare(`
    SELECT DISTINCT customer_address FROM orders
    WHERE customer_phone LIKE ? AND customer_address != '' AND status = 'billed'
    ORDER BY created_at DESC LIMIT 10
  `).all(`%${p}%`).map(a => a.customer_address).filter(Boolean)

  const allAddresses = cust?.address
    ? [...new Set([cust.address, ...orderAddrs])]
    : [...new Set(orderAddrs)]

  return {
    name: cust?.name || recent?.customer_name || '',
    phone: cust?.phone || recent?.customer_phone || '',
    address: cust?.address || recent?.customer_address || '',
    addresses: allAddresses,
    isKnown: true,
  }
})

// ─── INVENTORY ENTRY IPC ─────────────────────────────────────────────────────
ipcMain.handle('inventory:getAllForEntry', () => {
  return db.prepare(`
    SELECT i.*, c.name as category_name
    FROM inventory_items i
    LEFT JOIN inventory_categories c ON i.category_id = c.id
    WHERE i.active = 1 ORDER BY i.name
  `).all()
})

ipcMain.handle('inventory:batchEntry', (_, entries, staffId) => {
  const run = db.transaction((rows) => {
    rows.forEach(e => {
      const item = db.prepare('SELECT current_stock FROM inventory_items WHERE id = ?').get(e.inventory_item_id)
      if (!item) return
      const qty = parseFloat(e.quantity) || 0
      let newStock = item.current_stock
      if (e.movement_type === 'purchase' || e.movement_type === 'manual_add') newStock += Math.abs(qty)
      else if (e.movement_type === 'wastage' || e.movement_type === 'manual_remove') newStock = Math.max(0, newStock - Math.abs(qty))
      else if (e.movement_type === 'manual_set') newStock = Math.max(0, qty)
      db.prepare("UPDATE inventory_items SET current_stock=?, updated_at=datetime('now') WHERE id=?").run(newStock, e.inventory_item_id)
      db.prepare('INSERT INTO stock_movements (inventory_item_id, movement_type, quantity, reason, reference_id, staff_id) VALUES (?,?,?,?,?,?)').run(
        e.inventory_item_id, e.movement_type, qty, e.reason || '', e.reference || '', staffId || null
      )
    })
  })
  try { run(entries); return { success: true } }
  catch (e) { return { success: false, error: e.message } }
})

ipcMain.handle('inventory:getTransactions', (_, dateFrom, dateTo) => {
  const from = dateFrom || new Date().toISOString().slice(0, 10)
  const to = dateTo || from
  return db.prepare(`
    SELECT sm.*, i.name as item_name, i.base_unit, u.username as staff_name
    FROM stock_movements sm
    JOIN inventory_items i ON sm.inventory_item_id = i.id
    LEFT JOIN users u ON sm.staff_id = u.id
    WHERE DATE(sm.created_at) BETWEEN ? AND ?
    ORDER BY sm.created_at DESC LIMIT 500
  `).all(from, to)
})

// ─── CUSTOMERS IPC ───────────────────────────────────────────────────────────
ipcMain.handle('customers:getAll', () => {
  return db.prepare(`
    SELECT c.*,
      COUNT(o.id) as total_orders,
      SUM(o.grand_total) as total_spent,
      MAX(o.billed_at) as last_order_at
    FROM customers c
    LEFT JOIN orders o ON o.customer_phone = c.phone AND o.status = 'billed'
    GROUP BY c.id
    ORDER BY last_order_at DESC NULLS LAST, c.name ASC
  `).all()
})

ipcMain.handle('customers:add', (_, data) => {
  try {
    if (!data.name || !data.name.trim()) return { success: false, error: 'Name is required' }
    if (!data.phone || !data.phone.trim()) return { success: false, error: 'Phone is required' }
    const r = db.prepare('INSERT INTO customers (name, phone, address, notes) VALUES (?, ?, ?, ?)').run(
      data.name.trim(), data.phone.trim(), data.address || '', data.notes || ''
    )
    return { success: true, id: r.lastInsertRowid }
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) return { success: false, error: 'This phone number is already registered' }
    return { success: false, error: e.message }
  }
})

ipcMain.handle('customers:update', (_, id, data) => {
  try {
    if (!data.name || !data.name.trim()) return { success: false, error: 'Name is required' }
    if (!data.phone || !data.phone.trim()) return { success: false, error: 'Phone is required' }
    db.prepare("UPDATE customers SET name=?, phone=?, address=?, notes=?, updated_at=datetime('now') WHERE id=?").run(
      data.name.trim(), data.phone.trim(), data.address || '', data.notes || '', id
    )
    return { success: true }
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) return { success: false, error: 'This phone number is already registered' }
    return { success: false, error: e.message }
  }
})

ipcMain.handle('customers:delete', (_, id) => {
  try {
    db.prepare('DELETE FROM customers WHERE id = ?').run(id)
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('customers:getOrders', (_, phone) => {
  return db.prepare(`
    SELECT o.*, GROUP_CONCAT(oi.item_name || ' x' || oi.qty, ', ') as items_summary
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.customer_phone = ? AND o.status = 'billed'
    GROUP BY o.id
    ORDER BY o.billed_at DESC LIMIT 50
  `).all(phone)
})

// ─── QUICK ADD CONFIG IPC ────────────────────────────────────────────────────
ipcMain.handle('quickAdd:getConfig', () => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('quick_add_featured')
  try { return JSON.parse(row?.value || '[]') } catch { return [] }
})

ipcMain.handle('quickAdd:saveConfig', (_, ids) => {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('quick_add_featured', JSON.stringify(ids || []))
  return { success: true }
})

// ─── BILLABLE INVENTORY IPC ──────────────────────────────────────────────────
ipcMain.handle('inventory:getBillable', () => {
  return db.prepare(`
    SELECT id, name, sale_price, base_unit, current_stock
    FROM inventory_items WHERE is_billable = 1 AND active = 1 ORDER BY name
  `).all()
})

// ─── PRINT IPC ───────────────────────────────────────────────────────────────
ipcMain.handle('print:receipt', (_, receiptText) => {
  try {
    console.log('PRINT RECEIPT:\n', receiptText)
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})
