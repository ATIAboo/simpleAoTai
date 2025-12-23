import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, TileData, BiomeType, LogEntry, Position, Item } from './types';
import { MAP_WIDTH, MAP_HEIGHT, START_STATS, BIOME_CONFIG, LANDMARKS, WEATHER_NAMES, BIOME_NAMES, ITEMS, START_MONEY } from './constants';
import GridMap from './components/GridMap';
import StatsPanel from './components/StatsPanel';
import LogPanel from './components/LogPanel';
import Controls from './components/Controls';
import Shop from './components/Shop';
import InventoryPanel from './components/InventoryPanel';
import { generateNarrative, generateEncounter } from './services/geminiService';

// Procedural Map Generation
const generateMap = (): TileData[][] => {
  const map: TileData[][] = [];
  
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row: TileData[] = [];
    
    let biome: BiomeType = 'FOREST';
    if (y > 8) biome = 'MEADOW';
    if (y > 18) biome = 'STONE_SEA';
    if (y > 32) biome = 'SNOW_RIDGE'; // Adjusted for taller map
    if (y > 40) biome = 'PEAK';

    for (let x = 0; x < MAP_WIDTH; x++) {
      const pathCenter = Math.floor(MAP_WIDTH / 2) + Math.sin(y * 0.4) * 3; 
      const dist = Math.abs(x - pathCenter);
      
      let blocked = false;
      if (dist > 3 && Math.random() > 0.3) blocked = true;
      if (dist > 5) blocked = true;

      // Stone sea is harder
      if (biome === 'STONE_SEA' && Math.random() > 0.7) blocked = true;

      row.push({
        type: biome,
        blocked,
        revealed: false,
        x, y 
      });
    }
    map.push(row);
  }
  
  LANDMARKS.forEach(lm => {
    const centerX = Math.floor(MAP_WIDTH / 2);
    if (map[lm.y] && map[lm.y][centerX]) {
      map[lm.y][centerX].event = 'landmark';
      map[lm.y][centerX].blocked = false;
    }
  });

  return map;
};

const App: React.FC = () => {
  const [map, setMap] = useState<TileData[][]>([]);
  
  const [gameState, setGameState] = useState<GameState>({
    phase: 'MENU',
    started: false, // Legacy
    finished: false, // Legacy
    won: false,
    turn: 0,
    money: START_MONEY,
    inventory: {},
    position: { x: Math.floor(MAP_WIDTH / 2), y: 0 },
    stats: { ...START_STATS },
    weather: 'Sunny',
    logs: [],
    loadingAI: false,
  });

  useEffect(() => {
    setMap(generateMap());
  }, []);

  const addLog = (text: string, type: LogEntry['type'] = 'info') => {
    setGameState(prev => ({
      ...prev,
      logs: [...prev.logs, { id: `${prev.turn}-${Date.now()}`, text, type }].slice(-50)
    }));
  };

  const getPassiveEffects = (currentInventory: Record<string, number>) => {
    let moveEfficiency = 0;
    let warmthRetention = 0;

    ITEMS.filter(i => i.type === 'GEAR').forEach(item => {
      if (currentInventory[item.id]) {
        if (item.effect.passive === 'move_efficiency') moveEfficiency += item.effect.value;
        if (item.effect.passive === 'warmth_retention') warmthRetention += item.effect.value;
      }
    });

    return { moveEfficiency, warmthRetention };
  };

  const checkGameOver = (currentStats: typeof START_STATS, pos: Position) => {
    if (currentStats.health <= 0) {
      setGameState(prev => ({ ...prev, phase: 'GAMEOVER', won: false }));
      addLog("你因体力耗尽而倒下。游戏结束。", "danger");
      return true;
    }
    if (currentStats.warmth <= 0) {
      setGameState(prev => ({ ...prev, phase: 'GAMEOVER', won: false }));
      addLog("寒冷吞噬了你。失温。游戏结束。", "danger");
      return true;
    }
    if (pos.y >= MAP_HEIGHT - 2) {
      setGameState(prev => ({ ...prev, phase: 'VICTORY', won: true }));
      addLog("你到达了鳌山大梁。你活下来了！", "success");
      return true;
    }
    return false;
  };

  const processTurn = async (newPos: Position, baseCosts: { e: number, w: number }) => {
    if (gameState.phase !== 'PLAYING') return;

    let newStats = { ...gameState.stats };
    const passives = getPassiveEffects(gameState.inventory);

    // Apply Passives
    const finalEnergyCost = Math.max(1, baseCosts.e - passives.moveEfficiency);
    let finalWarmthCost = Math.max(0, baseCosts.w - passives.warmthRetention);

    // Weather Multiplier
    const isBadWeather = ['Blizzard', 'Windy'].includes(gameState.weather);
    if (isBadWeather) {
        // Gear helps significantly in bad weather
        const weatherDamage = Math.max(1, 3 - passives.warmthRetention); 
        finalWarmthCost += weatherDamage;
    }

    newStats.energy -= finalEnergyCost;
    newStats.warmth -= finalWarmthCost;

    // Events
    const tile = map[newPos.y][newPos.x];
    
    // Random Encounter (Low chance)
    if (Math.random() < 0.08 && !gameState.loadingAI) {
      setGameState(prev => ({ ...prev, loadingAI: true }));
      const encounter = await generateEncounter(tile.type);
      setGameState(prev => ({ ...prev, loadingAI: false }));
      
      addLog(encounter.text, encounter.effect === 'DAMAGE' ? 'danger' : 'info');
      
      if (encounter.effect === 'DAMAGE') newStats.health -= 15;
      if (encounter.effect === 'ITEM') {
        addLog("你找到了一些可用的补给（+10 体力）", "success");
        newStats.energy += 10;
      }
    }

    // Landmark Narrative
    const landmark = LANDMARKS.find(l => l.y === newPos.y);
    if (landmark && newPos.y !== gameState.position.y) {
       addLog(`抵达：${landmark.name}`, "success");
       // Story Plot Points
       if (landmark.y === 2) addLog("村长：这里就是登山口了。记住，不要勉强，活着回来。", "narrative");
       if (landmark.y === 22) addLog("看着这无尽的石海，你感到人类的渺小。每一步都要踩稳。", "narrative");
       
       setGameState(prev => ({ ...prev, loadingAI: true }));
       const narrative = await generateNarrative(landmark.name, tile.type, gameState.weather, newStats);
       setGameState(prev => ({ ...prev, loadingAI: false }));
       addLog(narrative, "narrative");
    }

    // Weather Change
    const weathers: GameState['weather'][] = ['Sunny', 'Cloudy', 'Windy', 'Blizzard', 'Fog'];
    let newWeather = gameState.weather;
    if (Math.random() > 0.88) {
      newWeather = weathers[Math.floor(Math.random() * weathers.length)];
      addLog(`天气变为：${WEATHER_NAMES[newWeather]}`, "info");
    }

    const gameOver = checkGameOver(newStats, newPos);
    
    setGameState(prev => ({
      ...prev,
      position: newPos,
      stats: newStats,
      turn: prev.turn + 1,
      weather: newWeather,
    }));
  };

  const handleMove = (dx: number, dy: number) => {
    if (gameState.phase !== 'PLAYING' || gameState.loadingAI) return;

    const newX = gameState.position.x + dx;
    const newY = gameState.position.y + dy;

    if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) {
      addLog("无法通行。", "info");
      return;
    }
    if (map[newY][newX].blocked) {
      addLog("地形阻挡了道路。", "danger");
      return;
    }

    // Costs
    const dyCost = dy > 0 ? 4 : 2; // Harder to climb
    const biomeCost = BIOME_CONFIG[map[newY][newX].type].danger;
    
    processTurn({ x: newX, y: newY }, { e: dyCost + biomeCost, w: 1 });
  };

  const handleRest = () => {
    if (gameState.phase !== 'PLAYING' || gameState.loadingAI) return;
    
    const passives = getPassiveEffects(gameState.inventory);
    let healthRec = 10;
    let warmthRec = 5 + passives.warmthRetention; // Gear helps rest
    
    if (gameState.weather === 'Blizzard' && passives.warmthRetention < 2) {
      addLog("装备不足，风雪让你无法安睡！", "danger");
      warmthRec = -5;
      healthRec = 0;
    } else {
      addLog("你停下来喘了口气。", "info");
    }

    const newStats = {
      ...gameState.stats,
      energy: Math.min(100, gameState.stats.energy + 20),
      health: Math.min(100, gameState.stats.health + healthRec),
      warmth: Math.min(100, gameState.stats.warmth + warmthRec)
    };
    
    setGameState(prev => ({
      ...prev,
      stats: newStats,
      turn: prev.turn + 1
    }));
  };

  const handleUseItem = (item: Item) => {
    if (gameState.phase !== 'PLAYING') return;
    
    const count = gameState.inventory[item.id] || 0;
    if (count <= 0) return;

    const newStats = { ...gameState.stats };
    
    if (item.type === 'FOOD') {
        newStats.energy = Math.min(100, newStats.energy + item.effect.value);
        if (item.id === 'hotpot') { // Special case for hotpot
             newStats.warmth = Math.min(100, newStats.warmth + 15);
             addLog(`吃了${item.name}，身子暖和了！`, "success");
        } else {
             addLog(`吃了${item.name}，恢复了体力。`, "success");
        }
    } else if (item.type === 'MEDICAL') {
        newStats.health = Math.min(100, newStats.health + item.effect.value);
        addLog(`使用了${item.name}，处理了伤口。`, "success");
    }

    setGameState(prev => ({
        ...prev,
        stats: newStats,
        inventory: {
            ...prev.inventory,
            [item.id]: count - 1
        }
    }));
  };

  const handleBuyItem = (item: Item) => {
    if (gameState.money < item.price) return;
    setGameState(prev => ({
        ...prev,
        money: prev.money - item.price,
        inventory: {
            ...prev.inventory,
            [item.id]: (prev.inventory[item.id] || 0) + 1
        }
    }));
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.phase !== 'PLAYING') return;
      switch(e.key) {
        case 'ArrowUp': case 'w': handleMove(0, 1); break;
        case 'ArrowDown': case 's': handleMove(0, -1); break;
        case 'ArrowLeft': case 'a': handleMove(-1, 0); break;
        case 'ArrowRight': case 'd': handleMove(1, 0); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.phase, gameState.position, gameState.loadingAI, gameState.inventory, gameState.weather]);

  // --- RENDERING ---

  // 1. MENU
  if (gameState.phase === 'MENU') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-xl w-full border-4 border-gray-500 bg-black p-8 text-center space-y-6 shadow-2xl">
          <h1 className="text-4xl text-yellow-500 font-bold leading-relaxed mb-4 font-pixel">鳌太线：生死穿越</h1>
          <div className="text-gray-400 text-sm md:text-base space-y-4 text-justify leading-relaxed border-t border-b border-gray-800 py-6">
            <p>鳌太线，纵贯秦岭鳌山与太白山，被誉为中国顶级徒步路线。</p>
            <p>这里有第四纪冰川遗迹<span className="text-white font-bold">“石海”</span>，也有一年四季变幻莫测的<span className="text-blue-300 font-bold">恶劣天气</span>。</p>
            <p>你需要合理分配资金购买装备，规划路线，时刻关注自己的体温与体能。</p>
            <p className="text-red-400 mt-4 text-center font-bold">注意：一旦失温，生命将迅速流逝。</p>
          </div>
          
          <button 
            onClick={() => setGameState(prev => ({ ...prev, phase: 'SHOP' }))}
            className="w-full bg-red-800 text-white py-4 px-6 text-xl border-b-4 border-red-950 hover:bg-red-700 font-bold animate-pulse"
          >
            整理装备 (商店)
          </button>
        </div>
      </div>
    );
  }

  // 2. SHOP
  if (gameState.phase === 'SHOP') {
      return (
          <div className="min-h-screen bg-gray-800 flex items-center justify-center">
              <Shop 
                money={gameState.money} 
                inventory={gameState.inventory} 
                onBuy={handleBuyItem} 
                onLeave={() => setGameState(prev => ({ ...prev, phase: 'PLAYING', logs: [{id:'start', text: '旅程开始了。', type:'info'}] }))} 
              />
          </div>
      );
  }

  // 3. MAIN GAME
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-2 md:p-6 font-pixel">
      <div className="w-full max-w-7xl flex flex-col gap-4">
        
        {/* Header Info */}
        <div className="flex justify-between items-end px-2 border-b border-gray-800 pb-2">
            <h1 className="text-yellow-500 text-xl tracking-widest">AO TAI LINE</h1>
            <div className="flex gap-4 text-xs md:text-sm text-gray-500">
                <span>POS: {gameState.position.x}, {gameState.position.y}</span>
                <span>TURN: {gameState.turn}</span>
                <span>BIOME: {BIOME_NAMES[map[gameState.position.y]?.[gameState.position.x]?.type]}</span>
            </div>
        </div>

        {/* 3-Column Layout for Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
            
            {/* Left Col: Stats & Inventory (3 cols wide) */}
            <div className="lg:col-span-3 flex flex-col gap-4 order-2 lg:order-1 h-full">
                <StatsPanel stats={gameState.stats} weather={gameState.weather} />
                <div className="flex-1 min-h-[200px]">
                    <InventoryPanel 
                        inventory={gameState.inventory} 
                        onUse={handleUseItem} 
                        disabled={gameState.loadingAI || gameState.phase !== 'PLAYING'} 
                    />
                </div>
            </div>
            
            {/* Center Col: Map (6 cols wide) */}
            <div className="lg:col-span-6 flex flex-col items-center justify-start order-1 lg:order-2">
                <div className="w-full max-w-[500px]">
                    <GridMap mapData={map} playerPosition={gameState.position} />
                </div>
                {/* Mobile/Tablet Controls underneath map */}
                <div className="lg:hidden w-full mt-4">
                    <Controls onMove={handleMove} onRest={handleRest} disabled={gameState.loadingAI || gameState.phase !== 'PLAYING'} />
                </div>
            </div>

            {/* Right Col: Logs & Desktop Controls (3 cols wide) */}
            <div className="lg:col-span-3 flex flex-col gap-4 order-3 h-full">
                <div className="flex-1 min-h-[300px] border-4 border-gray-700 bg-black">
                    <LogPanel logs={gameState.logs} />
                </div>
                <div className="hidden lg:block">
                     <Controls onMove={handleMove} onRest={handleRest} disabled={gameState.loadingAI || gameState.phase !== 'PLAYING'} />
                </div>
            </div>
        </div>

        {/* Modal for Game Over / Victory */}
        {(gameState.phase === 'GAMEOVER' || gameState.phase === 'VICTORY') && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 animate-fade-in">
             <div className={`border-4 p-8 max-w-md text-center shadow-2xl ${gameState.won ? 'border-yellow-500 bg-yellow-900/20' : 'border-red-600 bg-red-900/20'}`}>
                <h2 className={`text-3xl md:text-4xl mb-6 font-bold ${gameState.won ? 'text-yellow-400' : 'text-red-500'}`}>
                    {gameState.won ? "穿越成功" : "确认遇难"}
                </h2>
                <p className="mb-8 text-gray-300 leading-relaxed">
                    {gameState.won 
                        ? "你凭借坚韧的意志和合理的规划，成功征服了鳌太线，站在了太白之巅。" 
                        : "在这片荒凉的无人区，你的名字成为了后来者的警示。"}
                </p>
                <div className="text-sm text-gray-500 mb-8">
                    存活回合数: {gameState.turn}
                </div>
                <button 
                    onClick={() => window.location.reload()}
                    className="bg-white text-black px-8 py-3 text-lg font-bold hover:bg-gray-200 transition-colors"
                >
                    再次挑战
                </button>
             </div>
          </div>
        )}
        
        {/* AI Loading Indicator */}
        {gameState.loadingAI && (
            <div className="fixed top-4 right-4 bg-blue-900/80 border border-blue-500 text-blue-200 px-4 py-2 text-sm animate-pulse rounded z-50">
                AI 正在生成剧情...
            </div>
        )}

      </div>
    </div>
  );
};

export default App;