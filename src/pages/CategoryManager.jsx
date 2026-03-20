import { useState, useEffect } from 'react'
import { useMenuStore } from '../store/menuStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useToast } from '../components/Toast'

function CategoryForm({ cat, onSave, onClose }) {
  const toast = useToast()
  const [data, setData] = useState({
    name: cat?.name || '',
    emoji: cat?.emoji || '',
    display_order: cat?.display_order || 0,
    active: cat?.active !== false,
  })

  const set = (f, v) => setData(d => ({ ...d, [f]: v }))

  const save = async () => {
    if (!data.name.trim()) { toast('Name required'); return }
    let res
    if (cat?.id) res = await window.api.updateCategory(cat.id, data)
    else res = await window.api.addCategory(data)
    if (res.success) { toast('Saved ✓'); onSave() }
    else toast('Error: ' + res.error)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <div className="modal-title">{cat ? 'EDIT CATEGORY' : 'ADD CATEGORY'}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input className="form-input" value={data.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Pizza" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Emoji</label>
            <input className="form-input" value={data.emoji} onChange={e => set('emoji', e.target.value)} placeholder="🍕" maxLength={4} style={{ maxWidth: 120 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Display Order</label>
            <input className="form-input" type="number" min={0} value={data.display_order} onChange={e => set('display_order', parseInt(e.target.value) || 0)} style={{ maxWidth: 120 }} />
          </div>
          <div className="toggle-wrap">
            <label className="toggle">
              <input type="checkbox" checked={data.active} onChange={e => set('active', e.target.checked)} />
              <span className="slider" />
            </label>
            <span style={{ fontSize: 13 }}>Active</span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  )
}

function SubcategoryForm({ sub, categories, onSave, onClose }) {
  const toast = useToast()
  const [data, setData] = useState({
    name: sub?.name || '',
    category_id: sub?.category_id || '',
    active: sub?.active !== false,
  })

  const set = (f, v) => setData(d => ({ ...d, [f]: v }))

  const save = async () => {
    if (!data.name.trim()) { toast('Name required'); return }
    if (!data.category_id) { toast('Category required'); return }
    let res
    if (sub?.id) res = await window.api.updateSubcategory(sub.id, data)
    else res = await window.api.addSubcategory(data)
    if (res.success) { toast('Saved ✓'); onSave() }
    else toast('Error: ' + res.error)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <div className="modal-title">{sub ? 'EDIT SUB-CATEGORY' : 'ADD SUB-CATEGORY'}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input className="form-input" value={data.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Classic Pizzas" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Parent Category *</label>
            <select className="form-input form-select" value={data.category_id} onChange={e => set('category_id', e.target.value)}>
              <option value="">Select category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="toggle-wrap">
            <label className="toggle">
              <input type="checkbox" checked={data.active} onChange={e => set('active', e.target.checked)} />
              <span className="slider" />
            </label>
            <span style={{ fontSize: 13 }}>Active</span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  )
}

function InvCategoryForm({ cat, onSave, onClose }) {
  const toast = useToast()
  const [data, setData] = useState({ name: cat?.name || '', active: cat?.active !== false })

  const save = async () => {
    if (!data.name.trim()) { toast('Name required'); return }
    let res
    if (cat?.id) res = await window.api.updateInvCategory(cat.id, data)
    else res = await window.api.addInvCategory(data)
    if (res.success) { toast('Saved ✓'); onSave() }
    else toast('Error: ' + res.error)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <div className="modal-title">{cat ? 'EDIT INV. CATEGORY' : 'ADD INV. CATEGORY'}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input className="form-input" value={data.name} onChange={e => setData(d => ({ ...d, name: e.target.value }))} placeholder="e.g. Dairy Products" autoFocus />
          </div>
          <div className="toggle-wrap">
            <label className="toggle">
              <input type="checkbox" checked={data.active} onChange={e => setData(d => ({ ...d, active: e.target.checked }))} />
              <span className="slider" />
            </label>
            <span style={{ fontSize: 13 }}>Active</span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  )
}

function UserForm({ user, onSave, onClose }) {
  const toast = useToast()
  const [data, setData] = useState({
    username: user?.username || '',
    password: '',
    role: user?.role || 'staff',
    active: user?.active !== false,
  })

  const set = (f, v) => setData(d => ({ ...d, [f]: v }))

  const save = async () => {
    if (!data.username.trim()) { toast('Username required'); return }
    if (!user?.id && !data.password.trim()) { toast('Password required'); return }
    let res
    if (user?.id) res = await window.api.updateUser(user.id, data)
    else res = await window.api.addUser(data)
    if (res.success) { toast('User saved ✓'); onSave() }
    else toast('Error: ' + res.error)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <div className="modal-title">{user ? 'EDIT USER' : 'ADD USER'}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Username *</label>
            <input className="form-input" value={data.username} onChange={e => set('username', e.target.value)} placeholder="e.g. john_staff" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Password {user ? '(leave blank to keep)' : '*'}</label>
            <input className="form-input" type="password" value={data.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" />
          </div>
          <div className="form-group">
            <label className="form-label">Role *</label>
            <select className="form-input form-select" value={data.role} onChange={e => set('role', e.target.value)}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="toggle-wrap">
            <label className="toggle">
              <input type="checkbox" checked={data.active} onChange={e => set('active', e.target.checked)} />
              <span className="slider" />
            </label>
            <span style={{ fontSize: 13 }}>Active</span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save User</button>
        </div>
      </div>
    </div>
  )
}

export default function CategoryManager() {
  const toast = useToast()
  const { reload: reloadMenu } = useMenuStore()
  const { loadAll: loadInv } = useInventoryStore()
  const [activeTab, setActiveTab] = useState('menu_cats')
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [invCategories, setInvCategories] = useState([])
  const [users, setUsers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    const [cats, subs, invCats, usrs] = await Promise.all([
      window.api.getCategories(),
      window.api.getSubcategories(),
      window.api.getInvCategories(),
      window.api.getUsers(),
    ])
    setCategories(cats)
    setSubcategories(subs)
    setInvCategories(invCats)
    setUsers(usrs)
    setLoading(false)
  }

  const closeForm = () => { setShowForm(false); setEditItem(null) }
  const saved = () => { closeForm(); loadAll(); reloadMenu() }

  const deleteCategory = async (id) => {
    if (!confirm('Delete this category?')) return
    await window.api.deleteCategory(id)
    toast('Deleted')
    loadAll()
  }

  const deleteSub = async (id) => {
    if (!confirm('Delete this sub-category?')) return
    await window.api.deleteSubcategory(id)
    toast('Deleted')
    loadAll()
  }

  const deleteInvCat = async (id) => {
    if (!confirm('Delete this category?')) return
    await window.api.deleteInvCategory(id)
    toast('Deleted')
    loadAll()
  }

  const deleteUser = async (id) => {
    if (!confirm('Deactivate this user?')) return
    await window.api.deleteUser(id)
    toast('User deactivated')
    loadAll()
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-title">⚙️ CATEGORY & USERS MANAGER</div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowForm(true) }}>
            + Add
          </button>
        </div>
      </div>

      <div className="admin-body">
        <div className="tab-bar">
          {[
            { key: 'menu_cats', label: '🍕 Menu Categories' },
            { key: 'subcats', label: '📁 Sub-categories' },
            { key: 'inv_cats', label: '📦 Inventory Categories' },
            { key: 'users', label: '👥 Users' },
          ].map(t => (
            <div key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
              {t.label}
            </div>
          ))}
        </div>

        {/* Menu Categories */}
        {activeTab === 'menu_cats' && (
          <div className="card" style={{ padding: 0 }}>
            <table className="data-table">
              <thead><tr><th>Icon</th><th>Name</th><th>Order</th><th>Status</th><th className="tr">Actions</th></tr></thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>No categories yet. Click "+ Add" to create your first category (e.g. Pizza, Burger, Drinks).</td></tr>
                ) : categories.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontSize: 20 }}>{c.emoji || '📂'}</td>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.display_order}</td>
                    <td><span className={`tag ${c.active ? 'tag-active' : 'tag-inactive'}`}>{c.active ? 'Active' : 'Inactive'}</span></td>
                    <td className="tr">
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => { setEditItem(c); setShowForm(true) }}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteCategory(c.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Subcategories */}
        {activeTab === 'subcats' && (
          <div className="card" style={{ padding: 0 }}>
            <table className="data-table">
              <thead><tr><th>Name</th><th>Parent Category</th><th>Status</th><th className="tr">Actions</th></tr></thead>
              <tbody>
                {subcategories.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>No sub-categories yet.</td></tr>
                ) : subcategories.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>{s.category_name || '—'}</td>
                    <td><span className={`tag ${s.active ? 'tag-active' : 'tag-inactive'}`}>{s.active ? 'Active' : 'Inactive'}</span></td>
                    <td className="tr">
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => { setEditItem(s); setShowForm(true) }}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteSub(s.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Inventory Categories */}
        {activeTab === 'inv_cats' && (
          <div className="card" style={{ padding: 0 }}>
            <table className="data-table">
              <thead><tr><th>Name</th><th>Status</th><th className="tr">Actions</th></tr></thead>
              <tbody>
                {invCategories.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>No inventory categories yet.</td></tr>
                ) : invCategories.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td><span className={`tag ${c.active ? 'tag-active' : 'tag-inactive'}`}>{c.active ? 'Active' : 'Inactive'}</span></td>
                    <td className="tr">
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => { setEditItem(c); setShowForm(true) }}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteInvCat(c.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Users */}
        {activeTab === 'users' && (
          <div className="card" style={{ padding: 0 }}>
            <table className="data-table">
              <thead><tr><th>Username</th><th>Role</th><th>Status</th><th>Created</th><th className="tr">Actions</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>👤 {u.username}</td>
                    <td><span className={`tag ${u.role === 'admin' ? 'tag-nveg' : 'tag-active'}`} style={{ textTransform: 'capitalize' }}>{u.role}</span></td>
                    <td><span className={`tag ${u.active ? 'tag-active' : 'tag-inactive'}`}>{u.active ? 'Active' : 'Inactive'}</span></td>
                    <td style={{ fontSize: 12 }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="tr">
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => { setEditItem(u); setShowForm(true) }}>Edit</button>
                        {u.username !== 'admin' && (
                          <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u.id)}>Deactivate</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form modals */}
      {showForm && activeTab === 'menu_cats' && (
        <CategoryForm cat={editItem} onSave={saved} onClose={closeForm} />
      )}
      {showForm && activeTab === 'subcats' && (
        <SubcategoryForm sub={editItem} categories={categories} onSave={saved} onClose={closeForm} />
      )}
      {showForm && activeTab === 'inv_cats' && (
        <InvCategoryForm cat={editItem} onSave={saved} onClose={closeForm} />
      )}
      {showForm && activeTab === 'users' && (
        <UserForm user={editItem} onSave={() => { closeForm(); loadAll() }} onClose={closeForm} />
      )}
    </div>
  )
}
