import { useState } from 'react'

export default function ReceiptModal({ receiptData, onClose, onPrint, onPrintKitchen }) {
  const [view, setView] = useState('customer')   // 'customer' | 'kitchen'

  if (!receiptData) return null

  const {
    orderNumber, orderType, customerName, customerPhone, customerAddress,
    items, subtotal, discount, gst, grandTotal,
    settings, billedAt,
  } = receiptData

  const storeName   = settings?.store_name  || 'Pizza Diet'
  const storeAddr   = settings?.store_address || ''
  const storePhone  = settings?.store_phone  || ''
  const storeGstin  = settings?.store_gstin  || ''
  const gstEnabled  = settings?.gst_enabled === 'true'

  const now      = billedAt ? new Date(billedAt) : new Date()
  const timeStr  = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const dateStr  = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const typeLabel = { dine: 'Dine-In', takeaway: 'Takeaway', delivery: 'Home Delivery' }[orderType] || orderType

  const isKitchen = view === 'kitchen'

  return (
    <div className="rmodal-bg open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ position: 'relative' }}>
        {/* View toggle */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 8, justifyContent: 'center',
        }}>
          <button
            onClick={() => setView('customer')}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: '1px solid var(--border)', cursor: 'pointer',
              background: !isKitchen ? 'var(--accent)' : '#fff',
              color: !isKitchen ? '#fff' : 'var(--text)',
            }}
          >
            🧾 Customer Bill
          </button>
          <button
            onClick={() => setView('kitchen')}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: '1px solid var(--border)', cursor: 'pointer',
              background: isKitchen ? '#e85d04' : '#fff',
              color: isKitchen ? '#fff' : 'var(--text)',
            }}
          >
            👨‍🍳 Kitchen Print
          </button>
        </div>

        {/* CUSTOMER RECEIPT */}
        {!isKitchen && (
          <div className="receipt" id="receipt-content">
            <button className="rclosebtn" onClick={onClose}>×</button>

            <div className="rctr" style={{ marginBottom: 4 }}>
              <div className="rb" style={{ fontSize: 14 }}>🍕 {storeName}</div>
              {storeAddr   && <div style={{ fontSize: 11 }}>{storeAddr}</div>}
              {storePhone  && <div style={{ fontSize: 11 }}>Ph: {storePhone}</div>}
              {storeGstin  && <div style={{ fontSize: 12, fontWeight: 700 }}>GSTIN: {storeGstin}</div>}
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
            {(customerName || customerPhone) && (
              <div style={{ fontSize: 11, marginTop: 3 }}>
                {customerName && <span>Customer: {customerName}</span>}
                {customerPhone && <span>{customerName ? ' | ' : 'Phone: '}{customerPhone}</span>}
              </div>
            )}
            {customerAddress && orderType === 'delivery' && (
              <div style={{ fontSize: 11, color: '#555' }}>Addr: {customerAddress}</div>
            )}

            <div style={{ borderTop: '1px dashed #999', margin: '7px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 11 }}>
              <span>Item</span><span>Amt</span>
            </div>
            <div style={{ borderTop: '1px solid #ccc', margin: '4px 0' }} />

            {items.map((item, i) => {
              const total = item.unitPrice * item.qty * (1 - (item.discountPct || 0) / 100)
              return (
                <div key={i} style={{ marginBottom: 6 }}>
                  <div className="rrow">
                    <span>{item.name}{item.variantName ? ` (${item.variantName})` : ''} ×{item.qty}</span>
                    <span className="rb">₹{total.toFixed(2)}</span>
                  </div>
                  {item.addons?.length > 0 && (
                    <div style={{ fontSize: 10, paddingLeft: 8, color: '#555' }}>+ {item.addons.map(a => a.name).join(', ')}</div>
                  )}
                  {item.specialNote && (
                    <div style={{ fontSize: 10, paddingLeft: 8, fontStyle: 'italic', color: '#555' }}>* {item.specialNote}</div>
                  )}
                </div>
              )
            })}

            <div style={{ borderTop: '1px dashed #999', margin: '7px 0' }} />
            <div className="rrow"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
            {discount > 0 && <div className="rrow"><span>Discount</span><span>-₹{discount.toFixed(2)}</span></div>}
            {gstEnabled && gst > 0 && <div className="rrow"><span>GST</span><span>₹{gst.toFixed(2)}</span></div>}
            {storeGstin && gstEnabled && gst > 0 && (
              <div style={{ fontSize: 9, color: '#777', textAlign: 'right' }}>GSTIN: {storeGstin}</div>
            )}

            <div style={{ borderTop: '2px solid #111', margin: '7px 0' }} />
            <div className="rrow rb" style={{ fontSize: 16 }}>
              <span>TOTAL</span><span>₹{grandTotal.toFixed(2)}</span>
            </div>
            <div style={{ borderTop: '2px solid #111', margin: '7px 0' }} />

            <div className="rctr" style={{ marginTop: 10, fontSize: 11 }}>
              <div>Thank you! Visit Again</div>
              <div className="rb">🍕 {storeName}</div>
            </div>
          </div>
        )}

        {/* KITCHEN RECEIPT */}
        {isKitchen && (
          <div className="receipt" id="receipt-content" style={{ fontFamily: 'monospace' }}>
            <button className="rclosebtn" onClick={onClose}>×</button>

            <div className="rctr" style={{ marginBottom: 4 }}>
              <div className="rb" style={{ fontSize: 13, letterSpacing: 1 }}>★ KITCHEN ORDER ★</div>
              <div style={{ fontSize: 11 }}>🍕 {storeName}</div>
            </div>

            <div style={{ borderTop: '2px solid #111', margin: '7px 0' }} />
            <div className="rrow">
              <span className="rb" style={{ fontSize: 13 }}>Bill: {orderNumber}</span>
              <span className="rb">{timeStr}</span>
            </div>
            <div className="rrow">
              <span style={{ fontWeight: 700 }}>{typeLabel.toUpperCase()}</span>
              <span style={{ fontSize: 11 }}>{dateStr}</span>
            </div>
            {(customerName || customerPhone) && (
              <div style={{ fontSize: 11, marginTop: 3, fontWeight: 600 }}>
                {customerName && <span>{customerName}</span>}
                {customerPhone && <span>{customerName ? ' | ' : ''}{customerPhone}</span>}
              </div>
            )}
            {customerAddress && orderType === 'delivery' && (
              <div style={{ fontSize: 10, color: '#555' }}>📍 {customerAddress}</div>
            )}

            <div style={{ borderTop: '2px solid #111', margin: '7px 0' }} />

            {items.map((item, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>
                  {item.qty}×  {item.name}{item.variantName ? ` (${item.variantName})` : ''}
                </div>
                {item.addons?.length > 0 && (
                  <div style={{ fontSize: 11, paddingLeft: 20, color: '#333' }}>
                    + {item.addons.map(a => a.name).join(', ')}
                  </div>
                )}
                {item.specialNote && (
                  <div style={{ fontSize: 11, paddingLeft: 20, fontWeight: 700, color: '#c00' }}>
                    ⚠ {item.specialNote}
                  </div>
                )}
              </div>
            ))}

            <div style={{ borderTop: '2px solid #111', margin: '7px 0' }} />
            <div className="rctr" style={{ fontSize: 11, fontWeight: 700 }}>
              — PREPARE IMMEDIATELY —
            </div>
          </div>
        )}

        <div className="rbtns" style={{ width: 285 }}>
          {!isKitchen && (
            <button className="rbprint" onClick={onPrint}>🖨 Print Customer Bill</button>
          )}
          {isKitchen && (
            <button className="rbprint" style={{ background: '#e85d04' }} onClick={onPrintKitchen}>
              👨‍🍳 Print Kitchen Order
            </button>
          )}
          <button className="rbclose" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
