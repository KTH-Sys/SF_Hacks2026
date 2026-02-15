const API_BASE = '/api'

// ── Token helpers ────────────────────────────────────────────────────────────
export function getToken() {
  return localStorage.getItem('barter_token')
}

export function setToken(token) {
  localStorage.setItem('barter_token', token)
}

export function clearToken() {
  localStorage.removeItem('barter_token')
}

// ── Fetch wrapper ────────────────────────────────────────────────────────────
async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null

  const data = await res.json()
  if (!res.ok) {
    const msg = data.detail || JSON.stringify(data)
    throw new Error(msg)
  }
  return data
}

// ── Category / Condition mapping ─────────────────────────────────────────────
const CATEGORY_TO_BACKEND = {
  'Gaming': 'gaming',
  'Photography': 'electronics',
  'Music': 'instruments',
  'Home Office': 'furniture',
  'Kitchen': 'other',
  'Electronics': 'electronics',
  'Clothing': 'clothing',
  'Books': 'books',
  'Furniture': 'furniture',
  'Sports': 'sports',
  'Instruments': 'instruments',
  'Outdoor': 'outdoor',
  'Art': 'art',
  'Other': 'other',
}

const CATEGORY_TO_FRONTEND = {
  'gaming': 'Gaming',
  'electronics': 'Photography',
  'instruments': 'Music',
  'furniture': 'Home Office',
  'clothing': 'Clothing',
  'books': 'Books',
  'sports': 'Sports',
  'outdoor': 'Outdoor',
  'art': 'Art',
  'other': 'Other',
}

const CONDITION_TO_BACKEND = {
  'Like New': 'like_new',
  'Excellent': 'new',
  'Great': 'good',
  'Good': 'good',
  'Used': 'fair',
}

const CONDITION_TO_FRONTEND = {
  'new': 'Excellent',
  'like_new': 'Like New',
  'good': 'Good',
  'fair': 'Used',
  'poor': 'Used',
}

export function categoryToBackend(c) { return CATEGORY_TO_BACKEND[c] || 'other' }
export function categoryToFrontend(c) { return CATEGORY_TO_FRONTEND[c] || 'Other' }
export function conditionToBackend(c) { return CONDITION_TO_BACKEND[c] || 'good' }
export function conditionToFrontend(c) { return CONDITION_TO_FRONTEND[c] || 'Good' }

// ── Data transformers ────────────────────────────────────────────────────────
const ACCENTS = ['#73a942', '#a3b18a', '#9fc5e8', '#84a98c', '#f4a261']

export function backendListingToFrontend(listing, index = 0) {
  return {
    id: listing.id,
    backendId: listing.id,
    title: listing.title,
    description: listing.description || '',
    category: categoryToFrontend(listing.category),
    condition: conditionToFrontend(listing.condition),
    location: listing.city || listing.location || '',
    owner: listing.owner_name || '',
    price: listing.estimated_value,
    accent: ACCENTS[index % ACCENTS.length],
    photo: listing.images?.[0] || '',
    images: listing.images || [],
    status: listing.status,
    userId: listing.user_id,
    distanceKm: listing.distance_km,
    ownerAvatar: listing.owner_avatar,
    ownerRating: listing.owner_rating,
    ownerTradeCount: listing.owner_trade_count,
    createdAt: listing.created_at,
  }
}

export function backendListingBasicToFrontend(listing, index = 0) {
  return {
    id: listing.id,
    backendId: listing.id,
    title: listing.title,
    description: listing.description || '',
    category: categoryToFrontend(listing.category),
    condition: conditionToFrontend(listing.condition),
    location: '',
    owner: '',
    price: listing.estimated_value,
    accent: ACCENTS[index % ACCENTS.length],
    photo: listing.images?.[0] || '',
    images: listing.images || [],
    status: listing.status,
    userId: listing.user_id,
    createdAt: listing.created_at,
  }
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  })
  setToken(data.access_token)
  return data
}

export async function register(email, password, displayName) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: { email, password, display_name: displayName },
    auth: false,
  })
  setToken(data.access_token)
  return data
}

export async function getMe() {
  return request('/auth/me')
}

export async function updateMe(updates) {
  return request('/auth/me', { method: 'PATCH', body: updates })
}

// ── Listings ─────────────────────────────────────────────────────────────────
export async function createListing({ title, description, category, condition, estimatedValue, images, latitude, longitude }) {
  return request('/listings/', {
    method: 'POST',
    body: {
      title,
      description,
      category: categoryToBackend(category),
      condition: conditionToBackend(condition),
      estimated_value: estimatedValue,
      images: images || [],
      latitude,
      longitude,
    },
  })
}

export async function getMyListings() {
  return request('/listings/mine')
}

export async function getDeck(offeringListingId, category, radiusKm) {
  const params = new URLSearchParams({ offering_listing_id: offeringListingId })
  if (category) params.set('category', categoryToBackend(category))
  if (radiusKm) params.set('radius_km', String(radiusKm))
  return request(`/listings/deck?${params}`)
}

export async function deleteListing(listingId) {
  return request(`/listings/${listingId}`, { method: 'DELETE' })
}

export async function updateListing(listingId, updates) {
  const body = {}
  if (updates.title !== undefined) body.title = updates.title
  if (updates.description !== undefined) body.description = updates.description
  if (updates.category !== undefined) body.category = categoryToBackend(updates.category)
  if (updates.condition !== undefined) body.condition = conditionToBackend(updates.condition)
  if (updates.estimatedValue !== undefined) body.estimated_value = updates.estimatedValue
  if (updates.images !== undefined) body.images = updates.images
  return request(`/listings/${listingId}`, { method: 'PATCH', body })
}

// ── Swipes ───────────────────────────────────────────────────────────────────
export async function swipe(swiperListingId, targetListingId, direction) {
  return request('/swipes/', {
    method: 'POST',
    body: {
      swiper_listing_id: swiperListingId,
      target_listing_id: targetListingId,
      direction,
    },
  })
}

// ── Matches ──────────────────────────────────────────────────────────────────
export async function getMatches() {
  return request('/matches/')
}

export async function getMatch(matchId) {
  return request(`/matches/${matchId}`)
}

export async function confirmTrade(matchId) {
  return request(`/matches/${matchId}/confirm`, { method: 'POST' })
}

export async function cancelMatch(matchId) {
  return request(`/matches/${matchId}/cancel`, { method: 'POST' })
}

// ── Chat ─────────────────────────────────────────────────────────────────────
export async function getMessages(matchId, limit = 50, offset = 0) {
  return request(`/chat/${matchId}/messages?limit=${limit}&offset=${offset}`)
}

export async function sendMessage(matchId, content, type = 'text') {
  return request(`/chat/${matchId}/messages`, {
    method: 'POST',
    body: { content, type },
  })
}

export function createChatWebSocket(matchId) {
  const token = getToken()
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  return new WebSocket(`${protocol}//${host}/api/chat/ws/${matchId}?token=${token}`)
}

// ── AI ───────────────────────────────────────────────────────────────────────
export async function estimateValue(title, category, condition, description) {
  return request('/ai/estimate-value', {
    method: 'POST',
    body: {
      title,
      category: categoryToBackend(category),
      condition: conditionToBackend(condition),
      description,
    },
  })
}

export async function generateDescription(title, category, condition) {
  return request('/ai/generate-desc', {
    method: 'POST',
    body: {
      title,
      category: categoryToBackend(category),
      condition: conditionToBackend(condition),
    },
  })
}

// ── File helpers ─────────────────────────────────────────────────────────────
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
