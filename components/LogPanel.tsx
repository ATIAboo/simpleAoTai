import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface LogPanelProps {
  logs: LogEntry[];
  className?: string;
}

const LogPanel: React.FC<LogPanelProps> = ({ logs, className = '' }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className={`bg-black border-4 border-gray-600 p-2 overflow-y-auto font-mono text-xs md:text-sm leading-relaxed flex flex-col gap-2 ${className}`}>
      {logs.length === 0 && <div className="text-gray-500 italic">旅程开始...</div>}
      
      {logs.map((log) => {
        let colorClass = 'text-gray-300';
        if (log.type === 'danger') colorClass = 'text-red-400';
        if (log.type === 'success') colorClass = 'text-green-400';
        if (log.type === 'narrative') colorClass = 'text-yellow-200 italic';

        return (
          <div key={log.id} className={`${colorClass} animate-fade-in`}>
            <span className="opacity-50 mr-2">[{log.id.split('-')[0]}]</span>
            {log.text}
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
};

export default LogPanel;