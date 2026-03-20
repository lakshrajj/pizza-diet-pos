import { useState, useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import { useMenuStore } from './store/menuStore'
import { useInventoryStore } from './store/inventoryStore'
import { ToastProvider, useToast } from './components/Toast'

import Login from './pages/Login'
import Billing from './pages/Billing'
import MenuManager from './pages/MenuManager'
import Inventory from './pages/Inventory'
import Operations from './pages/Operations'
import CategoryManager from './pages/CategoryManager'
import Settings from './pages/Settings'

// Pages visible in topbar nav
const NAV = [
  { key: 'billing', label: 'Billing', icon: '🧾', staffAllowed: true },
  { key: 'menu', label: 'Menu Manager', icon: '🍕', staffAllowed: false },
  { key: 'inventory', label: 'Inventory', icon: '📦', staffAllowed: false },
  { key: 'operations', label: 'Operations', icon: '📊', staffAllowed: true },
  { key: 'categories', label: 'Categories', icon: '⚙️', staffAllowed: false },
  { key: 'settings', label: 'Settings', icon: '🔧', staffAllowed: false },
]

function SetupBanner() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <div className="setup-banner">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h3>🎉 Welcome to Pizza Diet POS!</h3>
        <button
          onClick={() => setDismissed(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted)' }}
        >×</button>
      </div>
      <p style={{ fontSize: 13, color: '#555', marginBottom: 10 }}>
        Your database is empty. Follow these steps to get started:
      </p>
      <ol className="setup-steps">
        <li>Go to <strong>Categories</strong> → Add menu categories (e.g. Pizza, Burger, Shake)</li>
        <li>Go to <strong>Menu Manager</strong> → Add your items with variants and pricing</li>
        <li>Go to <strong>Inventory</strong> → Add your stock items</li>
        <li>Go to <strong>Settings</strong> → Enter store name, address, phone, GSTIN</li>
        <li>You're ready to bill! 🚀</li>
      </ol>
    </div>
  )
}

function AppContent() {
  const { user, isLoggedIn, logout, isAdmin } = useAuthStore()
  const { loadAll: loadMenu, categories, items: menuItems } = useMenuStore()
  const { loadAll: loadInventory, lowStockCount } = useInventoryStore()
  const [activePage, setActivePage] = useState('billing')
  const [settings, setSettings] = useState({})
  const [dayClosed, setDayClosed] = useState(false)
  const [loadingApp, setLoadingApp] = useState(true)

  useEffect(() => {
    if (isLoggedIn) {
      initApp()
    }
  }, [isLoggedIn])

  const initApp = async () => {
    setLoadingApp(true)
    const [s] = await Promise.all([
      window.api.getSettings(),
      loadMenu(),
      loadInventory(),
    ])
    setSettings(s)
    setDayClosed(s.day_closed === 'true')
    setLoadingApp(false)
  }

  const handleDayClose = () => {
    setDayClosed(true)
    setSettings(s => ({ ...s, day_closed: 'true' }))
  }

  const handleDayReopen = () => {
    setDayClosed(false)
    setSettings(s => ({ ...s, day_closed: 'false' }))
  }

  // Refresh settings when we navigate to settings page
  const handleNav = async (key) => {
    setActivePage(key)
    if (key === 'billing') {
      await loadMenu()
    }
    if (key === 'settings') {
      const s = await window.api.getSettings()
      setSettings(s)
    }
    if (key === 'inventory') {
      await loadInventory()
    }
  }

  if (!isLoggedIn) return <Login />

  const hasNoCategories = !loadingApp && categories.length === 0
  const hasNoItems = !loadingApp && menuItems.length === 0
  const showSetup = hasNoCategories || hasNoItems

  const isAdminUser = user?.role === 'admin'

  const visibleNav = NAV.filter(n => isAdminUser || n.staffAllowed)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top bar */}
      <div className="topbar">
        <span className="t-logo">🍕 Pizza Diet</span>

        {visibleNav.map(n => (
          <button
            key={n.key}
            className={`npill ${activePage === n.key ? 'active' : ''}`}
            onClick={() => handleNav(n.key)}
            style={{ position: 'relative' }}
          >
            {n.label}
            {n.key === 'inventory' && lowStockCount > 0 && (
              <span className="badge-alert">{lowStockCount > 9 ? '9+' : lowStockCount}</span>
            )}
          </button>
        ))}

        <div className="t-right">
          <span className="t-staff">
            👤 {user?.username}
            <span style={{ marginLeft: 6, fontSize: 11, background: user?.role === 'admin' ? 'var(--accent-lt)' : 'var(--surface)', color: user?.role === 'admin' ? 'var(--accent)' : 'var(--muted)', padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>
              {user?.role}
            </span>
          </span>
          <button className="t-logout" onClick={logout}>Logout</button>
        </div>
      </div>

      {/* Main content */}
      <div className="main-content">
        {loadingApp ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40 }}>🍕</div>
              <div style={{ marginTop: 12, fontFamily: 'Bebas Neue', fontSize: 24, letterSpacing: 2 }}>Loading Pizza Diet POS…</div>
            </div>
          </div>
        ) : (
          <>
            {activePage === 'billing' && (
              <div className="page active" id="page-billing" style={{ flexDirection: 'column', position: 'relative', background: 'var(--bg)' }}>
                {showSetup && (
                  <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--white)', flexShrink: 0 }}>
                    <SetupBanner />
                  </div>
                )}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                  <Billing
                    settings={settings}
                    dayClosed={dayClosed}
                  />
                </div>
              </div>
            )}

            {activePage === 'menu' && isAdminUser && (
              <div className="page active">
                <MenuManager />
              </div>
            )}

            {activePage === 'inventory' && isAdminUser && (
              <div className="page active">
                <Inventory />
              </div>
            )}

            {activePage === 'operations' && (
              <div className="page active">
                <Operations
                  settings={settings}
                  onDayClose={handleDayClose}
                  onDayReopen={handleDayReopen}
                />
              </div>
            )}

            {activePage === 'categories' && isAdminUser && (
              <div className="page active">
                <CategoryManager />
              </div>
            )}

            {activePage === 'settings' && isAdminUser && (
              <div className="page active">
                <Settings />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}
