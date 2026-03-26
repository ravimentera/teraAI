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

// Renders ONLY the AI agent's audio — not all remote participants
function AgentAudioRenderer({ audioTrack }: { audioTrack: any }) {
  if (!audioTrack) return null;
  return (
    <audio
      ref={(el) => {
        if (el && audioTrack.publication?.track) {
          audioTrack.publication.track.attach(el);
          el.play().catch(() => { });
          return () => audioTrack.publication.track?.detach(el);
        }
      }}
      autoPlay
      style={{ display: 'none' }}
    />
  );
}

function AgentTranscription({ audioTrack, onSegments }: { audioTrack: any, onSegments: (s: any[]) => void }) {
  const transcriptions = useTrackTranscription(audioTrack);
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
  const { state: agentState, audioTrack } = useVoiceAssistant();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const room = useRoomContext();

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

  const handleUserSegments = useCallback((segments: any[]) => setUserSegments(segments), []);
  const handleAgentSegments = useCallback((segments: any[]) => setAgentSegments(segments), []);

  // 1. Sync LiveKit Agent State -> VoiceOrb State
  useEffect(() => {
    if (agentState === 'listening') setOrbState('listening');
    else if (agentState === 'speaking' || agentState === 'thinking') setOrbState('speaking');
    else if (agentState === 'initializing' || agentState === 'connecting') setOrbState('connecting');
    else setOrbState('idle');
  }, [agentState]);

  // 3. Turn-Based UI Consolidation
  useEffect(() => {
    const processSpeakerTurns = (segments: any[], speaker: 'user' | 'agent') => {
      const turns: TranscriptEntry[] = [];
      const speakerSegments = segments;
      const validSegments = speakerSegments.filter(s => s.text.trim().length > 0);
      if (validSegments.length === 0) return turns;

      let currentGroup: any[] = [];
      validSegments.forEach((s, idx) => {
        if (idx === 0) {
          currentGroup.push(s);
        } else {
          const prev = validSegments[idx - 1];
          const sStart = s.firstReceivedTime || s.timestamp || Date.now();
          const prevEnd = prev.lastReceivedTime || prev.timestamp || sStart;
          const gap = (sStart - prevEnd) / 1000;

          if (gap > 2.0) {
            turns.push({
              id: `${speaker}-${currentGroup[0].id}`,
              speaker,
              text: currentGroup.map(g => g.text.trim()).join(' '),
              isFinal: currentGroup.every(g => g.final),
              startTime: currentGroup[0].firstReceivedTime || currentGroup[0].timestamp || Date.now()
            });
            currentGroup = [s];
          } else {
            currentGroup.push(s);
          }
        }
      });

      if (currentGroup.length > 0) {
        turns.push({
          id: `${speaker}-${currentGroup[0].id}`,
          speaker,
          text: currentGroup.map(g => g.text.trim()).join(' '),
          isFinal: currentGroup.every(g => g.final),
          startTime: currentGroup[0].firstReceivedTime || currentGroup[0].timestamp || Date.now()
        });
      }
      return turns;
    };

    const uTurns = processSpeakerTurns(userSegments, 'user');
    const aTurns = processSpeakerTurns(agentSegments, 'agent');

    const allTurns = [...uTurns, ...aTurns].sort((a, b) => a.startTime - b.startTime);
    setEntries(allTurns);
  }, [userSegments, agentSegments]);

  return (
    <div className="flex flex-col h-full w-full justify-between items-center py-8">
      <AgentAudioRenderer audioTrack={audioTrack} />

      {audioTrack?.participant && (
        <AgentTranscription audioTrack={audioTrack} onSegments={handleAgentSegments} />
      )}
      {localParticipant && (
        <LocalTranscription localParticipant={localParticipant} onSegments={handleUserSegments} />
      )}

      {/* Header */}
      <div className="flex flex-col items-center justify-center space-y-1 z-10">
        <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold tracking-wide uppercase flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Brain: Tera Dental (POC)
        </div>
      </div>

      {/* Transcript Area */}
      <div className="flex-1 w-full max-h-[55vh] flex flex-col pt-8">
        <TranscriptPanel entries={entries} />
      </div>

      {/* Bottom Controls */}
      <div className="flex flex-col items-center justify-center space-y-8 z-10 w-full">
        {audioTrack && (
          <div className="h-4 w-48 opacity-50">
            <BarVisualizer state={agentState} trackRef={audioTrack} barCount={5} options={{ minHeight: 4 }} />
          </div>
        )}

        <button
          onClick={async () => {
            if (isMicrophoneEnabled) await localParticipant.setMicrophoneEnabled(false);
            else await localParticipant.setMicrophoneEnabled(true);
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
      <button
        onClick={onDisconnect}
        className="absolute top-4 right-4 text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20 text-red-400 px-3 py-1.5 rounded-md transition-colors"
      >
        Disconnect
      </button>
    </LiveKitRoom>
  );
};
