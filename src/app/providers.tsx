'use client'

import { useEffect } from 'react'
import { VividProvider, VividWidget } from '@worldstreet/vivid-voice'
import { usePathname, useRouter } from 'next/navigation'
import { allFunctions } from '@/lib/vivid-functions'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const pathname = usePathname()
  const router = useRouter()

  // Listen for vivid:navigate events from client voice functions
  useEffect(() => {
    const handler = (e: Event) => {
      const path = (e as CustomEvent).detail?.path
      if (path) router.push(path)
    }
    window.addEventListener('vivid:navigate', handler)
    return () => window.removeEventListener('vivid:navigate', handler)
  }, [router])

  return (
    <VividProvider
      pathname={pathname}
      voice="coral"
      persistConversation={true}
      functions={allFunctions}
      platformContext={(_user, currentPath) => `
        You are Vivid, the AI voice assistant for WorldStreet — a cryptocurrency trading platform.
        Current page: ${currentPath}

        Available dashboard pages the user can navigate to:
        - /spot — Spot trading (buy/sell crypto)
        - /swap — Token swap
        - /assets — User's portfolio & asset overview
        - /deposit — Deposit funds
        - /withdraw — Withdraw funds
        - /transactions — Transaction history

        Help users navigate the platform, explain trading concepts, and guide them through
        depositing, withdrawing, swapping, and trading cryptocurrency.
        Keep responses concise since users are listening via audio.
      `}
    >
      {children}
      <VividWidget showTranscript={true} size="lg" />
    </VividProvider>
  )
}
