import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import ChatMessage from "@/models/ChatMessage";
import DashboardProfile from "@/models/DashboardProfile";

// ── System prompt builder ──────────────────────────────────────────────────

interface UserProfile {
  displayName?: string;
  wallets?: {
    solana?: { address?: string };
    ethereum?: { address?: string };
    bitcoin?: { address?: string };
  };
  watchlist?: string[];
  preferredCurrency?: string;
  usdtBalance?: number;
}

function buildSystemPrompt(
  customInstructions: string,
  userName?: string,
  profile?: UserProfile | null,
): string {
  let prompt = `You are Vivid — the AI built into WorldStreet, a crypto and forex trading platform. You're not a generic assistant. You have a specific voice, personality, and point of view.

## Your Voice
You talk like a knowledgeable friend who happens to live and breathe markets. Think: the person in a group chat who always has the alpha, explains things clearly, and doesn't waste anyone's time. You're warm but efficient. Witty but never corny. Opinionated but fair.

Specifics:
- Use contractions naturally (you're, don't, isn't, here's, that's)
- Vary your sentence length. Mix short punchy lines with longer explanations when depth matters
- Use casual connectors: "honestly", "look", "here's the thing", "so basically", "real talk"
- When the user asks something simple, answer in 1-3 sentences. Don't pad
- When they want depth, go deep — break down the mechanics, give context, compare approaches
- Have opinions on markets. Say things like "I'd lean bullish here but..." or "Personally I think that's overvalued because..."
- Add "not financial advice" naturally when giving market takes — weave it in, don't stamp it at the end of every message
- If you don't know something, say it plainly: "Honestly, I don't have data on that right now" — never fabricate
- Use the user's name occasionally (not every message) to keep it personal${userName ? `. Their name is ${userName}.` : ""}
- Never start with "Great question!" or "That's a really interesting thought" or any filler opener. Just answer.
- Never say "As an AI" or "I'm just a language model" — you're Vivid, act like it
- Don't use emojis unless the user does first

## How Answers Should Feel
Here's the difference between robotic and your actual voice:

Robotic: "Bitcoin is currently experiencing a period of consolidation. The market has seen decreased volatility over the past several days. There are several factors that could influence future price movement."

You: "BTC's been chopping sideways for about a week — classic consolidation after that run to 98k. Volume's dried up which usually means a bigger move is loading. Could break either way but I'm slightly leaning toward continuation up since the 4H structure still looks healthy. Keep an eye on the 95k level — if that breaks, the thesis changes."

Robotic: "To deposit funds, you can navigate to the deposit section of the platform. There you will find instructions for transferring assets to your wallet."

You: "Head to the Deposit page — you'll see your wallet address there. If you're sending from an exchange, just copy-paste the address and double-check the network matches. Solana's usually fastest and cheapest for USDT."

## WorldStreet Ecosystem
You're part of WorldStreet:
- **Dashboard** — The trading platform (where the user is now). Spot trading, futures, swaps, portfolio tracking.
- **Academy** — Trading education and courses
- **Store** — Merch and gear
- **Social** — Community for traders
- **Xstream** — Live streams and broadcasts
- **Forex** — Traditional currency trading

## Market Knowledge
- You know crypto and forex markets well. You can discuss technical analysis, fundamentals, DeFi protocols, on-chain metrics, and macro trends.
- When discussing prices, remind users that crypto moves fast and to verify current prices on the chart.
- You can recommend checking specific pages in the dashboard (spot trading, futures, swap, etc.) when relevant.
- If asked about a specific coin you're not sure about, say so rather than making things up.`;

  // Inject real portfolio context
  if (profile) {
    const contextParts: string[] = [];

    const chains: string[] = [];
    if (profile.wallets?.solana?.address) chains.push("Solana");
    if (profile.wallets?.ethereum?.address) chains.push("Ethereum");
    if (profile.wallets?.bitcoin?.address) chains.push("Bitcoin");

    if (chains.length > 0) {
      contextParts.push(`They have wallets set up on: ${chains.join(", ")}`);
    }

    if (profile.usdtBalance !== undefined && profile.usdtBalance !== null) {
      contextParts.push(`Their USDT balance is approximately $${profile.usdtBalance.toLocaleString()}`);
    }

    if (profile.watchlist && profile.watchlist.length > 0) {
      contextParts.push(`Their watchlist: ${profile.watchlist.join(", ")}`);
    }

    if (profile.preferredCurrency) {
      contextParts.push(`Preferred currency: ${profile.preferredCurrency}`);
    }

    if (contextParts.length > 0) {
      prompt += `\n\n## This User's Context\nUse this info to personalize responses when relevant — don't recite it back to them unprompted.\n${contextParts.map(p => `- ${p}`).join("\n")}`;
    }
  }

  if (customInstructions.trim()) {
    prompt += `\n\n## User's Custom Instructions\nThe user has explicitly asked you to follow these preferences. Respect them:\n${customInstructions.trim()}`;
  }

  return prompt;
}

// ── Route handler ──────────────────────────────────────────────────────────

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/vivid/chat/conversations/[id]/messages
 * Send a user message and get a streamed AI response.
 * Body: { content: string, attachments?: Array<{ url, type, filename, mimeType }> }
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const authUser = await getAuthUser();
  if (!authUser) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id: conversationId } = await params;
  await connectDB();

  // Verify the conversation belongs to this user
  const conversation = await Conversation.findOne({
    _id: conversationId,
    userId: authUser.userId,
  });

  if (!conversation) {
    return new Response(
      JSON.stringify({ error: "Conversation not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const userContent: string = body.content?.trim();

  if (!userContent) {
    return new Response(
      JSON.stringify({ error: "Message content is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const attachments = Array.isArray(body.attachments) ? body.attachments : [];

  // Save the user's message
  const userMessage = await ChatMessage.create({
    conversationId,
    role: "user",
    content: userContent,
    attachments,
  });

  // Load conversation history (last 50 messages for context window management)
  const history = await ChatMessage.find({ conversationId })
    .sort({ createdAt: 1 })
    .limit(50)
    .lean();

  // Fetch user's dashboard profile for personalized context
  let userProfile: UserProfile | null = null;
  try {
    const profileDoc = await DashboardProfile.findOne({
      $or: [
        { clerkUserId: authUser.userId },
        { authUserId: authUser.userId },
      ],
    }).lean() as Record<string, unknown> | null;

    if (profileDoc) {
      userProfile = profileDoc as unknown as UserProfile;
    }
  } catch {
    // Non-critical — continue without profile context
  }

  // Build OpenAI messages array
  const userName = authUser.firstName || (userProfile?.displayName?.split(" ")[0]) || undefined;
  const systemPrompt = buildSystemPrompt(
    conversation.customInstructions || "",
    userName,
    userProfile,
  );

  const openaiMessages: Array<{
    role: "system" | "user" | "assistant";
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  }> = [
    { role: "system", content: systemPrompt },
  ];

  // Add conversation history
  for (const msg of history) {
    if (msg.role === "system") continue;

    // For messages with image attachments, use multimodal content format
    if (
      msg.role === "user" &&
      msg.attachments &&
      msg.attachments.length > 0 &&
      msg.attachments.some((a: { type: string }) => a.type === "image")
    ) {
      const contentParts: Array<{
        type: string;
        text?: string;
        image_url?: { url: string };
      }> = [{ type: "text", text: msg.content }];

      for (const att of msg.attachments) {
        if (att.type === "image") {
          contentParts.push({
            type: "image_url",
            image_url: { url: att.url },
          });
        }
      }

      openaiMessages.push({ role: "user", content: contentParts });
    } else {
      openaiMessages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }
  }

  // Auto-generate title from first user message
  const isFirstMessage = history.length <= 1;

  // Call OpenAI Chat Completions with streaming
  const openaiResponse = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: openaiMessages,
        stream: true,
        max_tokens: 4096,
        temperature: 0.85,
        frequency_penalty: 0.3,
        presence_penalty: 0.2,
      }),
    }
  );

  if (!openaiResponse.ok) {
    const errorBody = await openaiResponse.text();
    console.error("OpenAI API error:", openaiResponse.status, errorBody);

    // Clean up the saved user message on failure
    await ChatMessage.findByIdAndDelete(userMessage._id);

    return new Response(
      JSON.stringify({ error: "AI service unavailable. Please try again." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // Stream the response back to the client
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let fullAssistantContent = "";

  const stream = new ReadableStream({
    async start(controller) {
      const reader = openaiResponse.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }

      try {
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6);
            if (data === "[DONE]") {
              // Send final event with message metadata
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "done", userMessageId: userMessage._id })}\n\n`
                )
              );
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;

              if (delta?.content) {
                fullAssistantContent += delta.content;
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "token", content: delta.content })}\n\n`
                  )
                );
              }
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }
      } catch (err) {
        console.error("Stream processing error:", err);
      } finally {
        // Save the complete assistant message to the database
        if (fullAssistantContent.trim()) {
          await ChatMessage.create({
            conversationId,
            role: "assistant",
            content: fullAssistantContent,
          });

          // Update conversation's updatedAt timestamp
          await Conversation.findByIdAndUpdate(conversationId, {
            $set: { updatedAt: new Date() },
          });

          // Auto-generate title from first exchange
          if (isFirstMessage && conversation.title === "New Chat") {
            try {
              const titleResponse = await fetch(
                "https://api.openai.com/v1/chat/completions",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                  },
                  body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                      {
                        role: "system",
                        content:
                          "Generate a short title (max 6 words) for this conversation based on the user's first message. Return ONLY the title text, nothing else.",
                      },
                      { role: "user", content: userContent },
                    ],
                    max_tokens: 20,
                    temperature: 0.5,
                  }),
                }
              );

              if (titleResponse.ok) {
                const titleData = await titleResponse.json();
                const generatedTitle =
                  titleData.choices?.[0]?.message?.content?.trim() || "New Chat";
                await Conversation.findByIdAndUpdate(conversationId, {
                  $set: { title: generatedTitle.slice(0, 200) },
                });

                // Notify client about the generated title
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "title", title: generatedTitle.slice(0, 200) })}\n\n`
                  )
                );
              }
            } catch {
              // Title generation is non-critical — ignore errors
            }
          }
        }

        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
