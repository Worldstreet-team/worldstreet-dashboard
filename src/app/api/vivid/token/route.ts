import { createTokenHandler, VIVID_BASE_PROMPT, generateFunctionInstructions } from '@worldstreet/vivid-voice/server'
import { allFunctions } from '@/lib/vivid-functions'

// Build tool definitions for the OpenAI Realtime session
const tools = allFunctions.map(fn => ({
  type: 'function' as const,
  name: fn.name,
  description: fn.description,
  parameters: fn.parameters as unknown as Record<string, unknown>,
}))

const functionNames = allFunctions.map(f => f.name)

export const POST = createTokenHandler({
  openAIApiKey: process.env.OPENAI_API_KEY,
  voice: 'coral',
  tools,
  buildInstructions: (body) => {
    // Start with the full Vivid base prompt (personality, ecosystem, behavior guidelines)
    let instructions = VIVID_BASE_PROMPT

    // Append platform-specific context sent from the client
    if (body.platformPrompt && body.platformPrompt.trim().length > 0) {
      instructions += `\n\n## Platform-Specific Context\n\n${body.platformPrompt.trim()}`
    }

    // Add current page context
    if (body.pathname) {
      instructions += `\n\n## Current Page\nThe user is currently on: ${body.pathname}`
    }

    // Add user personalization
    if (body.userName) {
      instructions += `\n\n## Current User\n`
      instructions += `- Name: ${body.userName}${body.userLastName ? ` ${body.userLastName}` : ''}\n`
      instructions += `- IMPORTANT: Address this user by their first name (${body.userName}) in a friendly way\n`
      if (body.userEmail) {
        instructions += `- Email: ${body.userEmail}\n`
      }
    }

    // Add function usage instructions
    instructions += generateFunctionInstructions(functionNames)

    // Add action-specific reinforcement
    instructions += `\n\n## Action Reminders\n- When a user asks to navigate or go to a page, you MUST call the navigateToPage function with the correct path. Do not just describe the page — actually navigate there.\n- When a user asks you to show an alert or message, call the showAlert function.`

    return instructions
  },
})
