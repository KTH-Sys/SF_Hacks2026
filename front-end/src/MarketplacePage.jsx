import { useCallback, useEffect, useRef, useState } from 'react'
import './MarketplacePage.css'

function MarketplacePage({
  visibleListings,
  onConsumeSwipe,
  chats,
  listings,
  activeChatId,
  setActiveChatId,
  activeChat,
  activeMessages,
  userName,
  currentUserId,
  myInventory,
  chatInput,
  setChatInput,
  sendChatMessage,
  onOpenProfile,
  onOpenMembershipPlans,
  onOpenBoostPaymentDetails,
  onOpenSwipe,
  onOpenCreatePost,
  userPlan,
  swipesUsed,
  freeSwipeLimit,
  deckListings,
  onSwipe,
  onConfirmTrade,
  onCancelMatch,
}) {
  const [currentSwipeIndex, setCurrentSwipeIndex] = useState(0)
  const [swipeStatusMessage, setSwipeStatusMessage] = useState(
    'Swipe left or right to discover your next trade.',
  )
  const [showChoiceOverlay, setShowChoiceOverlay] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const dragStartXRef = useRef(null)
  const wheelDeltaXRef = useRef(0)
  const lastWheelSwipeAtRef = useRef(0)

  const swipeSource = visibleListings.length ? visibleListings : deckListings
  const swipeListings = swipeSource.filter((listing) => listing.owner !== userName)
  const currentSwipeListing = swipeListings[currentSwipeIndex % Math.max(swipeListings.length, 1)]
  const freeLimitReached = userPlan === 'free' && swipesUsed >= freeSwipeLimit

  useEffect(() => {
    if (!swipeListings.length) {
      setCurrentSwipeIndex(0)
      return
    }
    setCurrentSwipeIndex((prev) => prev % swipeListings.length)
  }, [swipeListings])

  const swipeLeft = useCallback(() => {
    if (!currentSwipeListing) {
      setSwipeStatusMessage('No listings available right now.')
      return
    }
    if (freeLimitReached || showChoiceOverlay) {
      setSwipeStatusMessage('Free plan limit reached: 10 swipes. Upgrade to Pro for unlimited swipes.')
      return
    }
    onConsumeSwipe()
    onSwipe(currentSwipeListing, 'left')
    setCurrentSwipeIndex((prev) => prev + 1)
    setSwipeStatusMessage('Skipped. Next listing loaded.')
  }, [currentSwipeListing, freeLimitReached, onConsumeSwipe, onSwipe, showChoiceOverlay])

  const swipeRight = useCallback(() => {
    if (!currentSwipeListing) {
      setSwipeStatusMessage('No listings available right now.')
      return
    }
    if (freeLimitReached || showChoiceOverlay) {
      setSwipeStatusMessage('Free plan limit reached: 10 swipes. Upgrade to Pro for unlimited swipes.')
      return
    }
    onConsumeSwipe()
    setShowChoiceOverlay(true)
    setSwipeStatusMessage('Nice choice!')

    onSwipe(currentSwipeListing, 'right').then((result) => {
      if (result?.match_created) {
        setSwipeStatusMessage('It\'s a match! Check your chats.')
      }
    })

    window.setTimeout(() => {
      setShowChoiceOverlay(false)
      setCurrentSwipeIndex((prev) => prev + 1)
    }, 560)
  }, [currentSwipeListing, freeLimitReached, onConsumeSwipe, onSwipe, showChoiceOverlay])

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

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="trade-app">
      <header className="hero">
        <div className="hero-top">
          <p className="eyebrow">Barter</p>
          <div className="hero-actions">
            <div className="profile-row">
              <div className="profile-links">
                <button className="upgrade-link-button" type="button" onClick={onOpenMembershipPlans}>
                  {userPlan === 'pro' ? '💎 View Plan' : '💎 Upgrade to Pro'}
                </button>
                <button
                  className="upgrade-link-button boost-post-link"
                  type="button"
                  onClick={onOpenBoostPaymentDetails || onOpenMembershipPlans}
                >
                  ✨ Boost Post
                </button>
              </div>
              <button className="profile-button" type="button" onClick={onOpenProfile}>
                <span className="profile-avatar" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3.87 0-7 2.01-7 4.5V20h14v-1.5c0-2.49-3.13-4.5-7-4.5z" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
        <h1>Exchange products with people nearby</h1>
        <p>
          List what you have, show what you want, and negotiate directly through chat before
          meeting.
        </p>
      </header>

      <main className="layout">
        <section className="marketplace panel">
          <div className="panel-header">
            <h2>Available Trades</h2>
            <div className="market-top-actions">
              <button className="swap-mode-button" type="button" onClick={onOpenSwipe}>
                Swap Mode
              </button>
              {userPlan === 'free' ? (
                <p className="swipe-counter">
                  {swipesUsed}/{freeSwipeLimit} swaps used
                </p>
              ) : (
                <p className="swipe-counter pro">Pro: unlimited swaps</p>
              )}
            </div>
          </div>

          <div className="market-swipe-shell">
            <button
              type="button"
              className="market-swipe-action no"
              onClick={swipeLeft}
              disabled={freeLimitReached || showChoiceOverlay || !currentSwipeListing}
              aria-label="Swipe left"
            >
              X
            </button>

            <section className="market-swipe-deck">
              <div className="deck-layer layer-back" />
              <div className="deck-layer layer-mid" />

              {currentSwipeListing ? (
                <article
                  className="market-swipe-card"
                  style={{ transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.02}deg)` }}
                  onPointerDown={onPointerDownCard}
                  onPointerMove={onPointerMoveCard}
                  onPointerUp={onPointerUpCard}
                  onPointerCancel={onPointerUpCard}
                  onPointerLeave={onPointerUpCard}
                >
                  <div className="market-swipe-image">
                    {currentSwipeListing.photo ? (
                      <img src={currentSwipeListing.photo} alt={currentSwipeListing.title} />
                    ) : (
                      <div
                        className="market-swipe-photo-fallback"
                        style={{ backgroundColor: currentSwipeListing.accent || '#73a942' }}
                      />
                    )}
                    <span>{currentSwipeListing.category}</span>
                    <div className={`choice-overlay ${showChoiceOverlay ? 'show' : ''}`}>Nice choice</div>
                  </div>
                  <div className="market-swipe-info">
                    <h3>{currentSwipeListing.title}</h3>
                    <p>
                      <strong>Price:</strong> $ {Number(currentSwipeListing.price || 0).toFixed(2)}
                    </p>
                    <p>
                      <strong>Owner:</strong> {currentSwipeListing.owner}
                    </p>
                    <p>{currentSwipeListing.location}</p>
                  </div>
                </article>
              ) : (
                <div className="market-swipe-empty">
                  {listings.length === 0
                    ? 'Create a listing first to start swiping!'
                    : 'No listings available right now.'}
                </div>
              )}
            </section>

            <button
              type="button"
              className="market-swipe-action yes"
              onClick={swipeRight}
              disabled={freeLimitReached || showChoiceOverlay || !currentSwipeListing}
              aria-label="Swipe right"
            >
              ✓
            </button>
          </div>
          <p className={`market-swipe-status ${freeLimitReached ? 'limit' : ''}`}>{swipeStatusMessage}</p>
        </section>

        <section className="chat panel">
          <div className="chat-sidebar">
            <h2>Chats</h2>
            <ul>
              {chats.length === 0 && (
                <li className="chat-empty-note">No matches yet. Swipe right to match!</li>
              )}
              {chats.map((chat) => (
                <li key={chat.id}>
                  <button
                    className={`chat-thread ${activeChatId === chat.id ? 'selected' : ''}`}
                    onClick={() => setActiveChatId(chat.id)}
                    type="button"
                  >
                    <span>{chat.peer}</span>
                    <small>{chat.listingTitle}</small>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="chat-main">
            {activeChat ? (
              <>
                <div className="chat-header">
                  <h3>Trade with {activeChat.peer}</h3>
                  <p>{activeChat.listingTitle}</p>
                  {activeChat.matchStatus === 'active' && (
                    <div className="chat-trade-actions">
                      <button type="button" className="confirm-trade-btn" onClick={() => onConfirmTrade(activeChat.id)}>
                        Confirm Trade
                      </button>
                      <button type="button" className="cancel-trade-btn" onClick={() => onCancelMatch(activeChat.id)}>
                        Cancel
                      </button>
                    </div>
                  )}
                  {activeChat.matchStatus === 'confirmed' && (
                    <p className="trade-confirmed-badge">Trade Confirmed!</p>
                  )}
                </div>

                <div className="messages">
                  {activeMessages.map((message) => (
                    <div className={`message ${message.sender_id === currentUserId ? 'mine' : ''}`} key={message.id}>
                      <p>{message.content}</p>
                      <small>
                        {message.sender_name} · {formatTime(message.created_at)}
                      </small>
                    </div>
                  ))}
                  {activeMessages.length === 0 && (
                    <p className="chat-empty-note">No messages yet. Say hello!</p>
                  )}
                </div>

                <form className="chat-input" onSubmit={sendChatMessage}>
                  <input
                    type="text"
                    placeholder="Write a message"
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                  />
                  <button type="submit">Send</button>
                </form>
              </>
            ) : (
              <p className="chat-empty-note">
                {chats.length > 0 ? 'Select a chat to start messaging.' : 'Match with someone to start chatting!'}
              </p>
            )}
          </div>
        </section>
      </main>

      <button className="create-post-fab" type="button" onClick={onOpenCreatePost} aria-label="Create post">
        +
      </button>
    </div>
  )
}

export default MarketplacePage
