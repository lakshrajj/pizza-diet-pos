import { useState, useEffect } from 'react'
import { useOrderStore } from '../store/orderStore'
import { useMenuStore } from '../store/menuStore'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../components/Toast'
import OrderTable from '../components/OrderTable'
import QuickTiles from '../components/QuickTiles'
import PaymentSummary from '../components/PaymentSummary'
import ItemConfigModal from '../components/ItemConfigModal'
import ReceiptModal from '../components/ReceiptModal'

export default function Billing({ settings, dayClosed }) {
  const toast = useToast()
  const user = useAuthStore(s => s.user)

  const {
    orderType, setOrderType,
    customerName, customerPhone, customerAddress,
    items, clearOrder, loadHeldOrder, addItem,
    getSubtotal, getTotalDiscount, getTotalGST, getGrandTotal,
    setLastBilled, lastBilledOrder, lastBilledOrderNumber,
  } = useOrderStore()

  const { loaded } = useMenuStore()

  const [billNumber, setBillNumber] = useState('ORDER #0001')
  const [configItem, setConfigItem] = useState(null)
  const [receiptData, setReceiptData] = useState(null)
  const [clock, setClock] = useState('')

  // Clock
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setClock(d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
    }
    tick()
    const id = setInterval(tick, 10000)
    return () => clearInterval(id)
  }, [])

  // Order type labels
  const typeLabel = { dine: 'DINE-IN', takeaway: 'TAKEAWAY', delivery: 'HOME DELIVERY' }

  // Total items
  const totalItems = items.reduce((s, i) => s + i.qty, 0)

  // Handle item selection from search or quick tiles
  const handleItemSelect = (menuItem) => {
    if (menuItem.has_variants && menuItem.variants?.length > 0) {
      setConfigItem(menuItem)
    } else {
      // Direct add — no variants
      const rowKey = `${menuItem.id}__`
      addItem({
        rowKey,
        menuItemId: menuItem.id,
        name: menuItem.name,
        variantName: '',
        variantDesc: '',
        addons: [],
        specialNote: '',
        unitPrice: menuItem.base_price || 0,
        gstPct: menuItem.gst_percent || 0,
        isVeg: menuItem.is_veg,
      })
      toast(`${menuItem.name} added ✓`)
    }
  }

  const handleConfigAdd = (itemData) => {
    addItem(itemData)
    toast(`${itemData.name}${itemData.variantName ? ` (${itemData.variantName})` : ''} added ✓`)
  }

  // Build receipt text for thermal printer
  const buildReceiptText = (orderNumber, orderData) => {
    const storeName = settings?.store_name || 'Pizza Diet'
    const storeAddress = settings?.store_address || ''
    const storePhone = settings?.store_phone || ''
    const storeGstin = settings?.store_gstin || ''
    const gstEnabled = settings?.gst_enabled === 'true'
    const now = new Date()
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    const dateStr = now.toLocaleDateString('en-IN')
    const width = 32

    const center = (s) => {
      const pad = Math.max(0, Math.floor((width - s.length) / 2))
      return ' '.repeat(pad) + s
    }

    let text = '================================\n'
    text += center(`🍕 ${storeName}`) + '\n'
    if (storeAddress) text += center(storeAddress) + '\n'
    if (storePhone) text += center(`Ph: ${storePhone}`) + '\n'
    if (storeGstin) text += center(`GSTIN: ${storeGstin}`) + '\n'
    text += '================================\n'
    text += `Bill: ${orderNumber}    ${timeStr}\n`
    text += `Date: ${dateStr}  ${typeLabel[orderType] || orderType}\n`
    if (customerName) text += `Customer: ${customerName}${customerPhone ? ` | ${customerPhone}` : ''}\n`
    text += '================================\n'
    text += 'Item                        Amt\n'
    text += '--------------------------------\n'

    orderData.items.forEach(item => {
      const total = item.unitPrice * item.qty * (1 - (item.discountPct || 0) / 100)
      const label = `${item.name}${item.variantName ? ` (${item.variantName})` : ''}`
      text += `${label.slice(0, 24).padEnd(24)} ₹${total.toFixed(0)}\n`
      if (item.addons?.length) text += `  + ${item.addons.map(a => a.name).join(', ')}\n`
      if (item.specialNote) text += `  * ${item.specialNote}\n`
    })

    text += '--------------------------------\n'
    text += `${'Subtotal'.padEnd(24)} ₹${orderData.subtotal.toFixed(2)}\n`
    if (orderData.discount > 0) text += `${'Discount'.padEnd(24)}-₹${orderData.discount.toFixed(2)}\n`
    if (gstEnabled && orderData.gst > 0) text += `${'GST'.padEnd(24)} ₹${orderData.gst.toFixed(2)}\n`
    text += '================================\n'
    text += `${'TOTAL'.padEnd(18)} ₹${orderData.grandTotal.toFixed(2)}\n`
    text += '================================\n'
    text += center('Thank you! Visit Again') + '\n'
    text += center(`🍕 ${storeName}`) + '\n'
    text += '================================\n'

    return text
  }

  // BILL action
  const handleBill = async () => {
    if (dayClosed && user?.role !== 'admin') {
      toast('Day is closed. Ask admin to reopen.')
      return
    }
    if (items.length === 0) { toast('No items in order'); return }
    if (!customerName.trim()) { toast('Customer name is required'); return }
    if (orderType === 'delivery') {
      if (!customerPhone.trim()) { toast('Phone required for delivery'); return }
      if (!customerAddress.trim()) { toast('Address required for delivery'); return }
    }

    const subtotal = getSubtotal()
    const discount = getTotalDiscount()
    const gst = getTotalGST()
    const grandTotal = getGrandTotal()

    const orderData = {
      order_type: orderType,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      subtotal,
      total_discount: discount,
      total_gst: gst,
      grand_total: grandTotal,
      created_by: user?.id,
      items: items.map(i => ({
        menu_item_id: i.menuItemId,
        item_name: i.name + (i.variantName ? ` (${i.variantName})` : ''),
        variant_name: i.variantName || '',
        variant_desc: i.variantDesc || '',
        qty: i.qty,
        unit_price: i.unitPrice,
        discount_pct: i.discountPct || 0,
        gst_pct: i.gstPct || 0,
        addons: i.addons || [],
        special_note: i.specialNote || '',
        line_total: i.unitPrice * i.qty * (1 - (i.discountPct || 0) / 100),
      })),
    }

    const res = await window.api.createOrder(orderData)
    if (!res.success) {
      toast('Error creating order: ' + res.error)
      return
    }

    const finalReceipt = {
      orderNumber: res.orderNumber,
      orderType,
      customerName,
      customerPhone,
      items,
      subtotal,
      discount,
      gst,
      grandTotal,
      settings,
    }

    setLastBilled(finalReceipt, res.orderNumber)
    setBillNumber(res.orderNumber)

    // Auto print if enabled
    if (settings?.auto_print === 'true') {
      const text = buildReceiptText(res.orderNumber, { ...orderData, items, discount, gst, grandTotal })
      window.api.printReceipt(text)
    }

    setReceiptData(finalReceipt)
    clearOrder()
    toast(`Bill ${res.orderNumber} created! ✓`)
  }

  // HOLD action
  const handleHold = async () => {
    if (items.length === 0) { toast('No items to hold'); return }
    const subtotal = getSubtotal()
    const discount = getTotalDiscount()
    const gst = getTotalGST()
    const grandTotal = getGrandTotal()

    const res = await window.api.holdOrder({
      order_type: orderType,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      subtotal,
      total_discount: discount,
      total_gst: gst,
      grand_total: grandTotal,
      created_by: user?.id,
      items: items.map(i => ({
        menu_item_id: i.menuItemId,
        item_name: i.name + (i.variantName ? ` (${i.variantName})` : ''),
        variant_name: i.variantName || '',
        variant_desc: i.variantDesc || '',
        qty: i.qty,
        unit_price: i.unitPrice,
        discount_pct: i.discountPct || 0,
        gst_pct: i.gstPct || 0,
        addons: i.addons || [],
        special_note: i.specialNote || '',
        line_total: i.unitPrice * i.qty * (1 - (i.discountPct || 0) / 100),
      })),
    })

    if (res.success) {
      clearOrder()
      toast('Order held ✓')
    } else {
      toast('Error holding order')
    }
  }

  const handleClear = () => {
    clearOrder()
    toast('Order cleared')
  }

  const handlePrintBill = () => {
    if (items.length === 0) { toast('No items to print'); return }
    const subtotal = getSubtotal()
    const discount = getTotalDiscount()
    const gst = getTotalGST()
    const grandTotal = getGrandTotal()
    setReceiptData({
      orderNumber: billNumber,
      orderType,
      customerName,
      customerPhone,
      items,
      subtotal,
      discount,
      gst,
      grandTotal,
      settings,
    })
  }

  const handleReprint = () => {
    if (lastBilledOrder) {
      setReceiptData(lastBilledOrder)
    } else {
      toast('No previous bill to reprint')
    }
  }

  const handlePrint = async () => {
    if (!receiptData) return
    const text = buildReceiptText(receiptData.orderNumber, {
      items: receiptData.items,
      subtotal: receiptData.subtotal,
      discount: receiptData.discount,
      gst: receiptData.gst,
      grandTotal: receiptData.grandTotal,
    })
    await window.api.printReceipt(text)
    toast('Sent to printer')
  }

  if (!loaded) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ color: 'var(--muted)', fontSize: 16 }}>Loading menu data…</div>
      </div>
    )
  }

  return (
    <>
      {/* LEFT PANEL */}
      <div className="bleft">
        {/* Header */}
        <div className="chk-header">
          <div>
            <div className="chk-title">NEW CHECK</div>
            <div className="chk-sub">
              {billNumber} · {typeLabel[orderType]}
            </div>
          </div>
          <div className="chk-badge">
            <div className="chk-badge-lbl">Total Items</div>
            <div className="chk-badge-num">
              {String(totalItems).padStart(2, '0')}
            </div>
          </div>
        </div>

        {/* Order type bar */}
        <div className="otype-bar">
          {[
            { key: 'dine', label: 'Dine-In' },
            { key: 'takeaway', label: 'Takeaway' },
            { key: 'delivery', label: 'Delivery' },
          ].map(t => (
            <button
              key={t.key}
              className={`otype ${orderType === t.key ? 'active' : ''}`}
              onClick={() => setOrderType(t.key)}
            >
              {t.label}
            </button>
          ))}
          <span className="otype-info">{clock}</span>
        </div>

        {/* Order table */}
        <OrderTable onItemSelect={handleItemSelect} />

        {/* Quick tiles */}
        <QuickTiles onItemSelect={handleItemSelect} />
      </div>

      {/* RIGHT PANEL */}
      <PaymentSummary
        settings={settings}
        onBill={handleBill}
        onHold={handleHold}
        onClear={handleClear}
        onReprint={handleReprint}
        onPrintBill={handlePrintBill}
      />

      {/* Config Modal */}
      {configItem && (
        <ItemConfigModal
          item={configItem}
          onAdd={handleConfigAdd}
          onClose={() => setConfigItem(null)}
        />
      )}

      {/* Receipt Modal */}
      {receiptData && (
        <ReceiptModal
          receiptData={receiptData}
          onClose={() => setReceiptData(null)}
          onPrint={handlePrint}
        />
      )}

      {/* Day closed banner */}
      {dayClosed && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: '#ffeaea', borderTop: '1px solid #f5c6c3',
          padding: '10px 24px', textAlign: 'center',
          fontSize: 13, color: 'var(--red)', fontWeight: 600,
          zIndex: 10,
        }}>
          ⚠️ Day is closed. Billing is locked. Admin can reopen from Operations.
        </div>
      )}
    </>
  )
}
