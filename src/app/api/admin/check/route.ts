import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const ADMIN_EMAILS = (process.env.P2P_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    const email = user.emailAddresses?.[0]?.emailAddress?.toLowerCase() || "";
    const isAdmin = ADMIN_EMAILS.includes(email);

    return NextResponse.json({ isAdmin });
  } catch {
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}
