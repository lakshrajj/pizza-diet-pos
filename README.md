# 🍕 Pizza Diet POS

A complete offline Point-of-Sale system for Pizza Diet outlets.

**Built with:** Electron + React + Vite + SQLite (better-sqlite3) + Zustand

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18 or later
- **npm** v9 or later

### Installation

```bash
cd pizza-diet-pos
npm install
```

> **Note:** `better-sqlite3` requires native compilation. If you get errors, run:
> ```bash
> npm rebuild better-sqlite3
> ```

### Development Mode

```bash
npm run dev
```

This starts Vite (React) dev server on port 5173 and Electron simultaneously.

### Default Login
- **Username:** `admin`
- **Password:** `admin123`

---

## 🏗️ First-Time Setup (after login)

1. Go to **Categories** → Add your menu categories (Pizza, Burger, Shake, Drinks, etc.)
2. Go to **Menu Manager** → Add items with variants, pricing, GST%
3. Go to **Inventory** → Add stock items
4. Go to **Settings** → Enter store name, address, GSTIN, configure printer
5. Start billing!

---

## 📁 Project Structure

```
pizza-diet-pos/
├── electron/
│   ├── main.js          # Electron main process + all SQLite IPC handlers
│   ├── preload.js       # Context bridge (window.api)
│   └── printer.js       # ESC/POS thermal printer utilities
├── src/
│   ├── components/
│   │   ├── ItemConfigModal.jsx    # Size/addon selection modal
│   │   ├── OrderTable.jsx         # Billing order table with search
│   │   ├── QuickTiles.jsx         # Quick-add product tiles
│   │   ├── PaymentSummary.jsx     # Right panel: customer + totals
│   │   ├── VariantBuilder.jsx     # Dynamic variant rows for menu items
│   │   ├── PackSizeBuilder.jsx    # Pack size rows for inventory
│   │   ├── StockMovementModal.jsx # Stock adjustment form
│   │   ├── ReceiptModal.jsx       # Receipt preview + print
│   │   └── Toast.jsx              # Toast notification system
│   ├── pages/
│   │   ├── Login.jsx              # Login screen
│   │   ├── Billing.jsx            # Main POS billing screen
│   │   ├── MenuManager.jsx        # CRUD for menu items + add-ons
│   │   ├── Inventory.jsx          # Inventory management
│   │   ├── Operations.jsx         # Dashboard, reports, held orders
│   │   ├── CategoryManager.jsx    # Categories, sub-categories, users
│   │   └── Settings.jsx           # Store settings, printer config
│   ├── store/
│   │   ├── authStore.js           # User auth state (Zustand)
│   │   ├── orderStore.js          # Current order state
│   │   ├── menuStore.js           # Menu items cache
│   │   └── inventoryStore.js      # Inventory + low stock count
│   ├── styles/
│   │   └── global.css             # All styles (design from HTML prototype)
│   ├── App.jsx                    # Root app, routing, nav bar
│   └── main.jsx                   # React entry point
├── index.html
├── vite.config.js
└── package.json
```

---

## 🗃️ Database

SQLite database is stored in Electron's userData directory:
- **Windows:** `%APPDATA%\pizza-diet-pos\pizza-diet.db`
- **macOS:** `~/Library/Application Support/pizza-diet-pos/pizza-diet.db`
- **Linux:** `~/.config/pizza-diet-pos/pizza-diet.db`

---

## 🖨️ Thermal Printer Setup

1. Go to **Settings** → set **Printer Port** (COM1, USB, etc.)
2. For USB thermal printers on Windows, install the printer driver
3. The system outputs ESC/POS formatted text

---

## 👥 User Roles

| Feature | Staff | Admin |
|---------|-------|-------|
| Create bills | ✅ | ✅ |
| Hold / Print | ✅ | ✅ |
| View operations | ✅ | ✅ |
| Menu Manager | ❌ | ✅ |
| Inventory | ❌ | ✅ |
| Categories | ❌ | ✅ |
| Settings | ❌ | ✅ |
| Day Close | ❌ | ✅ |
| Reopen Day | ❌ | ✅ |

---

## 🔑 Keyboard Shortcuts (Billing Screen)

| Key | Action |
|-----|--------|
| Type in search box | Filter menu items |
| ↑ / ↓ | Navigate search dropdown |
| Enter | Select highlighted item |
| Escape | Close dropdown |

---

## 📦 Building for Production

```bash
npm run build
```

Output is in the `release/` directory.
