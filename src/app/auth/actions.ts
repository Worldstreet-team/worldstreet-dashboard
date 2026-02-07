'use server'

const authDisabledMessage = 'Authentication is disabled in this project.'

export async function login(formData?: FormData) {
  return { error: authDisabledMessage }
}

export async function signup(formData?: FormData) {
  return { error: authDisabledMessage }
}

export async function logout() {
  return { error: authDisabledMessage }
}
