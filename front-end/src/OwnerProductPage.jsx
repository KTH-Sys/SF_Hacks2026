import './OwnerProductPage.css'

function OwnerProductPage({ product, onBackToSwipe, onBackToMarketplace }) {
  if (!product) {
    return (
      <div className="owner-page-wrap">
        <section className="owner-page-card">
          <h1>No product selected</h1>
          <p>Go back to swipe mode and choose a product first.</p>
          <button type="button" onClick={onBackToSwipe}>
            Back to Swipe Mode
          </button>
        </section>
      </div>
    )
  }

  const imageUrl = product.photo || product.image || ''

  return (
    <div className="owner-page-wrap">
      <section className="owner-page-card">
        <div className="owner-actions">
          <button type="button" onClick={onBackToSwipe}>
            Back to Swipe
          </button>
          <button type="button" onClick={onBackToMarketplace}>
            Back to Marketplace
          </button>
        </div>

        <div className="owner-layout">
          <div
            className="owner-image"
            style={{
              backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
              backgroundColor: imageUrl ? 'transparent' : (product.accent || '#73a942'),
            }}
          />

          <div className="owner-details">
            <p className="owner-tag">Matched Product</p>
            <h1>{product.title}</h1>
            <p>
              <strong>Owner:</strong> {product.owner}
            </p>
            <p>{product.description}</p>
            <p>
              <strong>Price:</strong> ${Number(product.price || 0).toFixed(2)}
            </p>
            <p>
              <strong>Category:</strong> {product.category}
            </p>
            <p>
              <strong>Condition:</strong> {product.condition}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default OwnerProductPage
