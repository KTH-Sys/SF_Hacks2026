import { useState } from 'react'
import './PaymentDetailsModal.css'

function PaymentDetailsModal({
  open,
  title = 'Payment Details',
  planLabel = 'Plan',
  planPrice,
  submitLabel = 'Pay and Upgrade',
  onClose,
  onConfirm,
}) {
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [cvv, setCvv] = useState('')
  const [zipCode, setZipCode] = useState('')

  if (!open) {
    return null
  }

  const submitPayment = (event) => {
    event.preventDefault()
    onConfirm({ cardName, cardNumber, expiryDate, cvv, zipCode })
  }

  return (
    <div className="payment-overlay" role="dialog" aria-modal="true" aria-label="Payment details">
      <section className="payment-modal">
        <div className="payment-modal-header">
          <h3>{title}</h3>
          <button type="button" className="payment-close" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="payment-price">
          {planLabel}: {planPrice}
        </p>

        <form className="payment-form" onSubmit={submitPayment}>
          <label>
            Cardholder Name
            <input
              type="text"
              value={cardName}
              onChange={(event) => setCardName(event.target.value)}
              required
            />
          </label>

          <label>
            Card Number
            <input
              type="text"
              inputMode="numeric"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={(event) => setCardNumber(event.target.value)}
              required
            />
          </label>

          <div className="payment-grid">
            <label>
              Expiry
              <input
                type="text"
                placeholder="MM/YY"
                value={expiryDate}
                onChange={(event) => setExpiryDate(event.target.value)}
                required
              />
            </label>

            <label>
              CVV
              <input
                type="password"
                inputMode="numeric"
                placeholder="123"
                value={cvv}
                onChange={(event) => setCvv(event.target.value)}
                required
              />
            </label>

            <label>
              ZIP Code
              <input
                type="text"
                inputMode="numeric"
                placeholder="94103"
                value={zipCode}
                onChange={(event) => setZipCode(event.target.value)}
                required
              />
            </label>
          </div>

          <button type="submit" className="payment-submit">
            {submitLabel}
          </button>
        </form>
      </section>
    </div>
  )
}

export default PaymentDetailsModal
