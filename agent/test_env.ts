import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const url = process.env.NEXT_PUBLIC_LIVEKIT_URL || "";
const apiKey = process.env.LIVEKIT_API_KEY || "";
const apiSecret = process.env.LIVEKIT_API_SECRET || "";

async function test() {
  console.log('--- Environment Check ---');
  console.log('LiveKit URL:', url);
  console.log('API Key:', apiKey ? '✅ Present' : '❌ Missing');
  console.log('API Secret:', apiSecret ? '✅ Present' : '❌ Missing');
  console.log('Anthropic Key:', process.env.ANTHROPIC_API_KEY ? '✅ Present' : '❌ Missing');
  console.log('Deepgram Key:', process.env.DEEPGRAM_API_KEY ? '✅ Present' : '❌ Missing');
  console.log('Cartesia Key:', process.env.CARTESIA_API_KEY ? '✅ Present' : '❌ Missing');
}

test();
