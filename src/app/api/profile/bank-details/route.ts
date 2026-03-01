import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DashboardProfile from "@/models/DashboardProfile";

// ── GET: Retrieve user's saved bank details ────────────────────────────────

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const profile = await DashboardProfile.findOne({ authUserId: userId })
      .select("savedBankDetails")
      .lean();

    return NextResponse.json({
      bankDetails: profile?.savedBankDetails || [],
    });
  } catch (err) {
    console.error("Bank details GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── POST: Add a new bank detail entry ──────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const { bankName, accountNumber, accountName, isDefault } = body;

    if (!bankName || !accountNumber || !accountName) {
      return NextResponse.json(
        { error: "bankName, accountNumber, and accountName are required" },
        { status: 400 }
      );
    }

    const profile = await DashboardProfile.findOne({ authUserId: userId });
    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    if ((profile.savedBankDetails?.length || 0) >= 3) {
      return NextResponse.json(
        { error: "Maximum 3 bank details allowed. Delete one before adding a new one." },
        { status: 400 }
      );
    }

    // Check for duplicate account number
    const duplicate = profile.savedBankDetails?.find(
      (b: any) => b.accountNumber === accountNumber && b.bankName === bankName
    );
    if (duplicate) {
      return NextResponse.json(
        { error: "This bank account is already saved" },
        { status: 400 }
      );
    }

    // If this is the first or set as default, clear other defaults
    if (isDefault || !profile.savedBankDetails?.length) {
      profile.savedBankDetails?.forEach((b: any) => {
        b.isDefault = false;
      });
    }

    profile.savedBankDetails = [
      ...(profile.savedBankDetails || []),
      {
        bankName,
        accountNumber,
        accountName,
        isDefault: isDefault || !profile.savedBankDetails?.length,
      },
    ];

    await profile.save();

    return NextResponse.json({
      success: true,
      bankDetails: profile.savedBankDetails,
    });
  } catch (err) {
    console.error("Bank details POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── DELETE: Remove a saved bank detail ─────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const url = new URL(req.url);
    const accountNumber = url.searchParams.get("accountNumber");
    const bankName = url.searchParams.get("bankName");

    if (!accountNumber || !bankName) {
      return NextResponse.json(
        { error: "accountNumber and bankName are required" },
        { status: 400 }
      );
    }

    const profile = await DashboardProfile.findOne({ authUserId: userId });
    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    const originalLength = profile.savedBankDetails?.length || 0;
    profile.savedBankDetails = (profile.savedBankDetails || []).filter(
      (b: any) =>
        !(b.accountNumber === accountNumber && b.bankName === bankName)
    );

    if (profile.savedBankDetails.length === originalLength) {
      return NextResponse.json(
        { error: "Bank detail not found" },
        { status: 404 }
      );
    }

    // If we removed the default, set the first remaining as default
    if (
      profile.savedBankDetails.length > 0 &&
      !profile.savedBankDetails.some((b: any) => b.isDefault)
    ) {
      profile.savedBankDetails[0].isDefault = true;
    }

    await profile.save();

    return NextResponse.json({
      success: true,
      bankDetails: profile.savedBankDetails,
    });
  } catch (err) {
    console.error("Bank details DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
