'use server'

import { cookies } from 'next/headers'

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'https://api.worldstreetgold.com'

export async function login(formData?: FormData) {
  if (!formData) return { error: 'Form data is required' }

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  try {
    const res = await fetch(`${AUTH_SERVICE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (data.success && data.data?.tokens) {
      const cookieStore = await cookies()

      cookieStore.set('accessToken', data.data.tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60,
      })

      cookieStore.set('refreshToken', data.data.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      })

      return { success: true, redirectTo: '/' }
    }

    return { error: data.message || 'Invalid email or password' }
  } catch {
    return { error: 'Auth service unavailable. Please try again later.' }
  }
}

export async function signup(formData?: FormData) {
  if (!formData) return { error: 'Form data is required' }

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!name || !email || !password) {
    return { error: 'All fields are required' }
  }

  // Split name into firstName and lastName
  const nameParts = name.trim().split(/\s+/)
  const firstName = nameParts[0]
  const lastName = nameParts.slice(1).join(' ') || firstName

  try {
    const res = await fetch(`${AUTH_SERVICE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, firstName, lastName }),
    })

    const data = await res.json()

    if (data.success && data.data?.tokens) {
      const cookieStore = await cookies()

      cookieStore.set('accessToken', data.data.tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60,
      })

      cookieStore.set('refreshToken', data.data.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      })

      return { success: true, redirectTo: '/' }
    }

    return { error: data.message || 'Registration failed' }
  } catch {
    return { error: 'Auth service unavailable. Please try again later.' }
  }
}

export async function logout() {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refreshToken')?.value

    if (refreshToken) {
      await fetch(`${AUTH_SERVICE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
    }

    cookieStore.set('accessToken', '', { path: '/', maxAge: 0 })
    cookieStore.set('refreshToken', '', { path: '/', maxAge: 0 })

    return { success: true }
  } catch {
    return { error: 'Logout failed' }
  }
}
