import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DashboardProfile from "@/models/DashboardProfile";
import { verifyToken } from "@/lib/auth-service";

/**
 * Helper: extract and verify the authenticated user from the request cookies.
 * Returns the auth user object or null.
 */
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
 * GET /api/profile
 * Fetch the current user's dashboard profile.
 * If no profile exists yet, auto-create one with defaults.
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    // Find or create the profile (upsert)
    let profile = await DashboardProfile.findOne({ authUserId: authUser.userId });

    if (!profile) {
      profile = await DashboardProfile.create({
        authUserId: authUser.userId,
        email: authUser.email,
        displayName: `${authUser.firstName || ""} ${authUser.lastName || ""}`.trim(),
      });
    }

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("[GET /api/profile] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/profile
 * Update the current user's dashboard profile.
 * Only allows updating specific fields.
 */
export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Whitelist of updatable fields
    const allowedFields = [
      "displayName",
      "avatarUrl",
      "bio",
      "preferredCurrency",
      "watchlist",
      "defaultChartInterval",
      "notifications",
      "theme",
      "dashboardLayout",
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid fields to update" },
        { status: 400 }
      );
    }

    await connectDB();

    const profile = await DashboardProfile.findOneAndUpdate(
      { authUserId: authUser.userId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!profile) {
      return NextResponse.json(
        { success: false, message: "Profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("[PATCH /api/profile] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
