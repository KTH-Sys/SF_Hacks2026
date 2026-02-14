import { useCallback, useEffect, useRef, useState } from 'react'
import './SwipePage.css'

function SwipePage({
  userPlan,
  swipesUsed,
  freeSwipeLimit,
  onConsumeSwipe,
  onBackToMarketplace,
  onSelectProduct,
  deckListings,
  onSwipe,
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [statusMessage, setStatusMessage] = useState('Swipe left or right to discover your next swap.')
  const [showChoiceOverlay, setShowChoiceOverlay] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const dragStartXRef = useRef(null)
  const wheelDeltaXRef = useRef(0)
  const lastWheelSwipeAtRef = useRef(0)

  const products = deckListings || []
  const currentProduct = products[currentIndex % Math.max(products.length, 1)]
  const freeLimitReached = userPlan === 'free' && swipesUsed >= freeSwipeLimit

  const swipeLeft = useCallback(() => {
    if (!currentProduct || freeLimitReached || showChoiceOverlay) {
      if (freeLimitReached) setStatusMessage('Free plan limit reached: 10 swipes. Upgrade to Pro for unlimited swipes.')
      return
    }
    onConsumeSwipe()
    onSwipe(currentProduct, 'left')
    setCurrentIndex((prev) => prev + 1)
    setStatusMessage('Skipped. Next product loaded.')
  }, [currentProduct, freeLimitReached, onConsumeSwipe, onSwipe, showChoiceOverlay])

  const swipeRight = useCallback(() => {
    if (!currentProduct || freeLimitReached || showChoiceOverlay) {
      if (freeLimitReached) setStatusMessage('Free plan limit reached: 10 swipes. Upgrade to Pro for unlimited swipes.')
      return
    }
    onConsumeSwipe()
    setShowChoiceOverlay(true)
    setStatusMessage('Nice choice. Opening product details...')

    onSwipe(currentProduct, 'right')

    window.setTimeout(() => {
      setShowChoiceOverlay(false)
      onSelectProduct(currentProduct)
      setCurrentIndex((prev) => prev + 1)
    }, 820)
  }, [currentProduct, freeLimitReached, onConsumeSwipe, onSelectProduct, onSwipe, showChoiceOverlay])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'ArrowLeft') swipeLeft()
      if (event.key === 'ArrowRight') swipeRight()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [swipeLeft, swipeRight])

  useEffect(() => {
    const onWheel = (event) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
      const now = Date.now()
      if (now - lastWheelSwipeAtRef.current < 320) return
      wheelDeltaXRef.current += event.deltaX
      const threshold = 60
      if (wheelDeltaXRef.current >= threshold) {
        swipeRight()
        wheelDeltaXRef.current = 0
        lastWheelSwipeAtRef.current = now
      } else if (wheelDeltaXRef.current <= -threshold) {
        swipeLeft()
        wheelDeltaXRef.current = 0
        lastWheelSwipeAtRef.current = now
      }
    }
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => window.removeEventListener('wheel', onWheel)
  }, [swipeLeft, swipeRight])

  const onPointerDownCard = (event) => {
    if (freeLimitReached || showChoiceOverlay) return
    dragStartXRef.current = event.clientX
  }

  const onPointerMoveCard = (event) => {
    if (dragStartXRef.current === null) return
    setDragOffset(event.clientX - dragStartXRef.current)
  }

  const onPointerUpCard = () => {
    const threshold = 90
    if (dragOffset >= threshold) swipeRight()
    else if (dragOffset <= -threshold) swipeLeft()
    dragStartXRef.current = null
    setDragOffset(0)
  }

  return (
    <div className="swipe-page-wrap">
      <header className="swipe-header">
        <button type="button" onClick={onBackToMarketplace}>
          Back to Marketplace
        </button>
        <h1>Swap Match</h1>
        <p>
          {userPlan === 'free'
            ? `${swipesUsed}/${freeSwipeLimit} swipes used (Free)`
            : `${swipesUsed} swipes used (Pro Unlimited)`}
        </p>
      </header>

      <main className="swipe-main">
        <button
          type="button"
          className="swipe-action no"
          onClick={swipeLeft}
          disabled={freeLimitReached || showChoiceOverlay || !currentProduct}
          aria-label="Swipe left"
        >
          X
        </button>

        <section className="swipe-deck">
          <div className="deck-layer layer-back" />
          <div className="deck-layer layer-mid" />

          {currentProduct ? (
            <article
              className="swipe-card"
              style={{ transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.02}deg)` }}
              onPointerDown={onPointerDownCard}
              onPointerMove={onPointerMoveCard}
              onPointerUp={onPointerUpCard}
              onPointerCancel={onPointerUpCard}
              onPointerLeave={onPointerUpCard}
            >
              <div
                className="swipe-image"
                style={{
                  backgroundImage: currentProduct.photo ? `url(${currentProduct.photo})` : 'none',
                  backgroundColor: currentProduct.photo ? 'transparent' : (currentProduct.accent || '#73a942'),
                }}
              >
                <div className={`choice-overlay ${showChoiceOverlay ? 'show' : ''}`}>Nice choice</div>
              </div>

              <div className="swipe-info">
                <h2>{currentProduct.title}</h2>
                <p>
                  <strong>Owner:</strong> {currentProduct.owner}
                </p>
                <p>{currentProduct.description}</p>
                <p>
                  <strong>Price:</strong> ${Number(currentProduct.price || 0).toFixed(2)}
                </p>
              </div>
            </article>
          ) : (
            <div className="swipe-card swipe-empty">
              <p>No products available. Create a listing first!</p>
            </div>
          )}
        </section>

        <button
          type="button"
          className="swipe-action yes"
          onClick={swipeRight}
          disabled={freeLimitReached || showChoiceOverlay || !currentProduct}
          aria-label="Swipe right"
        >
          ✓
        </button>
      </main>

      <p className={`swipe-status ${freeLimitReached ? 'limit' : ''}`}>{statusMessage}</p>
    </div>
  )
}

export default SwipePage
