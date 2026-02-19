'use client'

import { useEffect } from 'react'
import { VividProvider, VividWidget } from '@worldstreet/vivid-voice'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/authContext'
import { useProfile } from '@/app/context/profileContext'
import { allFunctions } from '@/lib/vivid-functions'

/**
 * Wraps VividProvider inside the DashboardLayout so it has access to
 * auth (Clerk) and profile context — the voice agent can greet the user
 * by name and reference their wallets, watchlist, and preferences.
 */
export default function DashboardVividProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user: authUser } = useAuth()
  const { profile } = useProfile()

  // Listen for vivid:navigate events dispatched by the navigateToPage function
  useEffect(() => {
    const handler = (e: Event) => {
      const path = (e as CustomEvent).detail?.path
      if (path && path !== pathname) router.push(path)
    }
    window.addEventListener('vivid:navigate', handler)
    return () => window.removeEventListener('vivid:navigate', handler)
  }, [router, pathname])

  // Build a user object matching VividProvider's expected shape
  const vividUser = authUser
    ? {
        id: authUser.userId,
        firstName: authUser.firstName || profile?.displayName || undefined,
        lastName: authUser.lastName || undefined,
        email: authUser.email || profile?.email || undefined,
      }
    : undefined

  return (
    <VividProvider
      pathname={pathname}
      voice="coral"
      persistConversation={true}
      functions={allFunctions}
      user={vividUser}
      platformContext={(_user: any, currentPath: string) => {
        // Build portfolio summary from profile data when available
        let portfolioContext = ''
        if (profile) {
          const walletChains: string[] = []
          if (profile.wallets?.solana?.address) walletChains.push('Solana')
          if (profile.wallets?.ethereum?.address) walletChains.push('Ethereum')
          if (profile.wallets?.bitcoin?.address) walletChains.push('Bitcoin')

          if (walletChains.length > 0) {
            portfolioContext += `\nThe user has wallets on: ${walletChains.join(', ')}.`
          }
          if (profile.watchlist && profile.watchlist.length > 0) {
            portfolioContext += `\nThe user's watchlist includes: ${profile.watchlist.join(', ')}.`
          }
          if (profile.preferredCurrency) {
            portfolioContext += `\nThe user's preferred currency is ${profile.preferredCurrency}.`
          }
        }

        return `
This is the WorldStreet Dashboard — a cryptocurrency trading platform within the WorldStreet ecosystem.

Current page: ${currentPath}

Available dashboard pages the user can navigate to:
- / — Dashboard home (overview & summary)
- /spot — Spot trading (buy/sell crypto)
- /futures — Futures trading
- /swap — Token swap
- /assets — User's portfolio & asset overview
- /deposit — Deposit funds
- /withdraw — Withdraw funds
- /transactions — Transaction history

Help users navigate the dashboard, explain trading concepts, and guide them through
depositing, withdrawing, swapping, and trading cryptocurrency.
When users ask about their portfolio, wallets, or account details, use the information provided below.
Keep responses brief and conversational since users are listening, not reading.
Be friendly, professional, and knowledgeable about financial trading concepts.
${portfolioContext}
        `.trim()
      }}
    >
      {children as any}
      <VividWidget
        showTranscript={true}
        size="md"
        position={{ bottom: '24px', right: '24px' }}
        classNames={{
          container:
            'fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 max-sm:bottom-5 max-sm:right-4 max-sm:scale-75 max-sm:origin-bottom-right',
        }}
      />
    </VividProvider>
  )
}
