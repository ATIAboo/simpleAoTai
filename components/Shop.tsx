import React from 'react';
import { Item } from '../types';
import { ITEMS } from '../constants';

interface ShopProps {
  money: number;
  inventory: Record<string, number>;
  onBuy: (item: Item) => void;
  onLeave: () => void;
}

const Shop: React.FC<ShopProps> = ({ money, inventory, onBuy, onLeave }) => {
  return (
    <div className="fixed inset-0 w-full h-full bg-gray-900 flex flex-col items-center justify-center md:p-4 z-50">
      <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl bg-black border-4 border-yellow-600 p-4 md:p-6 shadow-2xl flex flex-col">
        
        {/* Header - Fixed at top */}
        <div className="flex-none flex justify-between items-center mb-4 md:mb-6 border-b-2 border-yellow-700 pb-4">
          <div>
            <h1 className="text-xl md:text-3xl text-yellow-500 font-bold mb-1 md:mb-2">大爷的补给站</h1>
            <p className="text-gray-400 text-[10px] md:text-sm">"小伙子，山上面冷，这点钱别省着，命要紧。"</p>
          </div>
          <div className="text-right">
            <div className="text-gray-400 text-xs">当前资金</div>
            <div className="text-green-400 text-xl md:text-2xl font-bold">¥{money}</div>
          </div>
        </div>

        {/* Scrollable Item List - Takes available space */}
        <div className="flex-1 overflow-y-auto min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 mb-4 md:mb-8 pr-2">
          {ITEMS.map((item) => {
            const owned = inventory[item.id] || 0;
            const isGear = item.type === 'GEAR';
            const alreadyHasGear = isGear && owned > 0;
            const canAfford = money >= item.price;

            return (
              <div key={item.id} className="bg-gray-800 p-2 md:p-3 border border-gray-600 flex justify-between items-center hover:bg-gray-700 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-sm md:text-base">{item.name}</span>
                    {item.type === 'GEAR' && <span className="text-[10px] bg-blue-900 text-blue-200 px-1 rounded">装备</span>}
                    {item.type === 'FOOD' && <span className="text-[10px] bg-green-900 text-green-200 px-1 rounded">食物</span>}
                    {item.type === 'MEDICAL' && <span className="text-[10px] bg-red-900 text-red-200 px-1 rounded">医疗</span>}
                  </div>
                  <div className="text-gray-400 text-[10px] md:text-xs mt-1">{item.description}</div>
                  <div className="text-gray-500 text-[10px] mt-1">
                    效果: {item.type === 'GEAR' ? 
                      (item.effect.passive === 'warmth_retention' ? `保暖 +${item.effect.value}` : `省力 +${item.effect.value}`) 
                      : `恢复 ${item.effect.value}`}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2 ml-2 md:ml-4 min-w-[70px] md:min-w-[80px]">
                  <div className="text-yellow-200 text-sm md:text-base">¥{item.price}</div>
                  <div className="text-[10px] md:text-xs text-gray-500">拥有: {owned}</div>
                  <button
                    onClick={() => onBuy(item)}
                    disabled={!canAfford || alreadyHasGear}
                    className={`
                      px-2 md:px-3 py-1 text-[10px] md:text-xs font-bold border-b-2 active:border-b-0 active:translate-y-px w-full text-center
                      ${alreadyHasGear 
                        ? 'bg-gray-600 text-gray-400 border-gray-800 cursor-not-allowed' 
                        : canAfford 
                          ? 'bg-yellow-700 text-white border-yellow-900 hover:bg-yellow-600' 
                          : 'bg-red-900/50 text-gray-500 border-red-900 cursor-not-allowed'}
                    `}
                  >
                    {alreadyHasGear ? "已有" : "购买"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Button - Fixed at bottom */}
        <div className="flex-none flex justify-center border-t-2 border-gray-700 pt-4 md:pt-6 pb-safe">
          <button 
            onClick={onLeave}
            className="w-full md:w-1/2 bg-green-700 text-white py-3 md:py-4 text-lg md:text-xl font-bold border-b-4 border-green-900 active:border-b-0 active:translate-y-1 hover:bg-green-600"
          >
            整理完毕，进山！
          </button>
        </div>
      </div>
    </div>
  );
};

export default Shop;