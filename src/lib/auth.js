/**
 * Current-user session management. The logged-in user id is stored in
 * localStorage; the full user record is read live from the db so balances and
 * stats stay fresh.
 */
import { getById, getAll } from './db'
import { lock } from './pinLock'

const AUTH_KEY = 'goodseed_current_user_id'
const authListeners = new Set()
let currentUserId = null

try {
  currentUserId = localStorage.getItem(AUTH_KEY)
} catch {
  currentUserId = null
}

export function subscribeAuth(listener) {
  authListeners.add(listener)
  return () => authListeners.delete(listener)
}

function notifyAuth() {
  authListeners.forEach((l) => l())
}

export function getCurrentUserId() {
  return currentUserId
}

export function getCurrentUser() {
  if (!currentUserId) return null
  return getById('users', currentUserId)
}

export function login(userId) {
  currentUserId = userId
  try {
    localStorage.setItem(AUTH_KEY, userId)
  } catch {
    /* ignore */
  }
  notifyAuth()
}

export function logout() {
  currentUserId = null
  try {
    localStorage.removeItem(AUTH_KEY)
  } catch {
    /* ignore */
  }
  lock() // require the parent PIN again on next sign-in
  notifyAuth()
}

/** Whether onboarding/login has happened (a current user exists). */
export function isAuthenticated() {
  return !!getCurrentUser()
}

export function getFamilyUsers(familyId) {
  return getAll('users').filter((u) => u.family_id === familyId)
}
