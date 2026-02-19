import { createFunctionHandler } from '@worldstreet/vivid-voice/server'
import { serverFunctions } from '@/lib/vivid-functions'

export const POST = createFunctionHandler({
  functions: serverFunctions,
})
