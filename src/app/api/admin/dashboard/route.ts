import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Deposit from "@/models/Deposit";
import Withdrawal from "@/models/Withdrawal";
import TreasuryWallet from "@/models/TreasuryWallet";
import {
  getSolBalance,
  getUsdtBalance,
  getEthBalance,
  getEthUsdtBalance,
} from "@/lib/treasury";

const ADMIN_EMAILS = (process.env.P2P_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email =
      user.emailAddresses?.[0]?.emailAddress?.toLowerCase() || "";
    if (!ADMIN_EMAILS.includes(email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    // ── Deposit stats ──────────────────────────────────────────────────────
    const [
      depositTotal,
      depositPending,
      depositCompleted,
      depositFailed,
      depositToday,
      depositWeek,
    ] = await Promise.all([
      Deposit.countDocuments(),
      Deposit.countDocuments({
        status: {
          $in: [
            "pending",
            "awaiting_verification",
            "verifying",
            "payment_confirmed",
            "sending_usdt",
          ],
        },
      }),
      Deposit.countDocuments({ status: "completed" }),
      Deposit.countDocuments({
        status: { $in: ["payment_failed", "delivery_failed"] },
      }),
      Deposit.aggregate([
        { $match: { createdAt: { $gte: todayStart } } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            total: { $sum: "$usdtAmount" },
          },
        },
      ]),
      Deposit.aggregate([
        { $match: { createdAt: { $gte: weekStart } } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            total: { $sum: "$usdtAmount" },
          },
        },
      ]),
    ]);

    const depositTodayStats = depositToday[0] || { count: 0, total: 0 };
    const depositWeekStats = depositWeek[0] || { count: 0, total: 0 };

    // ── Withdrawal stats ───────────────────────────────────────────────────
    const [
      withdrawalTotal,
      withdrawalPending,
      withdrawalAwaitingVerification,
      withdrawalCompleted,
      withdrawalToday,
      withdrawalWeek,
    ] = await Promise.all([
      Withdrawal.countDocuments(),
      Withdrawal.countDocuments({
        status: { $in: ["pending", "usdt_sent", "processing"] },
      }),
      Withdrawal.countDocuments({ status: "tx_verified" }),
      Withdrawal.countDocuments({ status: "completed" }),
      Withdrawal.aggregate([
        { $match: { createdAt: { $gte: todayStart } } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            total: { $sum: "$usdtAmount" },
          },
        },
      ]),
      Withdrawal.aggregate([
        { $match: { createdAt: { $gte: weekStart } } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            total: { $sum: "$usdtAmount" },
          },
        },
      ]),
    ]);

    const withdrawalTodayStats = withdrawalToday[0] || { count: 0, total: 0 };
    const withdrawalWeekStats = withdrawalWeek[0] || { count: 0, total: 0 };

    // ── Treasury info ──────────────────────────────────────────────────────
    const [solTreasury, ethTreasury] = await Promise.all([
      TreasuryWallet.findOne({ isActive: true, network: "solana" }).lean(),
      TreasuryWallet.findOne({ isActive: true, network: "ethereum" }).lean(),
    ]);

    let solanaTreasury = null;
    if (solTreasury) {
      try {
        const [solBal, usdtBal] = await Promise.all([
          getSolBalance(solTreasury.address),
          getUsdtBalance(solTreasury.address),
        ]);
        solanaTreasury = {
          address: solTreasury.address,
          solBalance: solBal,
          usdtBalance: usdtBal,
          isActive: true,
        };
      } catch {
        solanaTreasury = {
          address: solTreasury.address,
          solBalance: 0,
          usdtBalance: 0,
          isActive: true,
        };
      }
    }

    let ethereumTreasury = null;
    if (ethTreasury) {
      try {
        const [ethBal, usdtBal] = await Promise.all([
          getEthBalance(ethTreasury.address),
          getEthUsdtBalance(ethTreasury.address),
        ]);
        ethereumTreasury = {
          address: ethTreasury.address,
          ethBalance: ethBal,
          usdtBalance: usdtBal,
          isActive: true,
        };
      } catch {
        ethereumTreasury = {
          address: ethTreasury.address,
          ethBalance: 0,
          usdtBalance: 0,
          isActive: true,
        };
      }
    }

    // ── Recent activity ────────────────────────────────────────────────────
    const [recentDeposits, recentWithdrawals] = await Promise.all([
      Deposit.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("email usdtAmount status createdAt")
        .lean(),
      Withdrawal.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("email usdtAmount status chain createdAt")
        .lean(),
    ]);

    const recentActivity = [
      ...recentDeposits.map((d: any) => ({
        id: d._id.toString(),
        type: "deposit" as const,
        email: d.email,
        usdtAmount: d.usdtAmount,
        status: d.status,
        createdAt: d.createdAt.toISOString(),
      })),
      ...recentWithdrawals.map((w: any) => ({
        id: w._id.toString(),
        type: "withdrawal" as const,
        email: w.email,
        usdtAmount: w.usdtAmount,
        status: w.status,
        chain: w.chain,
        createdAt: w.createdAt.toISOString(),
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 10);

    return NextResponse.json({
      deposits: {
        total: depositTotal,
        totalAmount: depositTodayStats.total + depositWeekStats.total,
        pending: depositPending,
        completed: depositCompleted,
        failed: depositFailed,
        todayCount: depositTodayStats.count,
        todayAmount: depositTodayStats.total,
        weekCount: depositWeekStats.count,
        weekAmount: depositWeekStats.total,
      },
      withdrawals: {
        total: withdrawalTotal,
        totalAmount: withdrawalTodayStats.total + withdrawalWeekStats.total,
        pending: withdrawalPending,
        awaitingVerification: withdrawalAwaitingVerification,
        completed: withdrawalCompleted,
        todayCount: withdrawalTodayStats.count,
        todayAmount: withdrawalTodayStats.total,
        weekCount: withdrawalWeekStats.count,
        weekAmount: withdrawalWeekStats.total,
      },
      treasury: {
        solana: solanaTreasury,
        ethereum: ethereumTreasury,
      },
      recentActivity,
    });
  } catch (err) {
    console.error("Admin dashboard error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
