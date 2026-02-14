import { useCallback, useEffect, useMemo, useState } from 'react'
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
  const [wsRef, setWsRef] = useState(null)

  // Search / filter
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', darkModeOn)
    localStorage.setItem('darkMode', darkModeOn ? 'on' : 'off')
  }, [darkModeOn])

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
      setMatches(data)
      if (data.length > 0 && !activeChatId) {
        setActiveChatId(data[0].id)
      }
    } catch {
      // ignore
    }
  }, [activeChatId])

  useEffect(() => {
    if (!isSignedIn) return
    loadMyListings()
    loadDeck()
    loadMatches()
  }, [isSignedIn, loadMyListings, loadDeck, loadMatches])

  // ── Load messages when active chat changes ────────────────────────────────
  useEffect(() => {
    if (!activeChatId || !isSignedIn) return

    api.getMessages(activeChatId).then((data) => {
      setChatMessages((prev) => ({ ...prev, [activeChatId]: data.messages }))
    }).catch(() => {})

    // Set up WebSocket
    if (wsRef) {
      wsRef.close()
    }
    const ws = api.createChatWebSocket(activeChatId)
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload.event === 'new_message') {
          setChatMessages((prev) => ({
            ...prev,
            [activeChatId]: [...(prev[activeChatId] || []), payload.data],
          }))
        } else if (payload.event === 'trade_confirmed' || payload.event === 'match_cancelled') {
          loadMatches()
        }
      } catch {
        // ignore
      }
    }
    setWsRef(ws)

    return () => ws.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId, isSignedIn])

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
    if (wsRef) wsRef.close()
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

  // ── Swipe actions ─────────────────────────────────────────────────────────
  const handleSwipe = async (targetListing, direction) => {
    try {
      const myListingsRaw = await api.getMyListings()
      if (myListingsRaw.length === 0) return null
      const result = await api.swipe(myListingsRaw[0].id, targetListing.backendId || targetListing.id, direction)
      if (result.match_created) {
        await loadMatches()
      }
      return result
    } catch (err) {
      console.error('Swipe failed:', err)
      return null
    }
  }

  // ── Chat actions ──────────────────────────────────────────────────────────
  const sendChatMessage = async (event) => {
    event.preventDefault()
    if (!activeChatId || !chatInput.trim()) return

    try {
      if (wsRef && wsRef.readyState === WebSocket.OPEN) {
        wsRef.send(JSON.stringify({ type: 'message', content: chatInput.trim() }))
      } else {
        const msg = await api.sendMessage(activeChatId, chatInput.trim())
        setChatMessages((prev) => ({
          ...prev,
          [activeChatId]: [...(prev[activeChatId] || []), msg],
        }))
      }
      setChatInput('')
    } catch (err) {
      console.error('Failed to send message:', err)
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  const openUserProfile = () => {
    setProfileStartSection('about')
    setActivePage('profile')
  }

  const openMembershipPlans = () => {
    setProfileStartSection('plans')
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
      <UserProfilePage
        initialSection={profileStartSection}
        userName={userName}
        userEmail={userEmail}
        userLocation={userLocation}
        chatsCount={chats.length}
        activeTradesCount={postsPaused ? 0 : userPosts.length}
        userPosts={userPosts}
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
    )
  }

  if (activePage === 'swipe') {
    return (
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
    )
  }

  if (activePage === 'owner-product') {
    return (
      <OwnerProductPage
        product={selectedSwipeProduct}
        onBackToSwipe={openSwipePage}
        onBackToMarketplace={backToMarketplace}
      />
    )
  }

  if (activePage === 'create-post') {
    return (
      <CreatePostPage
        userName={userName}
        onBackToMarketplace={backToMarketplace}
        onCreatePost={createListingPost}
      />
    )
  }

  return (
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
  )
}

export default App
