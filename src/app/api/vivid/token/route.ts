import { createTokenHandler } from '@worldstreet/vivid-voice/server'

export const POST = createTokenHandler({
  openAIApiKey: process.env.OPENAI_API_KEY,
  voice: 'coral',
})
