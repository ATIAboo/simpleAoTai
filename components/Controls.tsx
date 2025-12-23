import React from 'react';
import { Item } from '../types';
import { ITEMS } from '../constants';

interface ControlsProps {
  onMove: (dx: number, dy: number) => void;
  onRest: () => void;
  disabled: boolean;
  inventory?: Record<string, number>;
  onUseItem?: (item: Item) => void;
}

const Controls: React.FC<ControlsProps> = ({ onMove, onRest, disabled, inventory = {}, onUseItem }) => {
  // Styles
  const dpadBase = "w-14 h-14 flex items-center justify-center text-xl active:scale-95 transition-transform touch-manipulation bg-gray-700 border-gray-900 text-gray-200 shadow-[inset_0_2px_0_rgba(255,255,255,0.2),0_4px_0_#1a1a1a]";
  const dpadActive = "active:shadow-none active:translate-y-[4px]";
  const dpadDisabled = "opacity-50 pointer-events-none grayscale";

  // Filter quick items (Food & Medical that we own)
  const quickItems = ITEMS.filter(i => (i.type === 'FOOD' || i.type === 'MEDICAL') && (inventory[i.id] || 0) > 0).slice(0, 4);

  return (
    <div className="w-full flex flex-row items-end justify-center gap-2 md:gap-6 md:flex-col md:items-center">
        
        {/* Left Side: D-Pad */}
        <div className="flex flex-col items-center">
            {/* Cross Layout Container */}
            <div className="relative w-44 h-44 flex items-center justify-center bg-gray-800/50 rounded-full border-4 border-gray-700">
                {/* UP */}
                <button 
                    className={`absolute top-2 ${dpadBase} rounded-t-lg border-b-0 ${dpadActive} ${disabled ? dpadDisabled : ''}`} 
                    onClick={() => onMove(0, 1)} disabled={disabled}
                    aria-label="Up"
                >
                    ▲
                </button>
                {/* LEFT */}
                <button 
                    className={`absolute left-2 ${dpadBase} rounded-l-lg border-r-0 ${dpadActive} ${disabled ? dpadDisabled : ''}`} 
                    onClick={() => onMove(-1, 0)} disabled={disabled}
                    aria-label="Left"
                >
                    ◀
                </button>
                {/* CENTER (Decor) */}
                <div className="w-14 h-14 bg-gray-700 z-10 flex items-center justify-center shadow-inner">
                    <div className="w-8 h-8 rounded-full bg-gray-800/50"></div>
                </div>
                {/* RIGHT */}
                <button 
                    className={`absolute right-2 ${dpadBase} rounded-r-lg border-l-0 ${dpadActive} ${disabled ? dpadDisabled : ''}`} 
                    onClick={() => onMove(1, 0)} disabled={disabled}
                    aria-label="Right"
                >
                    ▶
                </button>
                {/* DOWN */}
                <button 
                    className={`absolute bottom-2 ${dpadBase} rounded-b-lg border-t-0 ${dpadActive} ${disabled ? dpadDisabled : ''}`} 
                    onClick={() => onMove(0, -1)} disabled={disabled}
                    aria-label="Down"
                >
                    ▼
                </button>
            </div>
            
            {/* Rest Button - Below D-Pad */}
            <button 
                className={`mt-4 w-32 py-2 bg-blue-800 text-blue-100 text-xs font-bold rounded border-b-4 border-blue-950 active:border-b-0 active:translate-y-1 shadow-lg ${disabled ? 'opacity-50' : ''}`}
                onClick={onRest} 
                disabled={disabled}
            >
                原地休息 Zzz
            </button>
        </div>

        {/* Right Side (Mobile) / Bottom (Desktop): Quick Actions */}
        {onUseItem && (
            <div className="flex-1 max-w-[160px] flex flex-col gap-2 p-2 bg-gray-800/80 rounded-lg border-2 border-gray-600 h-44">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-center border-b border-gray-600 pb-1 mb-1">
                    快捷物品
                </div>
                <div className="grid grid-cols-2 gap-2 flex-1 content-start overflow-y-auto">
                    {quickItems.length === 0 ? (
                        <div className="col-span-2 text-[10px] text-gray-500 text-center pt-4">无可用物品</div>
                    ) : (
                        quickItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => onUseItem(item)}
                                disabled={disabled}
                                className="relative group bg-gray-700 hover:bg-gray-600 border-b-2 border-gray-900 active:border-b-0 active:translate-y-[2px] p-1 rounded flex flex-col items-center justify-center h-14"
                            >
                                <span className="text-xl mb-1">{item.type === 'FOOD' ? '🍖' : '💊'}</span>
                                <span className="text-[9px] text-gray-300 truncate w-full text-center px-1">{item.name}</span>
                                <span className="absolute top-0 right-0 bg-yellow-600 text-white text-[9px] px-1 rounded-bl leading-none font-bold">
                                    {inventory[item.id]}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            </div>
        )}
    </div>
  );
};

export default Controls;