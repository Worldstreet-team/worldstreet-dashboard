'use server'

const authDisabledMessage = 'Authentication is disabled in this project.'

export async function login() {
  return { error: authDisabledMessage }
}

export async function signup() {
  return { error: authDisabledMessage }
}

export async function logout() {
  return { error: authDisabledMessage }
}
