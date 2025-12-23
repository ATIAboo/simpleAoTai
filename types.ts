export type BiomeType = 'FOREST' | 'MEADOW' | 'STONE_SEA' | 'SNOW_RIDGE' | 'PEAK';

export interface Position {
  x: number;
  y: number;
}

export interface PlayerStats {
  health: number; // Max 100
  energy: number; // Max 100
  warmth: number; // Max 100
}

export type ItemType = 'FOOD' | 'GEAR' | 'MEDICAL';

export interface Item {
  id: string;
  name: string;
  price: number;
  description: string;
  type: ItemType;
  effect: {
    stat?: 'energy' | 'health' | 'warmth';
    value: number; 
    passive?: 'warmth_retention' | 'move_efficiency';
  };
}

export interface LogEntry {
  id: string;
  text: string;
  type: 'info' | 'danger' | 'success' | 'narrative';
}

export interface GameState {
  phase: 'MENU' | 'SHOP' | 'PLAYING' | 'GAMEOVER' | 'VICTORY';
  turn: number;
  money: number;
  position: Position;
  stats: PlayerStats;
  inventory: Record<string, number>; // ItemId -> Count
  weather: 'Sunny' | 'Cloudy' | 'Windy' | 'Blizzard' | 'Fog';
  logs: LogEntry[];
  loadingAI: boolean;
}

export interface TileData {
  type: BiomeType;
  blocked: boolean;
  event?: 'shelter' | 'loot' | 'landmark' | 'danger';
  revealed: boolean;
  x: number;
  y: number;
}