'use client'

interface ProvidersProps {
  children: React.ReactNode
}

/**
 * Root-level providers wrapper.
 * Vivid voice agent is now integrated inside (DashboardLayout)/layout.tsx
 * via DashboardVividProvider, where it has access to auth & profile context.
 */
export function Providers({ children }: ProvidersProps) {
  return <>{children}</>
}
