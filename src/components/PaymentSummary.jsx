import { useState, useRef } from 'react'
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
  const [showAddrDrop, setShowAddrDrop] = useState(false)
  const lookupTimer = useRef(null)

  const subtotal = getSubtotal()
  const discount = getTotalDiscount()
  const gst = getTotalGST()
  const grand = getGrandTotal()
  const gstEnabled = settings?.gst_enabled === 'true'

  const fmt = (n) => `₹${Math.abs(n).toFixed(2)}`

  // Phone change → debounced customer lookup
  const handlePhoneChange = (e) => {
    const phone = e.target.value
    setCustomer('customerPhone', phone)
    clearTimeout(lookupTimer.current)
    if (phone.trim().length >= 7) {
      lookupTimer.current = setTimeout(async () => {
        try {
          const data = await window.api.getCustomerByPhone(phone)
          if (data) {
            if (!customerName.trim() && data.name) setCustomer('customerName', data.name)
            setSavedAddresses(data.addresses || [])
            if (data.addresses?.length > 0) setShowAddrDrop(true)
          } else {
            setSavedAddresses([])
          }
        } catch (_) {}
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

  return (
    <div className="bright">
      {/* Customer Details */}
      <div className="rsec">
        <h4>
          Customer Details
          <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--muted)', marginLeft: 6 }}>
            (name or phone required)
          </span>
        </h4>
        <div className="cfield">
          <label>Name</label>
          <input
            type="text"
            placeholder="Customer name"
            value={customerName}
            onChange={e => setCustomer('customerName', e.target.value)}
          />
        </div>
        <div className="cfield" style={{ position: 'relative' }}>
          <label>Phone</label>
          <input
            type="tel"
            placeholder="Mobile number"
            value={customerPhone}
            onChange={handlePhoneChange}
            onFocus={() => savedAddresses.length > 0 && setShowAddrDrop(true)}
          />
          {/* Saved address suggestions */}
          {showAddrDrop && savedAddresses.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              background: '#fff', border: '1px solid var(--border)', borderRadius: 6,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)', overflow: 'hidden',
            }}>
              <div style={{ padding: '5px 10px', fontSize: 10, fontWeight: 700, color: 'var(--muted)', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                SAVED ADDRESSES
              </div>
              {savedAddresses.map((addr, i) => (
                <div
                  key={i}
                  onClick={() => selectAddress(addr)}
                  style={{
                    padding: '7px 10px', fontSize: 12, cursor: 'pointer',
                    borderBottom: i < savedAddresses.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-lt)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  📍 {addr}
                </div>
              ))}
              <div
                onClick={() => setShowAddrDrop(false)}
                style={{ padding: '5px 10px', fontSize: 11, color: 'var(--muted)', cursor: 'pointer', textAlign: 'center' }}
              >
                Close
              </div>
            </div>
          )}
        </div>
        {(orderType === 'delivery' || customerAddress) && (
          <div className="cfield">
            <label>Address {orderType === 'delivery' ? '*' : ''}</label>
            <input
              type="text"
              placeholder="Delivery address"
              value={customerAddress}
              onChange={e => setCustomer('customerAddress', e.target.value)}
              onFocus={() => savedAddresses.length > 0 && setShowAddrDrop(true)}
            />
          </div>
        )}
      </div>

      {/* Payment Summary */}
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

      {/* Action Buttons */}
      <div className="ract">
        <button
          className="btn-billed"
          onClick={onBill}
          disabled={items.length === 0}
        >
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
