import { useState, useRef, useEffect } from 'react'
import { useOrderStore } from '../store/orderStore'

export default function PaymentSummary({ settings, onBill, onHold, onClear, onReprint, onPrintBill, onKitchenPrint }) {
  const {
    orderType,
    customerName, customerPhone, customerAddress,
    setCustomer,
    getSubtotal, getTotalDiscount, getTotalGST, getGrandTotal,
    items,
  } = useOrderStore()

  const [savedAddresses, setSavedAddresses] = useState([])
  const [showAddrDrop, setShowAddrDrop]     = useState(false)
  const [customerFound, setCustomerFound]   = useState(null)
  const lookupTimer = useRef(null)

  const subtotal   = getSubtotal()
  const discount   = getTotalDiscount()
  const gst        = getTotalGST()
  const grand      = getGrandTotal()
  const gstEnabled = settings?.gst_enabled === 'true'
  const isDelivery = orderType === 'delivery'

  const fmt = (n) => `₹${Math.abs(n).toFixed(2)}`

  // Reset lookup state when order type changes
  useEffect(() => {
    setCustomerFound(null)
    setSavedAddresses([])
    setShowAddrDrop(false)
  }, [orderType])

  // Phone lookup — debounced 500 ms
  const handlePhoneChange = (e) => {
    const phone = e.target.value
    setCustomer('customerPhone', phone)
    setCustomerFound(null)
    clearTimeout(lookupTimer.current)

    if (phone.trim().length >= 7) {
      lookupTimer.current = setTimeout(async () => {
        try {
          const data = await window.api.getCustomerByPhone(phone)
          if (data?.isKnown) {
            setCustomerFound(data)
            if (!customerName.trim() && data.name)        setCustomer('customerName', data.name)
            if (!customerAddress.trim() && data.addresses?.length === 1) setCustomer('customerAddress', data.addresses[0])
            else if (!customerAddress.trim() && data.address)            setCustomer('customerAddress', data.address)
            setSavedAddresses(data.addresses || [])
            if ((data.addresses || []).length > 1) setShowAddrDrop(true)
          } else {
            setCustomerFound({ isKnown: false })
            setSavedAddresses([])
          }
        } catch (_) { setCustomerFound(null) }
      }, 500)
    } else {
      setSavedAddresses([])
      setShowAddrDrop(false)
    }
  }

  const selectAddress = (addr) => {
    setCustomer('customerAddress', addr)
    setShowAddrDrop(false)
  }

  // Address field visible for delivery always, or dine/takeaway when customer has saved addresses or already typed one
  const showAddressField = isDelivery || customerAddress || (customerFound?.isKnown && savedAddresses.length > 0)

  return (
    <div className="bright">

      {/* ── Customer Details ── */}
      <div className="rsec">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <h4 style={{ margin: 0 }}>Customer Details</h4>
          <span style={{ fontSize: 10, color: isDelivery ? 'var(--red)' : 'var(--muted)', fontWeight: 500 }}>
            {isDelivery ? 'all fields required *' : 'name or phone required'}
          </span>
        </div>

        {/* Name */}
        <div className="cfield">
          <label>{isDelivery ? 'Name *' : 'Name'}</label>
          <input
            type="text"
            placeholder="Customer name"
            value={customerName}
            onChange={e => setCustomer('customerName', e.target.value)}
          />
        </div>

        {/* Phone */}
        <div className="cfield" style={{ position: 'relative' }}>
          <label>{isDelivery ? 'Phone *' : 'Phone'}</label>
          <input
            type="tel"
            placeholder="Mobile number"
            value={customerPhone}
            onChange={handlePhoneChange}
            onFocus={() => savedAddresses.length > 0 && setShowAddrDrop(true)}
          />

          {/* Known customer badge */}
          {customerFound?.isKnown && customerPhone.trim().length >= 7 && (
            <div style={{
              marginTop: 4, padding: '3px 8px', borderRadius: 5,
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
              fontSize: 11, color: '#16a34a', fontWeight: 600,
            }}>
              ✓ Known customer — {customerFound.name}
            </div>
          )}

          {/* New delivery customer badge */}
          {customerFound?.isKnown === false && customerPhone.trim().length >= 7 && isDelivery && (
            <div style={{
              marginTop: 4, padding: '3px 8px', borderRadius: 5,
              background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)',
              fontSize: 11, color: '#92400e', fontWeight: 600,
            }}>
              ✦ New customer — will be saved
            </div>
          )}

          {/* Saved address suggestions dropdown */}
          {showAddrDrop && savedAddresses.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              background: 'var(--white)', border: '1px solid var(--border)',
              borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', overflow: 'hidden',
            }}>
              <div style={{ padding: '4px 10px', fontSize: 10, fontWeight: 700, color: 'var(--muted)', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                SAVED ADDRESSES
              </div>
              {savedAddresses.map((addr, i) => (
                <div
                  key={i}
                  onClick={() => selectAddress(addr)}
                  style={{ padding: '7px 10px', fontSize: 12, cursor: 'pointer', borderBottom: i < savedAddresses.length - 1 ? '1px solid var(--border)' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-lt)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  📍 {addr}
                </div>
              ))}
              <div onClick={() => setShowAddrDrop(false)} style={{ padding: '5px 10px', fontSize: 11, color: 'var(--muted)', cursor: 'pointer', textAlign: 'center' }}>
                Close
              </div>
            </div>
          )}
        </div>

        {/* Address — delivery always, others only when applicable */}
        {showAddressField && (
          <div className="cfield">
            <label>{isDelivery ? 'Address *' : 'Address'}</label>
            <input
              type="text"
              placeholder={isDelivery ? 'Delivery address' : 'Address'}
              value={customerAddress}
              onChange={e => setCustomer('customerAddress', e.target.value)}
              onFocus={() => savedAddresses.length > 0 && setShowAddrDrop(true)}
            />
          </div>
        )}
      </div>

      {/* ── Payment Summary ── */}
      <div className="paysec">
        <h4>Payment Summary</h4>
        <div className="prow">
          <span className="pl">Subtotal</span>
          <span className="pv">{fmt(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="prow disc">
            <span className="pl">Discount</span>
            <span className="pv">-{fmt(discount)}</span>
          </div>
        )}
        {gstEnabled && gst > 0 && (
          <div className="prow">
            <span className="pl">GST</span>
            <span className="pv">+{fmt(gst)}</span>
          </div>
        )}
        <hr className="pdiv" />
        <div className="grand-box">
          <div className="grand-lbl">Grand Total</div>
          <div className="grand-amt">
            <span className="grand-sym">₹</span>
            <span>{grand.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="ract">
        <button className="btn-billed" onClick={onBill} disabled={items.length === 0}>
          <span>BILLED</span>
          <span>›</span>
        </button>
        <div className="sacts">
          <button className="sbtn" onClick={onPrintBill}>🖨 Customer Bill</button>
          <button className="sbtn" onClick={onKitchenPrint}>👨‍🍳 Kitchen Print</button>
        </div>
        <div className="sacts">
          <button className="sbtn" onClick={onHold} disabled={items.length === 0}>⏸ Hold Order</button>
          <button className="sbtn" onClick={onClear}>✕ Clear</button>
        </div>
        <div className="sacts">
          <button className="sbtn" onClick={onReprint}>↺ Reprint Last</button>
        </div>
      </div>

    </div>
  )
}
