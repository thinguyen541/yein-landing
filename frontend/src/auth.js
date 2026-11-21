import { reactive } from 'vue'

const KEY = 'yein_admin_token'

function readToken() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

// Shared admin session state
export const auth = reactive({
  token: readToken(),
  admin: null,
})

export function setSession(token, admin) {
  auth.token = token
  auth.admin = admin
  try {
    localStorage.setItem(KEY, token)
  } catch {
    /* storage unavailable */
  }
}

export function clearSession() {
  auth.token = null
  auth.admin = null
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* storage unavailable */
  }
}
