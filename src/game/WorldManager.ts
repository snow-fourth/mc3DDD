import { Block, WaterBlock, BlockType } from './types';
import { ChunkManager } from './ChunkManager';

export class WorldManager {
  private chunkManager: ChunkManager;
  private lastPlayerPosition = { x: 0, z: 0 };

  constructor() {
    this.chunkManager = new ChunkManager();
  }

  public generateTerrain(): void {
    // 初始生成玩家周围的区块
    this.chunkManager.updateLoadedChunks(0, 0);
  }

  public updateWorld(playerX: number, playerZ: number): void {
    // 检查玩家是否移动了足够远，需要更新区块
    const dx = Math.abs(playerX - this.lastPlayerPosition.x);
    const dz = Math.abs(playerZ - this.lastPlayerPosition.z);
    
    if (dx > 4 || dz > 4) {
      this.chunkManager.updateLoadedChunks(playerX, playerZ);
      this.lastPlayerPosition = { x: playerX, z: playerZ };
    }
  }

  public placeBlock(position: { x: number; y: number; z: number }, type: BlockType): void {
    this.chunkManager.placeBlock(position, type);
  }

  public removeBlock(position: { x: number; y: number; z: number }): void {
    this.chunkManager.removeBlock(position);
  }

  public getBlocks(): Block[] {
    return this.chunkManager.getAllLoadedBlocks();
  }

  public getWaterBlocks(): WaterBlock[] {
    return this.chunkManager.getAllLoadedWaterBlocks();
  }

  public getWorldData(): any {
    return this.chunkManager.getWorldData();
  }

  public loadWorldData(data: any): void {
    if (data) {
      this.chunkManager.loadWorldData(data);
    } else {
      this.generateTerrain();
    }
  }

  public clear(): void {
    this.chunkManager.clear();
  }
}