import { NextRequest, NextResponse } from "next/server";
import { changePassword } from "@/lib/auth-service";

/**
 * POST /api/auth/change-password
 * Change user password (proxies to auth service)
 */
export async function POST(request: NextRequest) {
  try {
    // Get access token from cookie
    const accessToken = request.cookies.get("accessToken")?.value;
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: "Current password and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Call auth service to change password
    const result = await changePassword(accessToken, currentPassword, newPassword);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Password changed successfully",
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.message || "Failed to change password" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred while changing password" },
      { status: 500 }
    );
  }
}
