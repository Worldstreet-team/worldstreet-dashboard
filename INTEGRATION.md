# Vivid Voice – Integration Guide

> **For developers & AI agents (Copilot).** Step-by-step instructions to integrate `@worldstreet/vivid-voice` into any Next.js project using a **local workspace setup** (no npm publish required).

---

## Prerequisites

- **Node.js** 18+
- **Next.js** 14 or 15+ project (App Router)
- **React** 18 or 19
- **OpenAI API Key** with Realtime API access
- Both `vivid-plugin` and your target project **open in the same VS Code workspace**

---

## Workspace Structure

Your VS Code workspace should look like this:

```
my-workspace/
├── vivid-plugin/            ← The SDK monorepo
│   └── packages/
│       └── vivid-voice/     ← The package
└── your-nextjs-app/         ← Your target project
```

---

## Step 1 — Build the Vivid Voice Package

Before your project can use it, the package must be built.

```bash
cd vivid-plugin/packages/vivid-voice
npm install
npm run build
```

This generates the `dist/` folder with three entry points:

| Import Path | Purpose |
|---|---|
| `@worldstreet/vivid-voice` | Provider, Widget, hooks, functions, types |
| `@worldstreet/vivid-voice/functions` | `createVividFunction`, parameter helpers |
| `@worldstreet/vivid-voice/server` | `createTokenHandler`, `createFunctionHandler` |

> **After every change to vivid-voice source, re-run `npm run build`.**

---

## Step 2 — Add the Package to Your Project

### Option A: Relative `file:` path (Recommended)

In your project's `package.json`, add:

```json
{
  "dependencies": {
    "@worldstreet/vivid-voice": "file:../vivid-plugin/packages/vivid-voice"
  }
}
```

> Adjust the relative path based on your workspace layout. The path is relative to your project's `package.json`.

Then install:

```bash
cd your-nextjs-app
npm install
```

### Option B: npm link

```bash
# In vivid-voice directory:
cd vivid-plugin/packages/vivid-voice
npm link

# In your project:
cd your-nextjs-app
npm link @worldstreet/vivid-voice
```

---

## Step 3 — Install Required Peer Dependencies

If your project doesn't already have these, install them:

```bash
npm install three @react-three/fiber @react-three/drei @types/three
```

These are needed for the `VividWidget` visualizer (the animated orb).

---

## Step 4 — Configure `next.config.ts`

Add `transpilePackages` so Next.js can compile the local package:

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@worldstreet/vivid-voice'],
};

export default nextConfig;
```

---

## Step 5 — Add Environment Variables

Create or update `.env.local` in your project root:

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

The key needs access to the **OpenAI Realtime API** (`gpt-4o-realtime-preview`).

Optional (if using Clerk auth):

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
```

---

## Step 6 — Create the Token API Route

This endpoint creates ephemeral OpenAI Realtime sessions for WebRTC.

Create the file `src/app/api/vivid/token/route.ts`:

```ts
import { createTokenHandler } from '@worldstreet/vivid-voice/server'

export const POST = createTokenHandler({
  openAIApiKey: process.env.OPENAI_API_KEY,
  // Optional overrides:
  // voice: 'coral',        // default: 'alloy'
  // model: 'gpt-4o-realtime-preview-2024-12-17',
})
```

### Available voices

`alloy` | `ash` | `ballad` | `coral` | `echo` | `sage` | `shimmer` | `verse`

---

## Step 7 — Create the Function API Route

This endpoint executes server-side functions called by the voice agent.

Create the file `src/app/api/vivid/function/route.ts`:

```ts
import { createFunctionHandler } from '@worldstreet/vivid-voice/server'
// Import your server functions (defined in Step 9)
// import { serverFunctions } from '@/lib/vivid-functions'

export const POST = createFunctionHandler({
  // functions: serverFunctions,
})
```

> Uncomment the import and `functions` line after completing Step 9.

---

## Step 8 — Create the Providers Wrapper

Create the file `src/app/providers.tsx`:

```tsx
'use client'

import { VividProvider, VividWidget } from '@worldstreet/vivid-voice'
import { usePathname } from 'next/navigation'
// import { allFunctions } from '@/lib/vivid-functions'  // After Step 9

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const pathname = usePathname()

  return (
    <VividProvider
      pathname={pathname}
      voice="alloy"
      persistConversation={true}
      functions={[]}  // Replace with allFunctions after Step 9
      platformContext={(user, currentPath) => `
        You are on my application.
        Current page: ${currentPath}
        
        Help users navigate and use the app.
        Keep responses brief since users are listening.
      `}
    >
      {children}
      <VividWidget showTranscript={true} size="lg" />
    </VividProvider>
  )
}
```

### VividProvider Props Reference

| Prop | Type | Default | Description |
|---|---|---|---|
| `pathname` | `string` | `'/'` | Current route path |
| `voice` | `string` | `'alloy'` | OpenAI voice name |
| `functions` | `VoiceFunctionConfig[]` | `[]` | Functions the agent can call |
| `platformContext` | `(user, path) => string` | — | Custom system prompt context |
| `persistConversation` | `boolean` | `true` | Save conversation to localStorage |
| `maxHistoryLength` | `number` | `50` | Max conversation turns to persist |
| `requireAuth` | `boolean` | `false` | Require authentication |
| `user` | `VividUser \| null` | — | Current user object |
| `isSignedIn` | `boolean` | `true` | Whether user is authenticated |
| `onAuthRequired` | `() => void` | — | Callback when auth is needed |
| `tokenEndpoint` | `string` | `'/api/vivid/token'` | Token API route path |
| `classNames` | `VividWidgetClassNames` | — | Custom CSS classes |

### VividWidget Props Reference

| Prop | Type | Default | Description |
|---|---|---|---|
| `showTranscript` | `boolean` | `false` | Show conversation transcript |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Widget button size |
| `position` | `WidgetPosition` | — | Position overrides (`bottom`, `right`, etc.) |
| `classNames` | `VividWidgetClassNames` | — | Custom CSS classes |

### Custom Styling with classNames

```tsx
<VividProvider
  classNames={{
    container: 'fixed top-4 right-4 z-[2147483647]',
    button: 'rounded-full bg-blue-500 text-white',
    buttonActive: 'bg-red-500 animate-pulse',
    transcript: 'bg-white text-black rounded-xl shadow-2xl p-4 max-w-sm',
    status: '',
    visualizer: '',
  }}
>
```

---

## Step 9 — Define Voice Functions (Optional)

Create functions the voice agent can call. Two types:

- **Client functions** — Run in the browser (navigation, UI updates, alerts)
- **Server functions** — Run on the server via the `/api/vivid/function` route (DB queries, API calls)

Create the file `src/lib/vivid-functions.ts`:

```ts
import {
  createVividFunction,
  buildParameters,
  stringParam,
  numberParam,
} from '@worldstreet/vivid-voice/functions'
import type { VoiceFunctionConfig } from '@worldstreet/vivid-voice/functions'

// --- Client Functions (run in browser) ---

export const navigateToPage = createVividFunction({
  name: 'navigateToPage',
  description: 'Navigate to a different page in the application',
  parameters: buildParameters({
    path: stringParam('The URL path to navigate to', true),
  }),
  handler: async ({ path }) => {
    if (typeof window !== 'undefined') {
      window.location.href = path as string
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

// --- Server Functions (run on server) ---

export const searchItems = createVividFunction({
  name: 'searchItems',
  description: 'Search for items in the database',
  parameters: buildParameters({
    query: stringParam('Search query', true),
    limit: numberParam('Max results to return'),
  }),
  handler: async ({ query, limit = 10 }) => {
    // Replace with actual DB/API query
    return { query, results: [], totalFound: 0 }
  },
  executionContext: 'server',
})

// --- Export Collections ---

export const clientFunctions: VoiceFunctionConfig[] = [
  navigateToPage,
  showAlert,
]

export const serverFunctions: VoiceFunctionConfig[] = [
  searchItems,
]

export const allFunctions: VoiceFunctionConfig[] = [
  ...clientFunctions,
  ...serverFunctions,
]
```

### Parameter Helpers

| Helper | Usage |
|---|---|
| `stringParam(description, required?)` | String parameter |
| `numberParam(description, required?)` | Number parameter |
| `booleanParam(description, required?)` | Boolean parameter |
| `enumParam(description, options[], required?)` | Enum/select parameter |
| `buildParameters({...})` | Wraps params into JSON Schema |

After creating functions, update:

1. **`providers.tsx`** — Import and pass `allFunctions` to `<VividProvider functions={allFunctions}>`
2. **`api/vivid/function/route.ts`** — Import and pass `serverFunctions` to `createFunctionHandler({ functions: serverFunctions })`

---

## Step 10 — Update Root Layout

Wrap your app with the `Providers` component:

```tsx
// src/app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

---

## Step 11 — (Optional) Use the `useVivid` Hook

For custom UI or programmatic control:

```tsx
'use client'

import { useVivid } from '@worldstreet/vivid-voice'

export function MyComponent() {
  const {
    state,           // 'idle' | 'connecting' | 'ready' | 'listening' | 'processing' | 'speaking' | 'error'
    isConnected,
    isListening,
    isSpeaking,
    conversation,    // ConversationTurn[]
    lastTranscript,
    error,
    startSession,    // () => Promise<void>
    endSession,      // () => void
    clearHistory,    // () => void
    startListening,  // () => void
    stopListening,   // () => void
    getAudioLevels,  // () => Uint8Array | null
  } = useVivid()

  return (
    <div>
      <p>State: {state}</p>
      <button onClick={isConnected ? endSession : startSession}>
        {isConnected ? 'Disconnect' : 'Start Voice'}
      </button>
    </div>
  )
}
```

> Use `useVividOptional()` instead if the component might render outside of `VividProvider`.

---

## Step 12 — (Optional) Add Clerk Authentication

If your app uses Clerk for authentication:

```tsx
// src/app/providers.tsx
'use client'

import { VividProvider, VividWidget } from '@worldstreet/vivid-voice'
import { useUser, useAuth } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'
import { allFunctions } from '@/lib/vivid-functions'

export function Providers({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const { isSignedIn } = useAuth()
  const pathname = usePathname()

  return (
    <VividProvider
      requireAuth={true}
      user={user}
      isSignedIn={isSignedIn ?? false}
      onAuthRequired={() => { window.location.href = '/sign-in' }}
      pathname={pathname}
      functions={allFunctions}
      platformContext={(user, path) => `
        User: ${user?.firstName || 'Guest'}
        Page: ${path}
      `}
    >
      {children}
      <VividWidget showTranscript={true} size="lg" />
    </VividProvider>
  )
}
```

Secure the token endpoint:

```ts
// src/app/api/vivid/token/route.ts
import { createTokenHandler, createClerkValidator } from '@worldstreet/vivid-voice/server'
import { auth } from '@clerk/nextjs/server'

export const POST = createTokenHandler({
  openAIApiKey: process.env.OPENAI_API_KEY,
  validateRequest: createClerkValidator(auth),
})
```

---

## Verification Checklist

After completing all steps, verify:

- [ ] `vivid-voice` is built (`dist/` folder exists in `packages/vivid-voice/`)
- [ ] `npm install` succeeds in your project
- [ ] `npm run dev` starts without import errors
- [ ] Visiting your app shows the Vivid orb widget (bottom-right by default)
- [ ] Clicking the orb connects to OpenAI (check browser console for "Session created")
- [ ] Speaking into the mic produces a transcript
- [ ] The AI responds with audio

---

## Common Issues

| Problem | Fix |
|---|---|
| `Module not found: @worldstreet/vivid-voice` | Run `npm run build` in vivid-voice, then `npm install` in your project |
| `Module parse failed` / JSX errors | Add `transpilePackages: ['@worldstreet/vivid-voice']` to `next.config.ts` |
| Widget doesn't appear | Check that `<VividWidget>` is inside `<VividProvider>` |
| "Failed to create voice session" | Verify `OPENAI_API_KEY` in `.env.local` and that token route exists at `/api/vivid/token` |
| Three.js / WebGL errors | Install: `npm install three @react-three/fiber @react-three/drei @types/three` |
| Microphone not working | Must be on `https` or `localhost`. Check browser permissions. |
| Functions not executing | Check `executionContext` matches where the function can run. Server functions need the `/api/vivid/function` route. |
| `npm link` breaks after `npm install` | Re-run `npm link @worldstreet/vivid-voice` after any `npm install` |

---

## File Summary

After integration, your project should have these new/modified files:

```
your-nextjs-app/
├── .env.local                          ← OpenAI API key
├── next.config.ts                      ← Added transpilePackages
├── package.json                        ← Added @worldstreet/vivid-voice + three deps
└── src/
    ├── app/
    │   ├── layout.tsx                  ← Wrapped with <Providers>
    │   ├── providers.tsx               ← NEW: VividProvider + VividWidget
    │   └── api/
    │       └── vivid/
    │           ├── token/
    │           │   └── route.ts        ← NEW: createTokenHandler
    │           └── function/
    │               └── route.ts        ← NEW: createFunctionHandler
    └── lib/
        └── vivid-functions.ts          ← NEW: Voice function definitions
```
