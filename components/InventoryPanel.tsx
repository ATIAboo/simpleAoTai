import React from 'react';
import { Item, PlayerStats } from '../types';
import { ITEMS } from '../constants';

interface InventoryPanelProps {
  inventory: Record<string, number>;
  onUse: (item: Item) => void;
  disabled: boolean;
}

const InventoryPanel: React.FC<InventoryPanelProps> = ({ inventory, onUse, disabled }) => {
  // Filter out gear, only show consumables
  const consumables = ITEMS.filter(i => (i.type === 'FOOD' || i.type === 'MEDICAL') && (inventory[i.id] || 0) > 0);
  const gears = ITEMS.filter(i => i.type === 'GEAR' && (inventory[i.id] || 0) > 0);

  return (
    <div className="bg-gray-900 border-4 border-gray-600 p-2 text-white h-full flex flex-col">
      <h2 className="text-yellow-400 text-xs mb-2 border-b border-gray-700 pb-1">装备</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {gears.length === 0 && <span className="text-gray-600 text-xs">无装备 (危险)</span>}
        {gears.map(gear => (
          <div key={gear.id} className="bg-blue-900/50 text-blue-200 text-[10px] px-2 py-1 border border-blue-700 rounded">
            {gear.name}
          </div>
        ))}
      </div>

      <h2 className="text-yellow-400 text-xs mb-2 border-b border-gray-700 pb-1">物资</h2>
      <div className="flex-1 overflow-y-auto space-y-2">
        {consumables.length === 0 && <div className="text-red-500 text-xs text-center py-4">背囊空空如也</div>}
        {consumables.map((item) => (
          <div key={item.id} className="flex justify-between items-center bg-gray-800 p-2 text-xs border border-gray-700">
            <div className="flex flex-col">
                <span>{item.name}</span>
                <span className="text-[9px] text-gray-500">x{inventory[item.id]} | +{item.effect.value} {item.effect.stat === 'energy' ? '体力' : '生命'}</span>
            </div>
            <button
              onClick={() => onUse(item)}
              disabled={disabled}
              className="bg-green-700 hover:bg-green-600 px-2 py-1 rounded text-[10px] disabled:opacity-50"
            >
              使用
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InventoryPanel;