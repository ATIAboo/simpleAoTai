import React from 'react';

interface ControlsProps {
  onMove: (dx: number, dy: number) => void;
  onRest: () => void;
  disabled: boolean;
}

const Controls: React.FC<ControlsProps> = ({ onMove, onRest, disabled }) => {
  const btnClass = "bg-gray-700 active:bg-gray-600 border-b-4 border-r-4 border-gray-900 active:border-b-0 active:border-r-0 active:translate-y-1 text-white p-4 text-xl rounded disabled:opacity-50 disabled:pointer-events-none touch-manipulation";
  const actionBtnClass = "bg-blue-800 active:bg-blue-700 border-b-4 border-r-4 border-blue-950 active:border-b-0 active:border-r-0 active:translate-y-1 text-white p-3 text-xs rounded disabled:opacity-50 touch-manipulation w-full";

  return (
    <div className="flex flex-col gap-4 items-center">
        {/* D-Pad */}
        <div className="grid grid-cols-3 gap-2 w-full max-w-[200px]">
            <div className="col-start-2">
                <button className={`w-full ${btnClass}`} onClick={() => onMove(0, 1)} disabled={disabled}>▲</button>
            </div>
            <div className="col-start-1 row-start-2">
                <button className={`w-full ${btnClass}`} onClick={() => onMove(-1, 0)} disabled={disabled}>◀</button>
            </div>
            <div className="col-start-2 row-start-2">
                 <div className="w-full h-full flex items-center justify-center text-gray-600 text-2xl">
                    ●
                 </div>
            </div>
            <div className="col-start-3 row-start-2">
                <button className={`w-full ${btnClass}`} onClick={() => onMove(1, 0)} disabled={disabled}>▶</button>
            </div>
            <div className="col-start-2 row-start-3">
                <button className={`w-full ${btnClass}`} onClick={() => onMove(0, -1)} disabled={disabled}>▼</button>
            </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 w-full justify-center max-w-[200px]">
            <button className={actionBtnClass} onClick={onRest} disabled={disabled}>
                原地休息 (+体力/+微量体温)
            </button>
        </div>
        <div className="text-[10px] text-gray-500 text-center">
            WASD 移动 | 点击物品使用
        </div>
    </div>
  );
};

export default Controls;