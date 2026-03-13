# Install Dependencies

The `@privy-io/server-auth` package needs to be installed.

## Option 1: Use Command Prompt (Not PowerShell)

1. Open Command Prompt (cmd.exe) - NOT PowerShell
2. Navigate to your project:
   ```
   cd C:\Users\HP\Desktop\worldstreet-dashboard
   ```
3. Run:
   ```
   pnpm install
   ```

## Option 2: Use Git Bash

1. Open Git Bash
2. Navigate to your project
3. Run:
   ```
   pnpm install
   ```

## Option 3: Enable PowerShell Scripts (One Time)

Open PowerShell as Administrator and run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then you can use PowerShell normally.

## After Installation

Restart your dev server:
```
pnpm dev
```

The app should now work!
