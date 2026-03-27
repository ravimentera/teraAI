# 🦷 Tera AI: The Intelligent Voice Platform for Dental Practices

Tera AI is a state-of-the-art Voice AI Platform designed to revolutionize dental practice management. Built as a modular "Brain + Shell" architecture, Tera provides a low-latency, emotionally intelligent voice interface for patient scheduling, practice analytics, and clinical assistance.

---

## 🌟 Key Features

- **🚀 Real-Time Voice Interaction**: Powered by LiveKit for ultra-low latency audio streaming.
- **🧠 Emotionally Intelligent Brain**: Utilizes Anthropic's Claude 3.5 Sonnet to understand and mirror patient emotions (stress, excitement, pain).
- **🗣️ Premium Voice Output**: Crystal-clear, human-like voice synthesis via Cartesia.
- **📥 High-Speed Transcription**: Real-time STT using Deepgram.
- **📅 Dental-Specific Domain Knowledge**: Fine-tuned system prompts for scheduling, treatment protocols, and patient management.
- **✨ Premium UI/UX**: Next.js-based interface featuring an animated Voice Orb and real-time transcriptions.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | [Next.js](https://nextjs.org) | Premium React-based voice UI with animated orbs and live transcriptions. |
| **Connection** | [LiveKit](https://livekit.io) | Core RTC engine for room management and real-time audio/data streaming. |
| **STT** | [Deepgram](https://deepgram.com) | High-speed, low-latency Speech-to-Text for transcribing user input. |
| **TTS** | [Cartesia](https://cartesia.ai) | Ultra-premium, low-latency Text-to-Speech for Tera's voice output. |
| **LLM (Brain)** | [Anthropic](https://anthropic.com) | Claude 3.5 Sonnet for conversational intelligence and dental scheduling logic. |
| **Agent Framework** | [@livekit/agents](https://github.com/livekit/agents-node) | Orchestration layer for the voice pipeline. |

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18+ recommended.
- **pnpm**: Used for package management in the root.
- **npm**: Used within the `agent` directory.

### 2. Environment Configuration
Create a `.env` file in the root and another in the `agent/` directory with the following keys:

```env
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
NEXT_PUBLIC_LIVEKIT_URL=your_livekit_url
DEEPGRAM_API_KEY=your_deepgram_api_key
CARTESIA_API_KEY=your_cartesia_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 3. Installation
Install dependencies in both the root and the agent directory:

```bash
# Root dependencies
pnpm install

# Agent dependencies
cd agent
npm install
cd ..
```

### 4. Running the Development Environment
During development, you must run both the frontend and the agent backend simultaneously.

```bash
# Start both Frontend and Agent (using the root command)
pnpm run dev
```

Alternatively, run them in separate terminals:
- **Terminal 1 (Frontend):** `pnpm run dev:root`
- **Terminal 2 (Agent):** `pnpm run dev:agent`

---

## 🏗️ Project Structure

```text
├── agent/               # Node.js Voice Agent (LiveKit Agents SDK)
│   ├── agent.ts         # Main agent logic (STT/LLM/TTS pipeline)
│   └── package.json
├── app/                 # Next.js Application (App Router)
│   ├── api/             # API routes (LiveKit token generation)
│   └── page.tsx         # Connection entry point
├── brain/               # Intelligence Layer
│   ├── prompt.ts        # Comprehensive Tera System Prompts
│   └── providers/       # LLM provider implementations
├── components/          # React Components
│   ├── VoiceOrb.tsx     # Animated AI voice visualization
│   └── VoiceShell.tsx   # LiveKit Room orchestration
└── hooks/               # Custom React Hooks
```

---

## 📜 License
Private & Confidential. (c) 2024 Tera AI.

