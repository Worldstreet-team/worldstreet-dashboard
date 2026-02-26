@echo off
echo Clearing Next.js cache and rebuilding...
echo.

echo Step 1: Stopping any running dev servers...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Step 2: Deleting .next folder...
if exist .next (
    rmdir /s /q .next
    echo .next folder deleted successfully
) else (
    echo .next folder not found
)

echo Step 3: Clearing npm cache...
call npm cache clean --force

echo.
echo Cache cleared! Now run: npm run dev
echo.
pause
