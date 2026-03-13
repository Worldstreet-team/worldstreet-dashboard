#!/bin/bash

# Clerk + Privy Wallet Setup Script
# This script helps you set up the necessary keys and configuration

echo "=========================================="
echo "Clerk + Privy Wallet Setup"
echo "=========================================="
echo ""

# Step 1: Generate Authorization Keys
echo "Step 1: Generating Authorization Key Pair..."
echo ""

# Create keys directory if it doesn't exist
mkdir -p .keys

# Generate private key
openssl ecparam -name prime256v1 -genkey -noout -out .keys/privy-auth-private.pem

# Extract public key
openssl ec -in .keys/privy-auth-private.pem -pubout -out .keys/privy-auth-public.pem

echo "✓ Keys generated successfully!"
echo ""
echo "Private key: .keys/privy-auth-private.pem"
echo "Public key: .keys/privy-auth-public.pem"
echo ""

# Step 2: Display public key
echo "Step 2: Public Key (Add this to Privy Dashboard)"
echo "=========================================="
cat .keys/privy-auth-public.pem
echo "=========================================="
echo ""

# Step 3: Format private key for .env
echo "Step 3: Formatting private key for .env.local..."
echo ""

# Read private key and format it
PRIVATE_KEY=$(cat .keys/privy-auth-private.pem | tr '\n' '\\n')

echo "Add this to your .env.local file:"
echo "=========================================="
echo "PRIVY_AUTH_PRIVATE_KEY=\"$PRIVATE_KEY\""
echo "=========================================="
echo ""

# Step 4: Create .env.local template if it doesn't exist
if [ ! -f .env.local ]; then
    echo "Step 4: Creating .env.local template..."
    cat > .env.local << EOF
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Privy Configuration
PRIVY_APP_ID=
PRIVY_APP_SECRET=
PRIVY_AUTH_PRIVATE_KEY="$PRIVATE_KEY"
PRIVY_WEBHOOK_SECRET=

# Database
MONGODB_URI=

# Rate Limiting (Optional)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
EOF
    echo "✓ .env.local template created!"
else
    echo "Step 4: .env.local already exists, skipping..."
fi
echo ""

# Step 5: Add to .gitignore
echo "Step 5: Updating .gitignore..."
if ! grep -q ".keys/" .gitignore 2>/dev/null; then
    echo ".keys/" >> .gitignore
    echo "*.pem" >> .gitignore
    echo "✓ Added .keys/ and *.pem to .gitignore"
else
    echo "✓ .gitignore already configured"
fi
echo ""

# Step 6: Instructions
echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo ""
echo "1. Go to Privy Dashboard (https://dashboard.privy.io)"
echo "   - Navigate to Settings → Wallet API"
echo "   - Click 'Add Authorization Key'"
echo "   - Paste the public key shown above"
echo "   - Save the configuration"
echo ""
echo "2. Configure JWT Authentication in Privy:"
echo "   - Go to Settings → Login Methods"
echo "   - Enable 'Custom Auth' or 'JWT Authentication'"
echo "   - Add Clerk JWKS endpoint:"
echo "     https://[your-clerk-domain]/.well-known/jwks.json"
echo "   - Set 'sub' claim as user identifier"
echo ""
echo "3. Update .env.local with your credentials:"
echo "   - CLERK_SECRET_KEY (from Clerk Dashboard)"
echo "   - PRIVY_APP_ID (from Privy Dashboard)"
echo "   - PRIVY_APP_SECRET (from Privy Dashboard)"
echo "   - MONGODB_URI (your MongoDB connection string)"
echo ""
echo "4. Install dependencies:"
echo "   npm install @privy-io/server-auth @clerk/nextjs"
echo ""
echo "5. Start your development server:"
echo "   npm run dev"
echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
