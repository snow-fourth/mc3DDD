export type BlockType = 'grass' | 'dirt' | 'stone' | 'wood' | 'sand' | 'snow' | 'water';

export interface Block {
  position: { x: number; y: number; z: number };
  type: BlockType;
}

export interface WaterBlock {
  position: { x: number; y: number; z: number };
  level: number; // 0-1, water level
}

export interface Intersection {
  position: { x: number; y: number; z: number };
  blockPosition: { x: number; y: number; z: number };
  face: string;
}

export interface Chunk {
  x: number;
  z: number;
  blocks: Map<string, Block>;
  waterBlocks: Map<string, WaterBlock>;
  generated: boolean;
}

export interface ChunkCoord {
  x: number;
  z: number;
}