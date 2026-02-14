import { useEffect, useMemo, useState } from 'react'
import './UserProfilePage.css'
import PaymentDetailsModal from './PaymentDetailsModal'

function UserProfilePage({
  initialSection = 'about',
  userName,
  userEmail,
  userLocation,
  chatsCount,
  activeTradesCount,
  userPosts,
  onDeletePost,
  onBackToMarketplace,
  onSaveProfile,
  currentPlan,
  onUpgradeToPro,
  postsPaused,
  onTogglePostVisibility,
  darkModeOn,
  onToggleDarkMode,
  onSignOut,
}) {
  const [activeSection, setActiveSection] = useState(initialSection)
  const [isEditingAbout, setIsEditingAbout] = useState(false)
  const [draftName, setDraftName] = useState(userName)
  const [draftEmail, setDraftEmail] = useState(userEmail)
  const [draftLocation, setDraftLocation] = useState(userLocation)
  const [chatNotificationsOn, setChatNotificationsOn] = useState(true)
  const [locationSharingOn, setLocationSharingOn] = useState(true)
  const [securityNotice, setSecurityNotice] = useState('')
  const [preferencesNotice, setPreferencesNotice] = useState('')
  const [planNotice, setPlanNotice] = useState('')
  const [compactCardsOn, setCompactCardsOn] = useState(false)
  const [autoTranslateOn, setAutoTranslateOn] = useState(false)
  const [tradeRadius, setTradeRadius] = useState('10')
  const [priceRange, setPriceRange] = useState(250)
  const [preferredLanguage, setPreferredLanguage] = useState('English')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentTarget, setPaymentTarget] = useState('pro')
  const languageOptions = ['English', 'Spanish', 'French', 'Japanese']

  const sections = useMemo(
    () => [
      {
        id: 'about',
        label: 'About',
        title: 'About Your Account',
        content: [
          `Name: ${userName}`,
          `Email: ${userEmail}`,
          `Location: ${userLocation}`,
          `Open chats: ${chatsCount}`,
          `Active listings: ${activeTradesCount}`,
        ],
      },
      {
        id: 'settings',
        label: 'Settings',
        title: 'Account Settings',
        content: [],
      },
      {
        id: 'preferences',
        label: 'Preferences',
        title: 'Trading Preferences',
        content: [],
      },
      {
        id: 'plans',
        label: 'Plans',
        title: 'Membership Plans',
        content: [],
      },
      {
        id: 'manage-posts',
        label: 'Manage Posts',
        title: 'Your Created Posts',
        content: [],
      },
    ],
    [activeTradesCount, chatsCount, userEmail, userLocation, userName],
  )

  const currentSection = sections.find((section) => section.id === activeSection) ?? sections[0]

  useEffect(() => {
    setActiveSection(initialSection)
  }, [initialSection])

  const startEditAbout = () => {
    setDraftName(userName)
    setDraftEmail(userEmail)
    setDraftLocation(userLocation)
    setIsEditingAbout(true)
  }

  const cancelEditAbout = () => {
    setDraftName(userName)
    setDraftEmail(userEmail)
    setDraftLocation(userLocation)
    setIsEditingAbout(false)
  }

  const saveAbout = () => {
    const name = draftName.trim() || userName
    const email = draftEmail.trim() || userEmail
    const location = draftLocation.trim() || userLocation
    onSaveProfile({ name, email, location })
    setIsEditingAbout(false)
  }

  const mapLocation = (isEditingAbout ? draftLocation : userLocation).trim() || 'San Francisco, CA'
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(mapLocation)}&output=embed`

  const handlePasswordReset = () => {
    setSecurityNotice('Password reset link sent to your email.')
  }

  const handleEnableTwoFactor = () => {
    setSecurityNotice('Two-factor authentication enabled.')
  }

  const toggleDarkMode = () => {
    onToggleDarkMode()
    setPreferencesNotice(`Dark mode ${darkModeOn ? 'disabled' : 'enabled'}.`)
  }

  const togglePostVisibility = () => {
    onTogglePostVisibility()
    setSecurityNotice(postsPaused ? 'Posts are now visible in marketplace.' : 'Posts are now paused.')
  }

  const handleTradeRadiusChange = (event) => {
    const value = event.target.value.replace(/[^\d]/g, '')
    setTradeRadius(value)
    if (value) {
      setPreferencesNotice(`Trade radius set to ${value} miles.`)
    }
  }

  const handlePriceRangeChange = (event) => {
    const value = Number(event.target.value)
    setPriceRange(value)
    setPreferencesNotice(`Max preferred price set to $${value}.`)
  }

  const handleLanguageChange = (event) => {
    const next = event.target.value
    setPreferredLanguage(next)
    setPreferencesNotice(`Preferred language set to ${next}.`)
  }

  const handleLocationChange = (event) => {
    const value = event.target.value
    setDraftLocation(value)
    if (!isEditingAbout) {
      onSaveProfile({ name: userName, email: userEmail, location: value.trim() || userLocation })
    }
  }

  const toggleCompactCards = () => {
    setCompactCardsOn((prev) => !prev)
    setPreferencesNotice(`Compact cards ${compactCardsOn ? 'disabled' : 'enabled'}.`)
  }

  const toggleAutoTranslate = () => {
    setAutoTranslateOn((prev) => !prev)
    setPreferencesNotice(`Auto-translate ${autoTranslateOn ? 'disabled' : 'enabled'}.`)
  }

  const openPaymentModal = () => {
    if (currentPlan === 'pro') {
      setPlanNotice('You are already on Pro plan.')
      return
    }
    setPaymentTarget('pro')
    setShowPaymentModal(true)
  }

  const confirmPaymentAndUpgrade = () => {
    if (paymentTarget === 'boost') {
      setShowPaymentModal(false)
      setPlanNotice('Boost activated for 2 hours. Your posts will appear more often.')
      return
    }
    onUpgradeToPro()
    setShowPaymentModal(false)
    setPlanNotice('Pro plan activated. You now have unlimited swipes.')
  }

  return (
    <div className="profile-page-wrap">
      <section className="profile-card">
        <div className="profile-header">
          <div>
            <p className="profile-label">User Profile</p>
            <h1>{userName}</h1>
            <p className="profile-subtitle">Manage your account and trading setup</p>
          </div>
          <div className="profile-header-actions">
            <button type="button" onClick={onBackToMarketplace}>
              Back to Marketplace
            </button>
            {onSignOut && (
              <button type="button" className="sign-out-btn" onClick={onSignOut}>
                Sign Out
              </button>
            )}
          </div>
        </div>

        <div className="profile-layout">
          <aside className="profile-menu" aria-label="Profile menu">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={activeSection === section.id ? 'active' : ''}
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </aside>

          <article className="profile-content-card">
            <h2>{currentSection.title}</h2>
            {activeSection === 'about' ? (
              <div className="about-editor">
                <label>
                  Name
                  <input
                    type="text"
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    disabled={!isEditingAbout}
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={draftEmail}
                    onChange={(event) => setDraftEmail(event.target.value)}
                    disabled={!isEditingAbout}
                  />
                </label>
                <label>
                  Location
                  <input
                    type="text"
                    placeholder="Type area, city, or address"
                    value={draftLocation}
                    onChange={handleLocationChange}
                  />
                </label>
                <div className="about-map">
                  <iframe
                    title="Selected area map"
                    src={mapSrc}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <p className="about-meta">
                  Open chats: {chatsCount} · Active listings: {activeTradesCount}
                </p>
                <div className="about-actions">
                  {isEditingAbout ? (
                    <>
                      <button type="button" className="secondary" onClick={cancelEditAbout}>
                        Cancel
                      </button>
                      <button type="button" onClick={saveAbout}>
                        Save
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={startEditAbout}>
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ) : activeSection === 'settings' ? (
              <div className="settings-panel">
                <div className="settings-row">
                  <div>
                    <h3>Post Visibility</h3>
                    <p>Pause to hide your posts from marketplace until you unpause.</p>
                  </div>
                  <button type="button" onClick={togglePostVisibility}>
                    {postsPaused ? 'Unpause' : 'Pause'}
                  </button>
                </div>

                <div className="settings-row">
                  <div>
                    <h3>Chat Notifications</h3>
                    <p>Get notified for new chat messages and trade offers.</p>
                  </div>
                  <button type="button" onClick={() => setChatNotificationsOn((prev) => !prev)}>
                    {chatNotificationsOn ? 'On' : 'Off'}
                  </button>
                </div>

                <div className="settings-row">
                  <div>
                    <h3>Location Sharing</h3>
                    <p>Share your general area for better local matching.</p>
                  </div>
                  <button type="button" onClick={() => setLocationSharingOn((prev) => !prev)}>
                    {locationSharingOn ? 'On' : 'Off'}
                  </button>
                </div>

                <div className="settings-row">
                  <div>
                    <h3>Dark Mode</h3>
                    <p>Switch between light and dark interface themes.</p>
                  </div>
                  <button type="button" onClick={toggleDarkMode}>
                    {darkModeOn ? 'On' : 'Off'}
                  </button>
                </div>

                <div className="settings-row">
                  <div>
                    <h3>Language</h3>
                    <p>Set your preferred language for marketplace text.</p>
                  </div>
                  <select value={preferredLanguage} onChange={handleLanguageChange}>
                    {languageOptions.map((language) => (
                      <option key={language} value={language}>
                        {language}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="settings-row">
                  <div>
                    <h3>Compact Listing Cards</h3>
                    <p>Use denser listing cards to view more products at once.</p>
                  </div>
                  <button type="button" onClick={toggleCompactCards}>
                    {compactCardsOn ? 'On' : 'Off'}
                  </button>
                </div>

                <div className="settings-row">
                  <div>
                    <h3>Auto-Translate Chats</h3>
                    <p>Automatically translate incoming chat messages.</p>
                  </div>
                  <button type="button" onClick={toggleAutoTranslate}>
                    {autoTranslateOn ? 'On' : 'Off'}
                  </button>
                </div>

                <div className="settings-actions">
                  <button type="button" onClick={handlePasswordReset}>
                    Reset Password
                  </button>
                  <button type="button" onClick={handleEnableTwoFactor}>
                    Enable 2FA
                  </button>
                </div>

                {securityNotice && <p className="settings-notice">{securityNotice}</p>}
                {preferencesNotice && <p className="settings-notice">{preferencesNotice}</p>}
              </div>
            ) : activeSection === 'preferences' ? (
              <div className="settings-panel">
                <div className="settings-row">
                  <div>
                    <h3>Trade Radius</h3>
                    <p>Limit discovery to a distance that works for you.</p>
                  </div>
                  <label className="radius-input-wrap">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter miles"
                      value={tradeRadius}
                      onChange={handleTradeRadiusChange}
                    />
                    <span>miles</span>
                  </label>
                </div>
                <div className="settings-row">
                  <div>
                    <h3>Price Range</h3>
                    <p>Set the max product value you want to see first.</p>
                  </div>
                  <div className="price-range-wrap">
                    <input
                      type="range"
                      min="20"
                      max="1000"
                      step="5"
                      value={priceRange}
                      onChange={handlePriceRangeChange}
                    />
                    <span>${priceRange}</span>
                  </div>
                </div>
                {preferencesNotice && <p className="settings-notice">{preferencesNotice}</p>}
              </div>
            ) : activeSection === 'plans' ? (
              <>
                <div className="plans-grid">
                  <article className={`plan-card ${currentPlan === 'free' ? 'current' : ''}`}>
                    <div className="plan-head">
                      <h3>Free</h3>
                      {currentPlan === 'free' && <span>Current Plan</span>}
                    </div>
                    <ul>
                      <li>Basic product listings</li>
                      <li>User-to-user chat access</li>
                      <li>Local trade discovery</li>
                      <li>Standard profile controls</li>
                    </ul>
                  </article>

                  <article className={`plan-card plan-card-pro ${currentPlan === 'pro' ? 'current' : ''}`}>
                    <div className="plan-head">
                      <h3>
                        💎 Pro <span className="plan-price">$17.89/mo</span>
                      </h3>
                      {currentPlan === 'pro' && <span>Current Plan</span>}
                    </div>
                    <ul>
                      <li>Everything in Free</li>
                      <li>Priority listing visibility</li>
                      <li>Advanced filter and match tools</li>
                      <li>Pro badge on profile</li>
                    </ul>
                    <button type="button" className="plan-buy-now" onClick={openPaymentModal}>
                      Buy Now
                    </button>
                  </article>
                </div>
                <section className="boost-plan-card">
                  <div className="plan-head">
                    <h3>✨ Boost</h3>
                    <span>$0.99 / 2 hr</span>
                  </div>
                  <p className="boost-plan-copy">
                    This will show your posts more often on other users&apos; feeds.
                  </p>
                  <button
                    type="button"
                    className="boost-buy-button"
                    onClick={() => {
                      setPaymentTarget('boost')
                      setShowPaymentModal(true)
                    }}
                  >
                    Boost Now
                  </button>
                </section>
              </>
            ) : activeSection === 'manage-posts' ? (
              <div className="manage-posts-panel">
                {userPosts.length ? (
                  <ul className="manage-post-list">
                    {userPosts.map((post) => (
                      <li key={post.id} className="manage-post-item">
                        <div className="manage-post-copy">
                          <h3>{post.title}</h3>
                          <p>
                            {post.category} · {post.condition} · {post.location}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="delete-post-button"
                          onClick={() => onDeletePost(post.id)}
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="settings-notice">You have not created any posts yet.</p>
                )}
              </div>
            ) : (
              <ul>
                {currentSection.content.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {activeSection === 'plans' && planNotice && <p className="settings-notice">{planNotice}</p>}
          </article>
        </div>
      </section>
      <PaymentDetailsModal
        open={showPaymentModal}
        title={paymentTarget === 'boost' ? 'Boost Payment Details' : 'Payment Details'}
        planLabel={paymentTarget === 'boost' ? 'Boost Plan' : 'Pro Plan'}
        planPrice={paymentTarget === 'boost' ? '$0.99 / 2 hr' : '$17.89/mo'}
        submitLabel={paymentTarget === 'boost' ? 'Pay and Boost' : 'Pay and Upgrade'}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={confirmPaymentAndUpgrade}
      />
    </div>
  )
}

export default UserProfilePage
