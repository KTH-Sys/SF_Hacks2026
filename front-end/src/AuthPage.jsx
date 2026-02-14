import './AuthPage.css'

function AuthPage({
  authMode,
  switchAuthMode,
  handleSignIn,
  handleCreateAccount,
  authName,
  setAuthName,
  authEmail,
  setAuthEmail,
  authLocation,
  setAuthLocation,
  authPassword,
  setAuthPassword,
  confirmPassword,
  setConfirmPassword,
  authError,
  authLoading,
}) {
  return (
    <div className="auth-wrap">
      <section className="auth-card">
        <div className="auth-hero">
          <p className="eyebrow">TradeLoop Market</p>
          <h1>{authMode === 'signin' ? 'Sign in to start trading' : 'Create your trader account'}</h1>
          <p>
            Connect with local traders, exchange products, and chat directly to negotiate the
            perfect swap.
          </p>
        </div>

        <div className="auth-form-wrap">
          <div className="auth-tabs">
            <button
              type="button"
              className={authMode === 'signin' ? 'active' : ''}
              onClick={() => switchAuthMode('signin')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={authMode === 'signup' ? 'active' : ''}
              onClick={() => switchAuthMode('signup')}
            >
              Create Account
            </button>
          </div>

          {authMode === 'signin' ? (
            <form className="auth-form" onSubmit={handleSignIn}>
              <label>
                Email
                <input
                  type="email"
                  placeholder="you@email.com"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  placeholder="Enter password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                />
              </label>
              {authError && <p className="auth-message">{authError}</p>}
              <button type="submit" disabled={authLoading}>{authLoading ? 'Signing in...' : 'Enter Marketplace'}</button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleCreateAccount}>
              <label>
                Full name
                <input
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={authName}
                  onChange={(event) => setAuthName(event.target.value)}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  placeholder="you@email.com"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                />
              </label>
              <label>
                Location
                <input
                  type="text"
                  placeholder="e.g. San Francisco, CA"
                  value={authLocation}
                  onChange={(event) => setAuthLocation(event.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                />
              </label>
              <label>
                Confirm password
                <input
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>
              {authError && <p className="auth-message">{authError}</p>}
              <button type="submit" disabled={authLoading}>{authLoading ? 'Creating...' : 'Create Account'}</button>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}

export default AuthPage
