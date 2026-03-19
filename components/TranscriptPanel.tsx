"use client";

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export type TranscriptEntry = {
  id: string;
  speaker: 'user' | 'agent';
  text: string;
  isFinal: boolean;
};

interface TranscriptPanelProps {
  entries: TranscriptEntry[];
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({ entries }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div 
      ref={containerRef}
      className="flex-1 w-full max-w-2xl mx-auto overflow-y-auto pr-4 scroll-smooth space-y-6 pb-24 mask-image-b-fade"
      style={{
         WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
         maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)'
      }}
    >
      {entries.length === 0 && (
        <div className="h-full flex items-center justify-center text-slate-500 font-medium text-sm">
          Conversation will appear here...
        </div>
      )}
      
      {entries.map((entry) => (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          key={entry.id}
          className={`flex flex-col ${entry.speaker === 'user' ? 'items-end' : 'items-start'}`}
        >
          <div className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${entry.speaker === 'user' ? 'text-blue-400' : 'text-purple-400'}`}>
            {entry.speaker === 'user' ? 'You' : 'Tera'}
          </div>
          <div 
            className={`px-4 py-3 rounded-2xl max-w-[85%] text-sm md:text-base leading-relaxed ${
              entry.speaker === 'user' 
                ? 'bg-blue-600/20 text-blue-50 rounded-tr-sm border border-blue-500/20' 
                : 'bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700'
            } ${!entry.isFinal ? 'opacity-70 animate-pulse' : ''}`}
          >
            {entry.text}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
