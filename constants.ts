import { BiomeType, Item } from './types';

export const MAP_WIDTH = 15;
export const MAP_HEIGHT = 45; // Slightly longer
export const VIEWPORT_SIZE = 9; // Bigger view (was 7)

export const START_MONEY = 2000;

export const START_STATS = {
  health: 100,
  energy: 100,
  warmth: 100,
};

export const ITEMS: Item[] = [
  // Food - Cheap to Luxury
  { id: 'mantou', name: '干馒头', price: 5, description: '硬得像石头，但能填饱肚子。', type: 'FOOD', effect: { stat: 'energy', value: 15 } },
  { id: 'biscuit', name: '压缩饼干', price: 15, description: '军用口粮，能量密度高。', type: 'FOOD', effect: { stat: 'energy', value: 35 } },
  { id: 'beef', name: '风干牛肉', price: 40, description: '优质蛋白，耐饿。', type: 'FOOD', effect: { stat: 'energy', value: 50 } },
  { id: 'hotpot', name: '自热火锅', price: 80, description: '在雪山上吃火锅是极致的享受。', type: 'FOOD', effect: { stat: 'energy', value: 80, passive: 'warmth_retention' } }, // Special handling: restores warmth too manually

  // Medical
  { id: 'bandaid', name: '创可贴', price: 10, description: '处理小伤口。', type: 'MEDICAL', effect: { stat: 'health', value: 10 } },
  { id: 'medkit', name: '急救包', price: 120, description: '救命物资。', type: 'MEDICAL', effect: { stat: 'health', value: 50 } },

  // Gear - Passive Buffs
  { id: 'bamboo', name: '竹杖', price: 10, description: '路边捡的，聊胜于无。', type: 'GEAR', effect: { value: 1, passive: 'move_efficiency' } },
  { id: 'poles', name: '碳纤登山杖', price: 450, description: '专业装备，显著节省体力。', type: 'GEAR', effect: { value: 3, passive: 'move_efficiency' } },
  
  { id: 'cotton', name: '旧军大衣', price: 150, description: '厚重保暖，但在湿冷天气很糟糕。', type: 'GEAR', effect: { value: 1, passive: 'warmth_retention' } },
  { id: 'goretex', name: '专业冲锋衣', price: 1200, description: '顶级防风防水，保命神器。', type: 'GEAR', effect: { value: 3, passive: 'warmth_retention' } },
];

export const BIOME_CONFIG: Record<BiomeType, { color: string, symbol: string, danger: number }> = {
  FOREST: { color: 'bg-green-900', symbol: '🌲', danger: 1 },
  MEADOW: { color: 'bg-green-700', symbol: '🌿', danger: 2 },
  STONE_SEA: { color: 'bg-stone-600', symbol: '🪨', danger: 5 },
  SNOW_RIDGE: { color: 'bg-slate-200 text-slate-800', symbol: '❄️', danger: 7 },
  PEAK: { color: 'bg-yellow-200 text-yellow-900', symbol: '🚩', danger: 8 },
};

export const BIOME_NAMES: Record<BiomeType, string> = {
  FOREST: '针叶林',
  MEADOW: '高山草甸',
  STONE_SEA: '石海',
  SNOW_RIDGE: '雪脊',
  PEAK: '顶峰',
};

export const WEATHER_NAMES: Record<string, string> = {
  Sunny: '晴朗',
  Cloudy: '多云',
  Windy: '大风',
  Blizzard: '暴风雪',
  Fog: '大雾',
};

// Landmarks mapped to roughly Y coordinates
export const LANDMARKS = [
  { y: 2, name: '塘口', description: '一切的起点。村民们说今天天气不错。' },
  { y: 8, name: '火烧坡', description: '一段艰难的爬升。' },
  { y: 15, name: '2800营地', description: '稍微平坦的避风处。' },
  { y: 22, name: '石海核心区', description: '巨大的岩石错落堆叠，每一步都充满危机。' },
  { y: 32, name: '九重天', description: '风仿佛能把人吹走。' },
  { y: 43, name: '鳌山大梁', description: '最后的冲刺，云端之上。' },
];