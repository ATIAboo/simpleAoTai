import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, TileData, BiomeType, LogEntry, Position, Item, PlayerStats } from './types';
import { MAP_WIDTH, MAP_HEIGHT, START_STATS, BIOME_CONFIG, LANDMARKS, WEATHER_NAMES, BIOME_NAMES, ITEMS, START_MONEY } from './constants';
import GridMap from './components/GridMap';
import StatsPanel from './components/StatsPanel';
import LogPanel from './components/LogPanel';
import Controls from './components/Controls';
import Shop from './components/Shop';
import InventoryPanel from './components/InventoryPanel';
import GameEndScreen from './components/GameEndScreen';
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
  const [mobileTab, setMobileTab] = useState<'EXPLORE' | 'BAG' | 'LOGS'>('EXPLORE');
  const [deathCount, setDeathCount] = useState(0);
  
  const [gameState, setGameState] = useState<GameState>({
    phase: 'MENU',
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
    const storedDeaths = localStorage.getItem('ao_tai_death_count');
    if (storedDeaths) {
      setDeathCount(parseInt(storedDeaths, 10));
    }
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

  const handleGameOverState = (reason: string, won: boolean) => {
    if (!won) {
      const newCount = deathCount + 1;
      setDeathCount(newCount);
      localStorage.setItem('ao_tai_death_count', newCount.toString());
    }
    
    setGameState(prev => ({ 
      ...prev, 
      phase: won ? 'VICTORY' : 'GAMEOVER', 
      won, 
      gameOverReason: reason 
    }));
  };

  const checkGameOver = (currentStats: PlayerStats, pos: Position): boolean => {
    if (currentStats.health <= 0) {
      handleGameOverState("身体机能耗尽 (HP为0)", false);
      return true;
    }
    if (currentStats.warmth <= 0) {
      handleGameOverState("严重失温 (体温为0)", false);
      return true;
    }
    if (currentStats.energy <= 0) {
       handleGameOverState("力竭倒地 (体力为0)", false);
       return true;
    }

    if (pos.y >= MAP_HEIGHT - 2) {
      handleGameOverState("成功穿越", true);
      return true;
    }
    return false;
  };

  const handleRestart = () => {
    // Soft reset logic
    setMap(generateMap());
    setGameState({
        phase: 'MENU',
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
    setMobileTab('EXPLORE');
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

    // --- CRITICAL: Check Game Over BEFORE calculating events or updating state ---
    // If we don't return here, the state update at the bottom of this function
    // will overwrite the 'GAMEOVER' phase set by checkGameOver.
    if (checkGameOver(newStats, newPos)) {
        return; 
    }

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

    // Final check in case events killed player
    if (checkGameOver(newStats, newPos)) {
        return;
    }
    
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
    
    // Using processTurn logic for stat updates would be recursive/complex, so we check Game Over here manually
    // But resting shouldn't usually kill you unless we implement "hunger over time" while resting.
    // For now, assume resting is safe unless stats were already critical, but we don't decrement stats for resting turn yet (simplified).
    
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
      <div className="h-[100dvh] bg-gray-900 flex items-center justify-center p-4 overflow-hidden">
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
          <div className="h-[100dvh] bg-gray-800 flex items-center justify-center overflow-hidden">
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
    <div className="h-[100dvh] w-full bg-gray-900 text-gray-100 font-pixel overflow-hidden flex flex-col">
        
        {/* --- DESKTOP LAYOUT (LG and up) --- */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-4 h-full p-6 max-w-7xl mx-auto w-full">
             {/* Left: Stats & Inventory */}
            <div className="lg:col-span-3 flex flex-col gap-4 h-full">
                <StatsPanel stats={gameState.stats} weather={gameState.weather} />
                <div className="flex-1 min-h-[200px]">
                    <InventoryPanel 
                        inventory={gameState.inventory} 
                        onUse={handleUseItem} 
                        disabled={gameState.loadingAI || gameState.phase !== 'PLAYING'} 
                    />
                </div>
            </div>
            
            {/* Center: Map */}
            <div className="lg:col-span-6 flex flex-col items-center justify-start gap-4">
                 <div className="flex justify-between items-end w-full px-2 border-b border-gray-800 pb-2">
                    <h1 className="text-yellow-500 text-xl tracking-widest">AO TAI LINE</h1>
                    <div className="flex gap-4 text-sm text-gray-500">
                        <span>POS: {gameState.position.x}, {gameState.position.y}</span>
                        <span>TURN: {gameState.turn}</span>
                        <span>BIOME: {BIOME_NAMES[map[gameState.position.y]?.[gameState.position.x]?.type]}</span>
                    </div>
                </div>
                <div className="w-full max-w-[500px]">
                    <GridMap mapData={map} playerPosition={gameState.position} />
                </div>
                <Controls 
                  onMove={handleMove} 
                  onRest={handleRest} 
                  disabled={gameState.loadingAI || gameState.phase !== 'PLAYING'}
                  inventory={gameState.inventory}
                  onUseItem={handleUseItem}
                />
            </div>

            {/* Right: Logs */}
            <div className="lg:col-span-3 flex flex-col gap-4 h-full">
                <div className="flex-1 border-4 border-gray-700 bg-black">
                    <LogPanel logs={gameState.logs} className="h-full" />
                </div>
            </div>
        </div>

        {/* --- MOBILE LAYOUT (Less than LG) --- */}
        <div className="lg:hidden flex flex-col h-full">
            {/* Mobile Header */}
            <div className="p-3 border-b-2 border-gray-800 bg-black flex justify-between items-center text-xs md:text-sm shadow-md z-10">
                <div className="flex gap-2">
                    <span className="text-yellow-500 font-bold">T:{gameState.turn}</span>
                    <span className="text-gray-400">Y:{gameState.position.y}</span>
                </div>
                <div className="font-bold text-gray-200">{BIOME_NAMES[map[gameState.position.y]?.[gameState.position.x]?.type]}</div>
                <div className={`font-bold ${gameState.weather === 'Sunny' ? 'text-yellow-400' : 'text-blue-300'}`}>
                    {WEATHER_NAMES[gameState.weather]}
                </div>
            </div>

            {/* Mobile Main Content Area */}
            <div className="flex-1 overflow-y-auto bg-gray-900 relative">
                {mobileTab === 'EXPLORE' && (
                    <div className="flex flex-col items-center justify-start h-full p-2">
                         {/* Compact Stats Bar */}
                        <div className="w-full flex gap-1 mb-2">
                            <div className="flex-1 bg-gray-800 border border-gray-600 h-6 relative">
                                <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center text-[10px] z-10">HP {Math.floor(gameState.stats.health)}</div>
                                <div className="h-full bg-red-600" style={{width: `${gameState.stats.health}%`}}></div>
                            </div>
                            <div className="flex-1 bg-gray-800 border border-gray-600 h-6 relative">
                                <div className="absolute inset-0 bg-orange-900/50 flex items-center justify-center text-[10px] z-10">暖 {Math.floor(gameState.stats.warmth)}</div>
                                <div className="h-full bg-orange-500" style={{width: `${gameState.stats.warmth}%`}}></div>
                            </div>
                            <div className="flex-1 bg-gray-800 border border-gray-600 h-6 relative">
                                <div className="absolute inset-0 bg-green-900/50 flex items-center justify-center text-[10px] z-10">体 {Math.floor(gameState.stats.energy)}</div>
                                <div className="h-full bg-green-600" style={{width: `${gameState.stats.energy}%`}}></div>
                            </div>
                        </div>

                        {/* Map */}
                        <div className="w-full max-w-[400px] aspect-square mb-4 shadow-lg">
                            <GridMap mapData={map} playerPosition={gameState.position} />
                        </div>

                        {/* Controls */}
                        <div className="w-full max-w-[400px]">
                            <Controls 
                                onMove={handleMove} 
                                onRest={handleRest} 
                                disabled={gameState.loadingAI || gameState.phase !== 'PLAYING'}
                                inventory={gameState.inventory}
                                onUseItem={handleUseItem}
                            />
                        </div>
                    </div>
                )}

                {mobileTab === 'BAG' && (
                    <div className="h-full flex flex-col p-4 gap-4">
                        <StatsPanel stats={gameState.stats} weather={gameState.weather} />
                        <div className="flex-1 overflow-hidden">
                             <InventoryPanel 
                                inventory={gameState.inventory} 
                                onUse={handleUseItem} 
                                disabled={gameState.loadingAI || gameState.phase !== 'PLAYING'} 
                            />
                        </div>
                    </div>
                )}

                {mobileTab === 'LOGS' && (
                    <div className="h-full bg-black p-2">
                        <LogPanel logs={gameState.logs} className="h-full" />
                    </div>
                )}
            </div>

            {/* Mobile Tab Bar */}
            <div className="h-16 bg-gray-900 border-t-2 border-gray-700 flex text-xs font-bold z-20">
                <button 
                    onClick={() => setMobileTab('EXPLORE')} 
                    className={`flex-1 flex flex-col items-center justify-center gap-1 ${mobileTab === 'EXPLORE' ? 'text-yellow-400 bg-gray-800' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <span className="text-xl">🧭</span>
                    探索
                </button>
                <button 
                    onClick={() => setMobileTab('BAG')} 
                    className={`flex-1 flex flex-col items-center justify-center gap-1 ${mobileTab === 'BAG' ? 'text-yellow-400 bg-gray-800' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <span className="text-xl">🎒</span>
                    背包
                </button>
                <button 
                    onClick={() => setMobileTab('LOGS')} 
                    className={`flex-1 flex flex-col items-center justify-center gap-1 ${mobileTab === 'LOGS' ? 'text-yellow-400 bg-gray-800' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <span className="text-xl">📜</span>
                    日志
                    {gameState.logs.length > 0 && <span className="w-2 h-2 rounded-full bg-red-500 absolute top-4 ml-4 animate-pulse"></span>}
                </button>
            </div>
        </div>

        {/* Game End Screen Overlay */}
        {(gameState.phase === 'GAMEOVER' || gameState.phase === 'VICTORY') && (
            <GameEndScreen 
                state={gameState} 
                onRestart={handleRestart} 
                mapType={BIOME_NAMES[map[gameState.position.y]?.[gameState.position.x]?.type]}
                deathCount={deathCount}
            />
        )}
        
        {/* AI Loading Indicator */}
        {gameState.loadingAI && (
            <div className="fixed top-20 right-4 bg-blue-900/90 border border-blue-500 text-blue-200 px-4 py-2 text-sm animate-pulse rounded z-50 shadow-lg">
                AI 生成中...
            </div>
        )}

    </div>
  );
};

export default App;