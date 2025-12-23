import React, { useMemo } from 'react';
import { TileData, Position, BiomeType } from '../types';
import { VIEWPORT_SIZE, BIOME_CONFIG } from '../constants';

interface GridMapProps {
  mapData: TileData[][];
  playerPosition: Position;
}

const GridMap: React.FC<GridMapProps> = ({ mapData, playerPosition }) => {
  // Calculate viewport to center player
  const viewportOffset = Math.floor(VIEWPORT_SIZE / 2);
  
  const viewportTiles = useMemo(() => {
    // Explicitly type the array to prevent type inference issues
    const tiles: TileData[][] = [];
    for (let y = playerPosition.y + viewportOffset; y >= playerPosition.y - viewportOffset; y--) {
      const row: TileData[] = [];
      for (let x = playerPosition.x - viewportOffset; x <= playerPosition.x + viewportOffset; x++) {
        // Boundary checks
        if (y >= 0 && y < mapData.length && x >= 0 && x < mapData[0].length) {
          row.push({ ...mapData[y][x], x, y });
        } else {
          // Out of bounds void
          // Explicitly cast to TileData and provide undefined for optional fields to satisfy the compiler
          row.push({ 
            type: 'VOID', 
            blocked: true, 
            x, 
            y, 
            revealed: false,
            event: undefined 
          } as TileData);
        }
      }
      tiles.push(row);
    }
    return tiles;
  }, [mapData, playerPosition, viewportOffset]);

  return (
    <div className="relative border-4 border-gray-600 bg-black p-1">
      <div 
        className="grid gap-1"
        style={{ 
          gridTemplateColumns: `repeat(${VIEWPORT_SIZE}, minmax(0, 1fr))`,
          aspectRatio: '1/1'
        }}
      >
        {viewportTiles.map((row, rIndex) => (
          row.map((tile, cIndex) => {
            const isPlayer = tile.x === playerPosition.x && tile.y === playerPosition.y;
            
            let bgClass = 'bg-black';
            let symbol = '';

            // Safe to access config now that VOID is a valid BiomeType with a config entry
            const config = BIOME_CONFIG[tile.type as BiomeType];
            
            if (tile.type !== 'VOID') {
                bgClass = config.color;
                // Only show terrain symbol if revealed or close
                symbol = config.symbol; 
                
                if (tile.event === 'landmark') symbol = '⛩️';
                if (tile.event === 'shelter') symbol = '⛺';
            }

            return (
              <div 
                key={`${tile.x}-${tile.y}`}
                className={`
                  relative w-full h-full flex items-center justify-center text-xl md:text-2xl select-none
                  ${bgClass}
                  ${isPlayer ? 'ring-2 ring-white z-10' : ''}
                  transition-all duration-200
                `}
              >
                {isPlayer ? (
                  <span className="animate-bounce">🚶</span>
                ) : (
                   <span className="opacity-80">{symbol}</span>
                )}
                
                {/* Fog of war overlay logic could go here, but we're keeping it simple for retro style */}
                <div className="absolute inset-0 bg-black opacity-10 pointer-events-none"></div>
              </div>
            );
          })
        ))}
      </div>
      
      {/* Scanline effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none z-20"></div>
    </div>
  );
};

export default GridMap;