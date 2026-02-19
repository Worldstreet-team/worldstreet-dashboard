import {
  createVividFunction,
  buildParameters,
  stringParam,
} from '@worldstreet/vivid-voice/functions'
import type { VoiceFunctionConfig } from '@worldstreet/vivid-voice/functions'

// =============================================================================
// Client Functions (run in browser)
// =============================================================================

export const navigateToPage = createVividFunction({
  name: 'navigateToPage',
  description: 'Navigate to a page in the WorldStreet dashboard',
  parameters: buildParameters({
    path: stringParam(
      'The URL path to navigate to (e.g. /spot, /swap, /assets, /deposit, /withdraw, /transactions)',
      true,
    ),
  }),
  handler: async ({ path }) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('vivid:navigate', { detail: { path } }),
      )
    }
    return { success: true, navigatedTo: path }
  },
  executionContext: 'client',
})

export const showAlert = createVividFunction({
  name: 'showAlert',
  description: 'Show an alert message to the user',
  parameters: buildParameters({
    message: stringParam('The message to display', true),
  }),
  handler: async ({ message }) => {
    if (typeof window !== 'undefined') {
      alert(message)
    }
    return { success: true }
  },
  executionContext: 'client',
})

// =============================================================================
// Export Collections
// =============================================================================

export const clientFunctions: VoiceFunctionConfig[] = [
  navigateToPage,
  showAlert,
]

export const serverFunctions: VoiceFunctionConfig[] = []

export const allFunctions: VoiceFunctionConfig[] = [
  ...clientFunctions,
  ...serverFunctions,
]
