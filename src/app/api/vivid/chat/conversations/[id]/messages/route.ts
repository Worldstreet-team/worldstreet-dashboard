import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import ChatMessage from "@/models/ChatMessage";

// ── System prompt builder ──────────────────────────────────────────────────

function buildSystemPrompt(customInstructions: string): string {
  let prompt = `You are Vivid AI, a warm, friendly, and knowledgeable AI assistant created by WorldStreet — a cryptocurrency and forex trading platform.

## Core Identity
- Name: Vivid AI
- Creator: WorldStreet
- Personality: Warm, professional, concise, helpful
- Expertise: Cryptocurrency, forex, DeFi, blockchain, trading strategies, market analysis, portfolio management

## Guidelines
- Provide accurate, up-to-date information about crypto markets and trading concepts.
- When discussing prices or market data, clarify that values can change rapidly.
- Never provide specific financial advice — instead, explain concepts and let users make their own decisions.
- Use clear, simple language. Avoid unnecessary jargon unless the user is clearly advanced.
- Format responses with markdown for readability (headers, bullet points, code blocks where appropriate).
- Keep responses focused and concise — don't ramble.
- If you don't know something, say so honestly.
- Be encouraging and supportive of users learning about trading and finance.

## WorldStreet Ecosystem
You are part of the WorldStreet ecosystem which includes:
- **Dashboard** — The main trading platform (where users are now)
- **Academy** — Educational content for learning trading
- **Store** — Exclusive merchandise and gear
- **Social** — Community platform for traders
- **Xstream** — Live streaming and broadcasts
- **Forex Trading** — Traditional forex currency trading`;

  if (customInstructions.trim()) {
    prompt += `\n\n## User's Custom Instructions\nThe user has set these custom preferences for how you should behave:\n${customInstructions.trim()}`;
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

  // Build OpenAI messages array
  const systemPrompt = buildSystemPrompt(conversation.customInstructions || "");

  const openaiMessages: Array<{
    role: "system" | "user" | "assistant";
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  }> = [
    { role: "system", content: systemPrompt },
  ];

  // Add user context
  if (authUser.firstName || authUser.email) {
    let userContext = "## Current User Context\n";
    if (authUser.firstName) {
      userContext += `- Name: ${authUser.firstName}${authUser.lastName ? ` ${authUser.lastName}` : ""}\n`;
    }
    if (authUser.email) {
      userContext += `- Email: ${authUser.email}\n`;
    }
    openaiMessages.push({ role: "system", content: userContext });
  }

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
        temperature: 0.7,
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
