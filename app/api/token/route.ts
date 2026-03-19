import {
  AccessToken,
  AccessTokenOptions,
  VideoGrant,
  AgentDispatchClient,
  RoomServiceClient,
} from "livekit-server-sdk";
import { NextResponse } from "next/server";

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL;

// Convert wss:// → https:// for REST API calls
function wsUrlToHttp(wsUrl: string): string {
  return wsUrl.replace(/^wss?:\/\//, "https://").replace(/^ws?:\/\//, "http://");
}

export type ConnectionDetails = {
  identity: string;
  accessToken: string;
};

export async function GET() {
  try {
    if (!LIVEKIT_URL) throw new Error("LIVEKIT_URL is not defined");
    if (!API_KEY) throw new Error("LIVEKIT_API_KEY is not defined");
    if (!API_SECRET) throw new Error("LIVEKIT_API_SECRET is not defined");

    const participantIdentity = `user_${Math.floor(Math.random() * 10_000)}`;
    const roomName = "mentera-voice-poc";
    const httpUrl = wsUrlToHttp(LIVEKIT_URL);

    // 1. Ensure the room exists (creates it if it doesn't)
    const roomService = new RoomServiceClient(httpUrl, API_KEY, API_SECRET);
    try {
      await roomService.createRoom({ name: roomName });
      console.log('[SERVER] Room ensured:', roomName);
    } catch {
      // Room may already exist — that's fine
    }

    // 2. Explicitly dispatch our voice agent to the room.
    //    In LiveKit Cloud v1.9+, agents are NOT auto-dispatched.
    //    We must call createDispatch() so the registered worker gets a job.
    const agentClient = new AgentDispatchClient(httpUrl, API_KEY, API_SECRET);
    try {
      const dispatch = await agentClient.createDispatch(roomName, "tera-dental-agent");
      console.log('[SERVER] Agent dispatched to room:', roomName, 'dispatch id:', dispatch.id);
    } catch (err: any) {
      // If dispatch already exists / agent already in room that's OK
      console.warn('[SERVER] Agent dispatch notice:', err?.message ?? err);
    }

    // 3. Generate participant JWT token
    const participantToken = await createParticipantToken(
      { identity: participantIdentity },
      roomName,
    );

    const data: ConnectionDetails = {
      identity: participantIdentity,
      accessToken: participantToken,
    };
    console.log('[SERVER] Token generated for', participantIdentity, 'in room:', roomName);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error) {
      console.error('[SERVER] Token route error:', error.message);
      return new NextResponse(error.message, { status: 500 });
    }
  }
}

function createParticipantToken(
  userInfo: AccessTokenOptions,
  roomName: string,
) {
  const at = new AccessToken(API_KEY, API_SECRET, {
    ...userInfo,
    ttl: "15m",
  });
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);
  return at.toJwt();
}