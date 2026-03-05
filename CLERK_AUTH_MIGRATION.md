# Clerk Authentication Migration - Complete

## Issue
The spot trading API routes were using NextAuth for authentication, but the project uses Clerk.

## Error Messages
```
Module not found: Can't resolve 'next-auth'
Module not found: Can't resolve '@/app/api/auth/[...nextauth]/route'
```

## Solution Applied

### Changed Authentication Pattern

**Before (NextAuth):**
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const session = await getServerSession(authOptions);
if (!session?.user?.email) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Use session.user.email as userId
```

**After (Clerk):**
```typescript
import { getAuthUser } from '@/lib/auth';

const authUser = await getAuthUser();
if (!authUser) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Use authUser.userId as userId
```

### Changed Database Import

**Before:**
```typescript
import dbConnect from '@/lib/mongodb';
await dbConnect();
```

**After:**
```typescript
import { connectDB } from '@/lib/mongodb';
await connectDB();
```

## Files Updated

### API Routes
1. `src/app/api/spot/trades/route.ts`
   - Changed auth from NextAuth to Clerk
   - Updated userId references from `session.user.email` to `authUser.userId`
   - Fixed MongoDB import

2. `src/app/api/spot/positions/route.ts`
   - Changed auth from NextAuth to Clerk
   - Updated userId references
   - Fixed MongoDB import

3. `src/app/api/spot/positions/[id]/route.ts`
   - Changed auth from NextAuth to Clerk
   - Updated userId references
   - Fixed MongoDB import

4. `src/app/api/spot/monitor/route.ts`
   - Changed auth from NextAuth to Clerk
   - Updated userId references
   - Removed unused `request` parameter from GET

## Authentication Helper

The project uses a centralized auth helper at `src/lib/auth.ts`:

```typescript
import { auth, currentUser } from "@clerk/nextjs/server";

export interface AuthUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  if (!user) return null;

  return {
    userId: user.id,
    email: user.emailAddresses[0]?.emailAddress || "",
    firstName: user.firstName || "",
    lastName: user.lastName || "",
  };
}
```

## User ID Changes

All database records now use Clerk's `userId` (user.id) instead of email:

**Before:**
- SpotTrade.userId = session.user.email
- SpotPosition.userId = session.user.email

**After:**
- SpotTrade.userId = authUser.userId (Clerk user ID)
- SpotPosition.userId = authUser.userId (Clerk user ID)

## Verification

All files now compile without errors:
- ✅ src/app/api/spot/trades/route.ts
- ✅ src/app/api/spot/positions/route.ts
- ✅ src/app/api/spot/positions/[id]/route.ts
- ✅ src/app/api/spot/monitor/route.ts

## Testing Considerations

When testing, ensure:
1. User is authenticated via Clerk
2. Database queries use Clerk userId (not email)
3. Existing data may need migration if it used email as userId

## Migration Notes

If you have existing data in MongoDB that uses email as userId, you may need to run a migration script to update the userId field to use Clerk's user ID instead.

---

**Status:** ✅ COMPLETE
**Date:** March 5, 2026
