import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AuthPage from './AuthPage'
import MarketplacePage from './MarketplacePage'
import UserProfilePage from './UserProfilePage'
import SwipePage from './SwipePage'
import OwnerProductPage from './OwnerProductPage'
import CreatePostPage from './CreatePostPage'
import * as api from './api'

function App() {
  const freeSwipeLimit = 10
  const [darkModeOn, setDarkModeOn] = useState(() => localStorage.getItem('darkMode') === 'on')
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [authMode, setAuthMode] = useState('signin')
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authLocation, setAuthLocation] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // User state (from backend)
  const [currentUser, setCurrentUser] = useState(null)
  const [userName, setUserName] = useState('You')
  const [userEmail, setUserEmail] = useState('')
  const [userLocation, setUserLocation] = useState('')
  const [userPlan, setUserPlan] = useState('free')

  const [postsPaused, setPostsPaused] = useState(false)
  const [profileStartSection, setProfileStartSection] = useState('about')
  const [profileStartPaymentTarget, setProfileStartPaymentTarget] = useState(null)
  const [activePage, setActivePage] = useState('marketplace')
  const [swipesUsed, setSwipesUsed] = useState(0)
  const [selectedSwipeProduct, setSelectedSwipeProduct] = useState(null)

  // Listings
  const [listings, setListings] = useState([])
  const [deckListings, setDeckListings] = useState([])

  // Chat / Matches
  const [matches, setMatches] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)
  const [chatMessages, setChatMessages] = useState({})
  const [chatInput, setChatInput] = useState('')
  const wsConnectionRef = useRef(null)
  const wsReconnectTimerRef = useRef(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [showMatchPopup, setShowMatchPopup] = useState(false)
  const matchPopupTimerRef = useRef(null)
  const seenMatchIdsRef = useRef(new Set())
  const hasLoadedMatchesRef = useRef(false)

  // Search / filter
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const triggerMatchPopup = useCallback(() => {
    setShowMatchPopup(true)
    if (matchPopupTimerRef.current) {
      window.clearTimeout(matchPopupTimerRef.current)
    }
    matchPopupTimerRef.current = window.setTimeout(() => {
      setShowMatchPopup(false)
    }, 3000)
  }, [])

  const dismissMatchPopup = useCallback(() => {
    if (matchPopupTimerRef.current) {
      window.clearTimeout(matchPopupTimerRef.current)
      matchPopupTimerRef.current = null
    }
    setShowMatchPopup(false)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', darkModeOn)
    localStorage.setItem('darkMode', darkModeOn ? 'on' : 'off')
  }, [darkModeOn])

  useEffect(() => {
    return () => {
      if (matchPopupTimerRef.current) {
        window.clearTimeout(matchPopupTimerRef.current)
      }
      if (wsReconnectTimerRef.current) {
        window.clearTimeout(wsReconnectTimerRef.current)
      }
      if (wsConnectionRef.current) {
        wsConnectionRef.current.close()
        wsConnectionRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!showMatchPopup) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') dismissMatchPopup()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dismissMatchPopup, showMatchPopup])

  // ── Restore session on mount ──────────────────────────────────────────────
  useEffect(() => {
    const token = api.getToken()
    if (!token) return
    api.getMe()
      .then((user) => {
        setCurrentUser(user)
        setUserName(user.display_name || 'You')
        setUserEmail(user.email)
        setUserLocation(user.city || '')
        setIsSignedIn(true)
      })
      .catch(() => {
        api.clearToken()
      })
  }, [])

  // ── Load data when signed in ──────────────────────────────────────────────
  const loadMyListings = useCallback(async () => {
    try {
      const data = await api.getMyListings()
      setListings(data.map((l, i) => api.backendListingBasicToFrontend(l, i)))
    } catch {
      // ignore
    }
  }, [])

  const loadDeck = useCallback(async () => {
    try {
      const myListingsRaw = await api.getMyListings()
      if (myListingsRaw.length === 0) {
        setDeckListings([])
        return
      }
      const offeringId = myListingsRaw[0].id
      const deck = await api.getDeck(offeringId)
      setDeckListings(deck.map((l, i) => api.backendListingToFrontend(l, i)))
    } catch {
      // ignore
    }
  }, [])

  const loadMatches = useCallback(async () => {
    try {
      const data = await api.getMatches()
      const hasLoadedBefore = hasLoadedMatchesRef.current
      const hasNewMatch = data.some((m) => !seenMatchIdsRef.current.has(m.id))
      seenMatchIdsRef.current = new Set(data.map((m) => m.id))
      hasLoadedMatchesRef.current = true

      setMatches(data)
      if (data.length > 0 && !activeChatId) {
        setActiveChatId(data[0].id)
      }
      if (hasLoadedBefore && hasNewMatch) {
        triggerMatchPopup()
      }
    } catch {
      // ignore
    }
  }, [activeChatId, triggerMatchPopup])

  const appendChatMessage = useCallback((matchId, message) => {
    if (!message?.id) return
    setChatMessages((prev) => {
      const existing = prev[matchId] || []
      if (existing.some((m) => m.id === message.id)) return prev
      return {
        ...prev,
        [matchId]: [...existing, message],
      }
    })
  }, [])

  useEffect(() => {
    if (!isSignedIn) return
    loadMyListings()
    loadDeck()
    loadMatches()
  }, [isSignedIn, loadMyListings, loadDeck, loadMatches])

  // ── Load messages when active chat changes ────────────────────────────────
  useEffect(() => {
    if (!activeChatId || !isSignedIn) return

    let disposed = false
    let reconnectAttempt = 0

    const fetchMessages = async () => {
      try {
        const data = await api.getMessages(activeChatId)
        if (disposed) return
        setChatMessages((prev) => ({ ...prev, [activeChatId]: data.messages }))
      } catch {
        // ignore
      }
    }

    const connectWebSocket = () => {
      if (disposed) return
      const ws = api.createChatWebSocket(activeChatId)
      wsConnectionRef.current = ws

      ws.onopen = () => {
        if (disposed) return
        reconnectAttempt = 0
        setWsConnected(true)
      }

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (payload.event === 'new_message') {
            const message = payload.data
            const matchId = message?.match_id || activeChatId
            appendChatMessage(matchId, message)
          } else if (
            payload.event === 'trade_confirmed'
            || payload.event === 'match_cancelled'
            || payload.event === 'new_match'
            || payload.event === 'trade_confirmation_pending'
          ) {
            if (payload.event === 'new_match') {
              triggerMatchPopup()
            }
            loadMatches()
          }
        } catch {
          // ignore
        }
      }

      ws.onerror = () => {
        try {
          ws.close()
        } catch {
          // ignore
        }
      }

      ws.onclose = () => {
        if (disposed) return
        if (wsConnectionRef.current === ws) {
          wsConnectionRef.current = null
        }
        setWsConnected(false)
        const backoffMs = Math.min(3000, 500 * (2 ** reconnectAttempt))
        reconnectAttempt += 1
        wsReconnectTimerRef.current = window.setTimeout(connectWebSocket, backoffMs)
      }
    }

    fetchMessages()
    connectWebSocket()

    return () => {
      disposed = true
      setWsConnected(false)
      if (wsReconnectTimerRef.current) {
        window.clearTimeout(wsReconnectTimerRef.current)
        wsReconnectTimerRef.current = null
      }
      if (wsConnectionRef.current) {
        wsConnectionRef.current.close()
        wsConnectionRef.current = null
      }
    }
  }, [activeChatId, appendChatMessage, isSignedIn, loadMatches, triggerMatchPopup])

  // Poll active chat as fallback while WS is disconnected
  useEffect(() => {
    if (!activeChatId || !isSignedIn || wsConnected) return undefined
    const intervalId = window.setInterval(async () => {
      try {
        const data = await api.getMessages(activeChatId)
        setChatMessages((prev) => ({ ...prev, [activeChatId]: data.messages }))
      } catch {
        // ignore
      }
    }, 2000)
    return () => window.clearInterval(intervalId)
  }, [activeChatId, isSignedIn, wsConnected])

  // Keep UI in sync without manual refresh
  useEffect(() => {
    if (!isSignedIn) return undefined
    const intervalId = window.setInterval(() => {
      loadDeck()
      loadMatches()
    }, 2000)
    return () => window.clearInterval(intervalId)
  }, [isSignedIn, loadDeck, loadMatches])

  // ── Derived state ─────────────────────────────────────────────────────────
  const categories = useMemo(
    () => ['All', ...new Set(deckListings.map((l) => l.category))],
    [deckListings],
  )

  const visibleListings = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase()
    return deckListings.filter((listing) => {
      const categoryMatch = categoryFilter === 'All' || listing.category === categoryFilter
      const searchMatch =
        !normalized ||
        listing.title.toLowerCase().includes(normalized) ||
        listing.category.toLowerCase().includes(normalized) ||
        (listing.owner || '').toLowerCase().includes(normalized)
      return categoryMatch && searchMatch
    })
  }, [deckListings, categoryFilter, searchQuery])

  // Transform matches into chat-like objects
  const chats = useMemo(() => {
    if (!currentUser) return []
    return matches.map((match) => {
      const isUserA = match.user_a.id === currentUser.id
      const peer = isUserA ? match.user_b : match.user_a
      const theirListing = isUserA ? match.listing_b : match.listing_a
      return {
        id: match.id,
        peer: peer.display_name,
        peerId: peer.id,
        listingTitle: theirListing.title,
        matchStatus: match.status,
      }
    })
  }, [matches, currentUser])

  const activeChat = chats.find((c) => c.id === activeChatId)
  const activeMessages = chatMessages[activeChatId] || []

  const userPosts = useMemo(
    () => listings.filter((l) => l.userId === currentUser?.id),
    [listings, currentUser],
  )

  const userPostedItems = useMemo(
    () => [...new Set(userPosts.map((p) => p.title).filter(Boolean))],
    [userPosts],
  )

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const switchAuthMode = (mode) => {
    setAuthMode(mode)
    setAuthError('')
  }

  const handleSignIn = async (event) => {
    event.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    try {
      const data = await api.login(authEmail.trim(), authPassword)
      setCurrentUser(data.user)
      setUserName(data.user.display_name || 'You')
      setUserEmail(data.user.email)
      setUserLocation(data.user.city || '')
      setActivePage('marketplace')
      setIsSignedIn(true)
    } catch (err) {
      setAuthError(err.message || 'Login failed.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleCreateAccount = async (event) => {
    event.preventDefault()
    const name = authName.trim()
    const email = authEmail.trim()

    if (!name || !email || !authPassword) {
      setAuthError('Please fill in all fields.')
      return
    }
    if (authPassword.length < 6) {
      setAuthError('Password must be at least 6 characters.')
      return
    }
    if (authPassword !== confirmPassword) {
      setAuthError('Passwords do not match.')
      return
    }

    setAuthLoading(true)
    setAuthError('')
    try {
      const data = await api.register(email, authPassword, name)
      // Update location if provided
      if (authLocation.trim()) {
        await api.updateMe({ city: authLocation.trim() })
      }
      setCurrentUser(data.user)
      setUserName(data.user.display_name || name)
      setUserEmail(data.user.email)
      setUserLocation(authLocation.trim())
      setActivePage('marketplace')
      setIsSignedIn(true)
    } catch (err) {
      setAuthError(err.message || 'Registration failed.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignOut = () => {
    api.clearToken()
    setIsSignedIn(false)
    setCurrentUser(null)
    setListings([])
    setDeckListings([])
    setMatches([])
    setChatMessages({})
    setActiveChatId(null)
    setAuthEmail('')
    setAuthPassword('')
    setAuthName('')
    setAuthLocation('')
    setProfileStartPaymentTarget(null)
    dismissMatchPopup()
    seenMatchIdsRef.current = new Set()
    hasLoadedMatchesRef.current = false
    setWsConnected(false)
    if (wsReconnectTimerRef.current) {
      window.clearTimeout(wsReconnectTimerRef.current)
      wsReconnectTimerRef.current = null
    }
    if (wsConnectionRef.current) {
      wsConnectionRef.current.close()
      wsConnectionRef.current = null
    }
  }

  // ── Listing actions ───────────────────────────────────────────────────────
  const createListingPost = async (postData) => {
    try {
      await api.createListing({
        title: postData.title,
        description: postData.description,
        category: postData.category,
        condition: postData.condition,
        estimatedValue: postData.price || 50,
        images: postData.images || [],
      })
      await loadMyListings()
      await loadDeck()
      setCategoryFilter('All')
      setSearchQuery('')
      setActivePage('marketplace')
    } catch (err) {
      console.error('Failed to create listing:', err)
    }
  }

  const deleteUserPost = async (postId) => {
    try {
      await api.deleteListing(postId)
      await loadMyListings()
      await loadDeck()
    } catch (err) {
      console.error('Failed to delete listing:', err)
    }
  }

  const editUserPost = async (post) => {
    const nextTitle = window.prompt('Edit title', post.title || '')
    if (nextTitle === null) return

    const nextDescription = window.prompt('Edit description', post.description || '')
    if (nextDescription === null) return

    const priceDefault = Number(post.price || 0) > 0 ? String(post.price) : '50'
    const nextPriceRaw = window.prompt('Edit price', priceDefault)
    if (nextPriceRaw === null) return

    const nextPrice = Number(nextPriceRaw)
    if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
      window.alert('Price must be a positive number.')
      return
    }

    try {
      await api.updateListing(post.id, {
        title: nextTitle.trim() || post.title,
        description: nextDescription.trim(),
        estimatedValue: nextPrice,
      })
      await loadMyListings()
      await loadDeck()
    } catch (err) {
      console.error('Failed to edit listing:', err)
    }
  }

  // ── Swipe actions ─────────────────────────────────────────────────────────
  const handleSwipe = useCallback(async (targetListing, direction) => {
    try {
      const myListingsRaw = await api.getMyListings()
      if (myListingsRaw.length === 0) return null
      const result = await api.swipe(myListingsRaw[0].id, targetListing.backendId || targetListing.id, direction)
      if (result?.match_created) {
        triggerMatchPopup()
      }
      await Promise.all([loadDeck(), loadMatches()])
      return result
    } catch (err) {
      console.error('Swipe failed:', err)
      return null
    }
  }, [loadDeck, loadMatches, triggerMatchPopup])

  // ── Chat actions ──────────────────────────────────────────────────────────
  const sendChatMessage = async (event) => {
    event.preventDefault()
    if (!activeChatId || !chatInput.trim()) return

    try {
      const content = chatInput.trim()
      const ws = wsConnectionRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'message', content }))
      } else {
        const msg = await api.sendMessage(activeChatId, content)
        appendChatMessage(activeChatId, msg)
      }
      setChatInput('')
    } catch (err) {
      console.error('Failed to send message:', err)
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  const openUserProfile = () => {
    setProfileStartSection('about')
    setProfileStartPaymentTarget(null)
    setActivePage('profile')
  }

  const openMembershipPlans = () => {
    setProfileStartSection('plans')
    setProfileStartPaymentTarget(null)
    setActivePage('profile')
  }

  const openBoostPaymentDetails = () => {
    setProfileStartSection('plans')
    setProfileStartPaymentTarget('boost')
    setActivePage('profile')
  }

  const openSwipePage = () => setActivePage('swipe')

  const openOwnerProductPage = (product) => {
    setSelectedSwipeProduct(product)
    setActivePage('owner-product')
  }

  const openCreatePostPage = () => setActivePage('create-post')
  const backToMarketplace = () => setActivePage('marketplace')

  const saveUserProfile = async ({ name, email, location }) => {
    setUserName(name)
    setUserEmail(email)
    setUserLocation(location)
    try {
      await api.updateMe({
        display_name: name,
        city: location,
      })
    } catch (err) {
      console.error('Failed to update profile:', err)
    }
  }

  const upgradeToPro = () => setUserPlan('pro')
  const matchPopup = (showMatchPopup && activePage === 'marketplace') ? (
    <div className="market-match-modal-backdrop" onClick={dismissMatchPopup}>
      <div className="market-match-modal" onClick={(event) => event.stopPropagation()}>
        <h2>It&apos;s a match!</h2>
        <p>You both swiped right. Open Chats to start negotiating the trade.</p>
        <button type="button" onClick={dismissMatchPopup}>Awesome</button>
      </div>
    </div>
  ) : null

  // ── Render ────────────────────────────────────────────────────────────────
  if (!isSignedIn) {
    return (
      <AuthPage
        authMode={authMode}
        switchAuthMode={switchAuthMode}
        handleSignIn={handleSignIn}
        handleCreateAccount={handleCreateAccount}
        authName={authName}
        setAuthName={setAuthName}
        authEmail={authEmail}
        setAuthEmail={setAuthEmail}
        authLocation={authLocation}
        setAuthLocation={setAuthLocation}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        authError={authError}
        authLoading={authLoading}
      />
    )
  }

  if (activePage === 'profile') {
    return (
      <>
        {matchPopup}
        <UserProfilePage
          initialSection={profileStartSection}
          initialPaymentTarget={profileStartPaymentTarget}
          userName={userName}
          userEmail={userEmail}
          userLocation={userLocation}
          chatsCount={chats.length}
          activeTradesCount={postsPaused ? 0 : userPosts.length}
          userPosts={userPosts}
          onEditPost={editUserPost}
          onDeletePost={deleteUserPost}
          onBackToMarketplace={backToMarketplace}
          onSaveProfile={saveUserProfile}
          currentPlan={userPlan}
          onUpgradeToPro={upgradeToPro}
          postsPaused={postsPaused}
          onTogglePostVisibility={() => setPostsPaused((prev) => !prev)}
          darkModeOn={darkModeOn}
          onToggleDarkMode={() => setDarkModeOn((prev) => !prev)}
          onSignOut={handleSignOut}
        />
      </>
    )
  }

  if (activePage === 'swipe') {
    return (
      <>
        {matchPopup}
        <SwipePage
          userPlan={userPlan}
          swipesUsed={swipesUsed}
          freeSwipeLimit={freeSwipeLimit}
          onConsumeSwipe={() => setSwipesUsed((prev) => prev + 1)}
          onBackToMarketplace={backToMarketplace}
          onSelectProduct={openOwnerProductPage}
          deckListings={deckListings}
          onSwipe={handleSwipe}
        />
      </>
    )
  }

  if (activePage === 'owner-product') {
    return (
      <>
        {matchPopup}
        <OwnerProductPage
          product={selectedSwipeProduct}
          onBackToSwipe={openSwipePage}
          onBackToMarketplace={backToMarketplace}
        />
      </>
    )
  }

  if (activePage === 'create-post') {
    return (
      <>
        {matchPopup}
        <CreatePostPage
          userName={userName}
          onBackToMarketplace={backToMarketplace}
          onCreatePost={createListingPost}
        />
      </>
    )
  }

  return (
    <>
      {matchPopup}
      <MarketplacePage
        visibleListings={visibleListings}
        onConsumeSwipe={() => setSwipesUsed((prev) => prev + 1)}
        chats={chats}
        listings={listings}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        activeChat={activeChat}
        activeMessages={activeMessages}
        userName={userName}
        currentUserId={currentUser?.id}
        myInventory={userPostedItems}
        chatInput={chatInput}
        setChatInput={setChatInput}
        sendChatMessage={sendChatMessage}
        onOpenProfile={openUserProfile}
        onOpenMembershipPlans={openMembershipPlans}
        onOpenBoostPaymentDetails={openBoostPaymentDetails}
        onOpenSwipe={openSwipePage}
        onOpenCreatePost={openCreatePostPage}
        userPlan={userPlan}
        swipesUsed={swipesUsed}
        freeSwipeLimit={freeSwipeLimit}
        deckListings={deckListings}
        onSwipe={handleSwipe}
        onConfirmTrade={async (matchId) => {
          try {
            await api.confirmTrade(matchId)
            await loadMatches()
          } catch (err) {
            console.error('Failed to confirm trade:', err)
          }
        }}
        onCancelMatch={async (matchId) => {
          try {
            await api.cancelMatch(matchId)
            await loadMatches()
          } catch (err) {
            console.error('Failed to cancel match:', err)
          }
        }}
      />
    </>
  )
}

export default App
