import React from 'react';
import { GameState } from '../types';
import { BIOME_NAMES, MAP_HEIGHT } from '../constants';

interface GameEndScreenProps {
  state: GameState;
  onRestart: () => void;
  mapType: string; // The biome name where they ended
  deathCount: number;
}

const GameEndScreen: React.FC<GameEndScreenProps> = ({ state, onRestart, mapType, deathCount }) => {
  const isVictory = state.won;
  
  // Calculate a simple score
  const score = isVictory 
    ? Math.max(0, 1000 - state.turn * 10 + state.stats.health + state.stats.energy) 
    : state.turn * 5;

  if (isVictory) {
    return (
      <div className="fixed inset-0 z-50 bg-yellow-900/90 flex flex-col items-center justify-center p-6 text-center overflow-hidden animate-fade-in">
        <div className="max-w-md w-full border-8 border-yellow-500 bg-black p-8 shadow-[0_0_50px_rgba(234,179,8,0.5)] relative">
          
          {/* Victory Icon / Art placeholder */}
          <div className="text-6xl mb-6 animate-bounce">🚩</div>
          
          <h1 className="text-3xl md:text-5xl font-bold text-yellow-500 mb-2 tracking-widest uppercase font-pixel">
            穿越成功
          </h1>
          <div className="w-full h-1 bg-yellow-700 mb-6"></div>
          
          <p className="text-yellow-100 mb-8 leading-relaxed font-pixel text-sm md:text-base">
            你凭着惊人的毅力，成功翻越了鳌山大梁与九重天，站在了太白之巅。风雪在你身后，此刻只有荣耀。
          </p>

          <div className="grid grid-cols-2 gap-4 text-left bg-yellow-900/30 p-4 border border-yellow-800 mb-8 font-mono text-sm">
            <div className="text-yellow-600">耗时</div>
            <div className="text-yellow-200 text-right">{state.turn} 回合</div>
            
            <div className="text-yellow-600">剩余体力</div>
            <div className="text-yellow-200 text-right">{Math.floor(state.stats.energy)}%</div>
            
            <div className="text-yellow-600">最终评价</div>
            <div className="text-yellow-200 text-right font-bold text-lg">S级</div>
            
            <div className="text-yellow-600 col-span-2 pt-2 border-t border-yellow-800 mt-2">综合得分</div>
            <div className="text-yellow-400 text-right col-span-2 text-2xl font-bold">{Math.floor(score)}</div>
          </div>

          <button 
            onClick={onRestart}
            className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-4 text-lg border-b-4 border-yellow-800 active:border-b-0 active:translate-y-1 transition-all"
          >
            铭刻记录并重来
          </button>
        </div>
        
        {/* Confetti effect (simple css dots) */}
        <div className="absolute top-0 left-10 text-yellow-500 opacity-50 text-xs animate-pulse">✦</div>
        <div className="absolute bottom-20 right-10 text-yellow-500 opacity-50 text-xl animate-pulse">✦</div>
      </div>
    );
  }

  // GAME OVER SCREEN
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-center overflow-hidden animate-fade-in">
        {/* CRT Scanline overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none z-10 opacity-50"></div>

        <div className="max-w-md w-full border-4 border-red-900 bg-gray-900/90 p-8 shadow-[0_0_30px_rgba(220,38,38,0.3)] relative z-20">
          
          <div className="text-6xl mb-6 grayscale opacity-80">☠️</div>
          
          <h1 className="text-3xl md:text-5xl font-bold text-red-600 mb-2 tracking-widest uppercase font-pixel animate-pulse">
            确认遇难
          </h1>
          <div className="text-red-800 text-sm mb-6 font-mono tracking-widest">SIGNAL LOST...</div>
          
          <div className="bg-black border border-red-900/50 p-4 mb-8 text-left space-y-3 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">死因</span>
              <span className="text-red-400 font-bold">{state.gameOverReason || "不明原因"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">遇难地点</span>
              <span className="text-gray-300">{mapType} (Y:{state.position.y})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">坚持时间</span>
              <span className="text-gray-300">{state.turn} 回合</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">第 {deathCount} 次尝试</span>
              <span className="text-red-500 font-bold">遗憾告终</span>
            </div>
          </div>
          
          <p className="text-gray-500 text-xs mb-8 italic">
            "鳌太线从不仁慈，它只是静静地存在，看着人们来来去去。"
          </p>

          <button 
            onClick={onRestart}
            className="w-full bg-red-900 hover:bg-red-800 text-gray-300 font-bold py-4 text-lg border-b-4 border-red-950 active:border-b-0 active:translate-y-1 transition-all"
          >
            整理装备，再次挑战
          </button>
        </div>
    </div>
  );
};

export default GameEndScreen;