export default function ReceiptModal({ receiptData, onClose, onPrint }) {
  if (!receiptData) return null

  const {
    orderNumber, orderType, customerName, customerPhone,
    items, subtotal, discount, gst, grandTotal,
    settings, billedAt,
  } = receiptData

  const storeName = settings?.store_name || 'Pizza Diet'
  const storeAddress = settings?.store_address || ''
  const storePhone = settings?.store_phone || ''
  const storeGstin = settings?.store_gstin || ''
  const gstEnabled = settings?.gst_enabled === 'true'

  const now = billedAt ? new Date(billedAt) : new Date()
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const typeLabel = { dine: 'Dine-In', takeaway: 'Takeaway', delivery: 'Home Delivery' }[orderType] || orderType

  const line = '================================'
  const dline = '--------------------------------'

  return (
    <div className="rmodal-bg open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ position: 'relative' }}>
        <div className="receipt" id="receipt-content">
          <button className="rclosebtn" onClick={onClose}>×</button>

          <div className="rctr" style={{ marginBottom: 4 }}>
            <div className="rb" style={{ fontSize: 14 }}>🍕 {storeName}</div>
            {storeAddress && <div style={{ fontSize: 11 }}>{storeAddress}</div>}
            {storePhone && <div style={{ fontSize: 11 }}>Ph: {storePhone}</div>}
            {storeGstin && <div style={{ fontSize: 11 }}>GSTIN: {storeGstin}</div>}
          </div>

          <div style={{ borderTop: '1px dashed #999', margin: '7px 0' }} />

          <div className="rrow">
            <span className="rb">Bill: {orderNumber}</span>
            <span>{timeStr}</span>
          </div>
          <div className="rrow">
            <span>Date: {dateStr}</span>
            <span>{typeLabel}</span>
          </div>
          {customerName && (
            <div style={{ fontSize: 11, marginTop: 3 }}>
              Customer: {customerName}{customerPhone ? ` | ${customerPhone}` : ''}
            </div>
          )}

          <div style={{ borderTop: '1px dashed #999', margin: '7px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 11 }}>
            <span>Item</span>
            <span>Amt</span>
          </div>
          <div style={{ borderTop: '1px solid #ccc', margin: '4px 0' }} />

          {items.map((item, i) => {
            const total = item.unitPrice * item.qty * (1 - (item.discountPct || 0) / 100)
            return (
              <div key={i} style={{ marginBottom: 6 }}>
                <div className="rrow">
                  <span>
                    {item.name}{item.variantName ? ` (${item.variantName})` : ''} ×{item.qty}
                  </span>
                  <span className="rb">₹{total.toFixed(2)}</span>
                </div>
                {item.addons && item.addons.length > 0 && (
                  <div style={{ fontSize: 10, paddingLeft: 8, color: '#555' }}>
                    + {item.addons.map(a => a.name).join(', ')}
                  </div>
                )}
                {item.specialNote && (
                  <div style={{ fontSize: 10, paddingLeft: 8, fontStyle: 'italic', color: '#555' }}>
                    * {item.specialNote}
                  </div>
                )}
              </div>
            )
          })}

          <div style={{ borderTop: '1px dashed #999', margin: '7px 0' }} />

          <div className="rrow">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="rrow">
              <span>Discount</span>
              <span>-₹{discount.toFixed(2)}</span>
            </div>
          )}
          {gstEnabled && gst > 0 && (
            <div className="rrow">
              <span>GST</span>
              <span>₹{gst.toFixed(2)}</span>
            </div>
          )}

          <div style={{ borderTop: '2px solid #111', margin: '7px 0' }} />
          <div className="rrow rb" style={{ fontSize: 16 }}>
            <span>TOTAL</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </div>
          <div style={{ borderTop: '2px solid #111', margin: '7px 0' }} />

          <div className="rctr" style={{ marginTop: 10, fontSize: 11 }}>
            <div>Thank you! Visit Again</div>
            <div className="rb">🍕 {storeName}</div>
          </div>
        </div>

        <div className="rbtns" style={{ width: 285 }}>
          <button className="rbprint" onClick={onPrint}>🖨 Print</button>
          <button className="rbclose" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
