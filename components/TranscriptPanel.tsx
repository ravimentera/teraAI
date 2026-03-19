"use client";

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export type TranscriptEntry = {
  id: string;
  speaker: 'user' | 'agent';
  text: string;
  isFinal: boolean;
  startTime: number;
};

interface TranscriptPanelProps {
  entries: TranscriptEntry[];
}

interface TypewriterTextProps {
  text: string;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({ text }) => {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.05 }}
    >
      {text}
    </motion.span>
  );
};

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
      className="flex-1 w-full max-w-2xl mx-auto overflow-y-auto pr-4 scroll-smooth space-y-4 pb-24 mask-image-b-fade"
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
      
      {entries.map((entry, index) => (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          key={`${entry.id}-${index}`}
          className={`flex flex-col ${entry.speaker === 'user' ? 'items-end' : 'items-start'}`}
        >
          <div className={`text-[10px] uppercase font-bold tracking-widest mb-1.5 px-1 ${entry.speaker === 'user' ? 'text-blue-400 opacity-60' : 'text-purple-400 opacity-60'}`}>
            {entry.speaker === 'user' ? 'You' : 'Tera'}
          </div>
          <div 
            className={`px-4 py-3 rounded-2xl max-w-[90%] text-sm md:text-[15px] leading-relaxed transition-all duration-300 ${
              entry.speaker === 'user' 
                ? 'bg-blue-600/10 text-blue-50/90 rounded-tr-sm border border-blue-500/20 shadow-[0_4px_12px_rgba(0,0,0,0.1)]' 
                : 'bg-slate-800/80 text-slate-100 rounded-tl-sm border border-slate-700 shadow-[0_4px_12px_rgba(0,0,0,0.2)] backdrop-blur-sm'
            } ${!entry.isFinal ? 'brightness-110 shadow-blue-500/5' : ''}`}
          >
            {entry.speaker === 'agent' ? (
              <TypewriterText text={entry.text} />
            ) : (
              <span>{entry.text}</span>
            )}
            {!entry.isFinal && (
               <span className="inline-block w-1.5 h-4 bg-blue-400/50 animate-pulse ml-1 align-middle" />
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
