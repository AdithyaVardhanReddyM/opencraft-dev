import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSubscriptionToken } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { userChannel } from "@/inngest/realtime";

export type RequestBody = {
  userId?: string;
  channelKey?: string;
};

/**
 * POST /api/realtime/reasoning-token
 * Issues a realtime subscription token scoped ONLY to the `agent_reasoning`
 * topic, used by the live "thinking" panel. Kept separate from
 * /api/realtime/token (which serves @inngest/use-agent's agent_stream) so the
 * two subscriptions stay fully isolated.
 */
export async function POST(req: NextRequest) {
  const { userId: authUserId } = await auth();

  if (!authUserId) {
    return NextResponse.json(
      { error: "Please sign in to create a token" },
      { status: 401 }
    );
  }

  try {
    const body = (await req.json()) as RequestBody;
    const { userId: requestUserId, channelKey } = body;

    const subscriptionChannelKey = channelKey || requestUserId;

    if (!subscriptionChannelKey) {
      return NextResponse.json(
        { error: "userId or channelKey is required" },
        { status: 400 }
      );
    }

    const token = await getSubscriptionToken(inngest, {
      channel: userChannel(subscriptionChannelKey),
      topics: ["agent_reasoning"],
    });

    return NextResponse.json(token);
  } catch {
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
