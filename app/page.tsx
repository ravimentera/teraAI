"use client";

import { ConnectionProvider, useConnection } from "@/hooks/use-connection";
import { VoiceShell } from "@/components/VoiceShell";
import { useState, useEffect } from "react";

function MainContent() {
  const { shouldConnect, wsUrl, token, connect, disconnect } = useConnection(); //hook to fetch an authentication token from the Next.js
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  if (shouldConnect && wsUrl && token) {
    return <VoiceShell url={wsUrl} token={token} onDisconnect={disconnect} />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-slate-950 font-sans">
      <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />
      <div className="max-w-md w-full z-10 space-y-8">
        <div className="space-y-2">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto shadow-2xl shadow-blue-500/20 mb-6" />
          <h1 className="text-3xl font-bold tracking-tight text-white">Mentera Voice</h1>
          <p className="text-sm text-slate-400">
            Phase 1 POC — Powered by LiveKit & Claude
          </p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl">
          <p className="text-sm text-slate-300 mb-6">
            Connecting to the local LiveKit agent. Make sure both the Next app and Voice Agent are running.
          </p>
          <button
            onClick={connect}
            className="w-full bg-white text-slate-900 font-semibold py-3 px-4 rounded-xl hover:bg-slate-100 transition-all shadow-lg shadow-white/10 active:scale-[0.98]"
          >
            Start Session
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <ConnectionProvider>
      <MainContent />
    </ConnectionProvider>
  );
}