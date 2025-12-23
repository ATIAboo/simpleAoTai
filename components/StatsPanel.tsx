import React from 'react';
import { PlayerStats } from '../types';
import { WEATHER_NAMES } from '../constants';

interface StatsPanelProps {
  stats: PlayerStats;
  weather: string;
}

const StatBar: React.FC<{ label: string; value: number; color: string; max?: number }> = ({ label, value, color, max = 100 }) => {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span>{Math.floor(value)}/{max}</span>
      </div>
      <div className="w-full bg-gray-800 h-4 border border-gray-600 relative">
        <div 
          className={`h-full ${color} transition-all duration-300`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

const StatsPanel: React.FC<StatsPanelProps> = ({ stats, weather }) => {
  const weatherName = WEATHER_NAMES[weather] || weather;

  return (
    <div className="bg-gray-900 border-4 border-gray-600 p-4 text-white">
      <div className="flex justify-between items-center mb-4 border-b-2 border-gray-700 pb-2">
        <h2 className="text-yellow-400 text-sm">身体状态</h2>
        <div className="text-xs text-blue-300 animate-pulse">{weatherName}</div>
      </div>
      
      <StatBar label="生命" value={stats.health} color="bg-red-600" />
      <StatBar label="体温" value={stats.warmth} color="bg-orange-500" />
      <StatBar label="体力" value={stats.energy} color="bg-green-600" />
    </div>
  );
};

export default StatsPanel;