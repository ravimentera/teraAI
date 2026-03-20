"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  LiveKitRoom,
  useVoiceAssistant,
  useLocalParticipant,
  useRoomContext,
  BarVisualizer,
  useTrackTranscription,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { TranscriptEntry, TranscriptPanel } from './TranscriptPanel';
import { VoiceOrb, VoiceState } from './VoiceOrb';

function AgentTranscription({ audioTrack, onSegments }: { audioTrack: any, onSegments: (s: any[]) => void }) {
  const transcriptions = useTrackTranscription({
    publication: audioTrack,
    source: Track.Source.Microphone,
    participant: audioTrack.participant,
  });
  useEffect(() => {
    onSegments(transcriptions.segments);
  }, [transcriptions.segments, onSegments]);
  return null;
}

function LocalTranscription({ localParticipant, onSegments }: { localParticipant: any, onSegments: (s: any[]) => void }) {
  const pub = localParticipant.getTrackPublication(Track.Source.Microphone);
  const transcriptions = useTrackTranscription({
    publication: pub,
    source: Track.Source.Microphone,
    participant: localParticipant,
  });
  useEffect(() => {
    onSegments(transcriptions.segments);
  }, [transcriptions.segments, onSegments]);
  return null;
}

function VoiceShellInner() {
  const room = useRoomContext();
  const { state: agentState, audioTrack } = useVoiceAssistant();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  
  useEffect(() => {
    console.log('[DEBUG-FE] Agent State:', agentState);
  }, [agentState]);

  useEffect(() => {
    if (audioTrack) {
        console.log('[DEBUG-FE] Agent Audio Track Available:', audioTrack.publication?.trackSid);
    }
  }, [audioTrack]);

  useEffect(() => {
    console.log('[DEBUG-FE] Mic Enabled:', isMicrophoneEnabled);
  }, [isMicrophoneEnabled]);

  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [orbState, setOrbState] = useState<VoiceState>('idle');

  const [userSegments, setUserSegments] = useState<any[]>([]);
  const [agentSegments, setAgentSegments] = useState<any[]>([]);

  const handleUserSegments = useCallback((segments: any[]) => {
    if (segments.length > 0) {
        console.log('[DEBUG-FE] User Segments Received:', segments.length);
    }
    setUserSegments(segments);
  }, []);

  const handleAgentSegments = useCallback((segments: any[]) => {
    if (segments.length > 0) {
        console.log('[DEBUG-FE] Agent Segments Received:', segments.length);
    }
    setAgentSegments(segments);
  }, []);

  // Sync LiveKit Agent State -> VoiceOrb State
  useEffect(() => {
    if (agentState === 'listening') setOrbState('listening');
    else if (agentState === 'speaking' || agentState === 'thinking') setOrbState('speaking');
    else if (agentState === 'initializing' || agentState === 'connecting') setOrbState('connecting');
    else setOrbState('idle');
  }, [agentState]);

  // Consolidate transcripts
  useEffect(() => {
    const newEntries: TranscriptEntry[] = [];
    
    // User Segments
    userSegments.forEach(s => {
      if (s.text.trim()) {
        newEntries.push({
          id: s.id,
          speaker: 'user',
          text: s.text,
          isFinal: s.final,
        });
      }
    });

    // Agent Segments
    agentSegments.forEach(s => {
      if (s.text.trim()) {
        newEntries.push({
          id: s.id,
          speaker: 'agent',
          text: s.text,
          isFinal: s.final,
        });
      }
    });

    setEntries(newEntries);
  }, [userSegments, agentSegments]);

  return (
    <div className="flex flex-col h-full w-full justify-between items-center py-8">
      
      {/* Hidden Transcription Hook Mounts */}
      {audioTrack?.participant && (
        <AgentTranscription audioTrack={audioTrack} onSegments={handleAgentSegments} />
      )}
      {localParticipant && (
        <LocalTranscription localParticipant={localParticipant} onSegments={handleUserSegments} />
      )}
      
      {/* Top Header / Brain Status */}
      <div className="flex flex-col items-center justify-center space-y-1 z-10">
        <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold tracking-wide uppercase flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Brain: Tera Dental (POC)
        </div>
      </div>

      {/* Center: Transcript */}
      <div className="flex-1 w-full max-h-[50vh] flex flex-col pt-8">
        <TranscriptPanel entries={entries} />
      </div>

      {/* Bottom: Voice Orb & Controls */}
      <div className="flex flex-col items-center justify-center space-y-8 z-10 w-full">
        
        {audioTrack && (
           <div className="h-4 w-48 opacity-50">
             <BarVisualizer state={agentState} trackRef={audioTrack} barCount={5} options={{ minHeight: 4 }} />
           </div>
        )}

        <button 
          onClick={async () => {
             // Push to talk toggle
             if (isMicrophoneEnabled) {
               await localParticipant.setMicrophoneEnabled(false);
             } else {
               await localParticipant.setMicrophoneEnabled(true);
             }
          }}
          className="outline-none focus:outline-none"
        >
          <VoiceOrb state={orbState} isMuted={!isMicrophoneEnabled} />
        </button>

        <div className="text-slate-400 text-xs font-medium bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700/50 backdrop-blur-md">
          {isMicrophoneEnabled ? "Tap orb to mute" : "Tap orb to speak"}
        </div>
      </div>
    </div>
  );
}

// Wrapper to provide room context
export const VoiceShell: React.FC<{ token: string; url: string; onDisconnect: () => void }> = ({ token, url, onDisconnect }) => {
  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={onDisconnect}
      className="w-full h-full flex flex-col bg-slate-950 text-slate-100 font-sans"
    >
      <VoiceShellInner />
      
      {/* Disconnect Button (absolute top right) */}
      <button 
        onClick={onDisconnect}
        className="absolute top-4 right-4 text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20 text-red-400 px-3 py-1.5 rounded-md transition-colors"
      >
        Disconnect
      </button>
    </LiveKitRoom>
  );
};
