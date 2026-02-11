import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import UserToken from "@/models/UserToken";
import { verifyToken } from "@/lib/auth-service";

// ── Helper: Get authenticated user ─────────────────────────────────────────

async function getAuthUser(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken")?.value;
  if (!accessToken) return null;

  const result = await verifyToken(accessToken);
  if (result.success && result.data?.user) {
    return result.data.user;
  }
  return null;
}

/**
 * GET /api/tokens/custom
 * Fetch user's custom tokens
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const tokens = await UserToken.find({
      userId: user.userId,
      isHidden: false,
    }).sort({ addedAt: -1 });

    return NextResponse.json({ tokens });
  } catch (error) {
    console.error("Error fetching custom tokens:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom tokens" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tokens/custom
 * Add a new custom token
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { chain, address, symbol, name, decimals, logoURI, coingeckoId } = body;

    // Validate required fields
    if (!chain || !address || !symbol || !name || decimals === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: chain, address, symbol, name, decimals" },
        { status: 400 }
      );
    }

    if (!["ethereum", "solana"].includes(chain)) {
      return NextResponse.json(
        { error: "Invalid chain. Must be 'ethereum' or 'solana'" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if token already exists for this user
    const existing = await UserToken.findOne({
      userId: user.userId,
      chain,
      address: address.toLowerCase(),
    });

    if (existing) {
      // If it was hidden, unhide it
      if (existing.isHidden) {
        existing.isHidden = false;
        await existing.save();
        return NextResponse.json({ token: existing, message: "Token restored" });
      }
      return NextResponse.json(
        { error: "Token already added" },
        { status: 409 }
      );
    }

    // Create new custom token
    const token = await UserToken.create({
      userId: user.userId,
      chain,
      address: address.toLowerCase(),
      symbol: symbol.toUpperCase(),
      name,
      decimals,
      logoURI: logoURI || "",
      coingeckoId: coingeckoId || "",
    });

    return NextResponse.json({ token }, { status: 201 });
  } catch (error) {
    console.error("Error adding custom token:", error);
    return NextResponse.json(
      { error: "Failed to add custom token" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tokens/custom
 * Update a custom token (hide/unhide)
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tokenId, isHidden } = body;

    if (!tokenId) {
      return NextResponse.json({ error: "Token ID required" }, { status: 400 });
    }

    await connectDB();

    const token = await UserToken.findOneAndUpdate(
      { _id: tokenId, userId: user.userId },
      { isHidden: isHidden ?? true },
      { new: true }
    );

    if (!token) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Error updating custom token:", error);
    return NextResponse.json(
      { error: "Failed to update custom token" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tokens/custom
 * Permanently delete a custom token
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get("tokenId");

    if (!tokenId) {
      return NextResponse.json({ error: "Token ID required" }, { status: 400 });
    }

    await connectDB();

    const result = await UserToken.deleteOne({
      _id: tokenId,
      userId: user.userId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting custom token:", error);
    return NextResponse.json(
      { error: "Failed to delete custom token" },
      { status: 500 }
    );
  }
}
