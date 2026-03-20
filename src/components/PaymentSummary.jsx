import { useState } from 'react'
import { useOrderStore } from '../store/orderStore'

export default function PaymentSummary({ settings, onBill, onHold, onClear, onReprint, onPrintBill }) {
  const {
    orderType, setOrderType,
    customerName, customerPhone, customerAddress,
    setCustomer,
    getSubtotal, getTotalDiscount, getTotalGST, getGrandTotal,
    items,
  } = useOrderStore()

  const subtotal = getSubtotal()
  const discount = getTotalDiscount()
  const gst = getTotalGST()
  const grand = getGrandTotal()
  const gstEnabled = settings?.gst_enabled === 'true'

  const fmt = (n) => `₹${Math.abs(n).toFixed(2)}`

  return (
    <div className="bright">
      {/* Customer Details */}
      <div className="rsec">
        <h4>Customer Details</h4>
        <div className="cfield">
          <label>Name *</label>
          <input
            type="text"
            placeholder="Customer name"
            value={customerName}
            onChange={e => setCustomer('customerName', e.target.value)}
          />
        </div>
        <div className="cfield">
          <label>Phone</label>
          <input
            type="tel"
            placeholder="Mobile number"
            value={customerPhone}
            onChange={e => setCustomer('customerPhone', e.target.value)}
          />
        </div>
        {orderType === 'delivery' && (
          <div className="cfield">
            <label>Address *</label>
            <input
              type="text"
              placeholder="Delivery address"
              value={customerAddress}
              onChange={e => setCustomer('customerAddress', e.target.value)}
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
          <button className="sbtn" onClick={onPrintBill}>🖨 Print Bill</button>
          <button className="sbtn" onClick={onHold} disabled={items.length === 0}>⏸ Hold Order</button>
        </div>
        <div className="sacts">
          <button className="sbtn" onClick={onClear}>✕ Clear</button>
          <button className="sbtn" onClick={onReprint}>↺ Reprint</button>
        </div>
      </div>
    </div>
  )
}
