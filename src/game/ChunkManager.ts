import { Block, WaterBlock, BlockType, Chunk, ChunkCoord } from './types';

export class ChunkManager {
  private chunks: Map<string, Chunk> = new Map();
  private readonly CHUNK_SIZE = 8;
  private readonly CHUNK_HEIGHT = 400; // 200m / 0.5m per block = 400 blocks
  private readonly RENDER_DISTANCE = 3; // 渲染距离（区块数）
  private readonly SEA_LEVEL = 20; // 10m in world units
  private readonly MAX_HEIGHT = 400; // 200m in world units

  constructor() {}

  // 获取区块坐标
  public getChunkCoord(worldX: number, worldZ: number): ChunkCoord {
    return {
      x: Math.floor(worldX / this.CHUNK_SIZE),
      z: Math.floor(worldZ / this.CHUNK_SIZE)
    };
  }

  // 获取区块键
  private getChunkKey(chunkX: number, chunkZ: number): string {
    return `${chunkX},${chunkZ}`;
  }

  // 获取方块在区块内的本地坐标
  private getLocalCoord(worldCoord: number): number {
    return ((worldCoord % this.CHUNK_SIZE) + this.CHUNK_SIZE) % this.CHUNK_SIZE;
  }

  // 简单噪声函数
  private noise(x: number, z: number): number {
    // 多层噪声生成更真实的地形
    const n1 = Math.sin(x * 0.01) * Math.cos(z * 0.01) * 100; // 大山脉
    const n2 = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 30;  // 中等丘陵
    const n3 = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 10;    // 小起伏
    const n = n1 + n2 + n3;
    return n;
  }

  // 生成区块
  public generateChunk(chunkX: number, chunkZ: number): Chunk {
    try {
      const chunk: Chunk = {
        x: chunkX,
        z: chunkZ,
        blocks: new Map(),
        waterBlocks: new Map(),
        generated: true
      };

      const startX = chunkX * this.CHUNK_SIZE;
      const startZ = chunkZ * this.CHUNK_SIZE;

      for (let localX = 0; localX < this.CHUNK_SIZE; localX++) {
        for (let localZ = 0; localZ < this.CHUNK_SIZE; localZ++) {
          const worldX = startX + localX;
          const worldZ = startZ + localZ;

          // 生成高度
          const noiseValue = this.noise(worldX, worldZ);
          const height = Math.floor(this.SEA_LEVEL + noiseValue);
          const clampedHeight = Math.max(0, Math.min(this.MAX_HEIGHT, height));

          // 生成地形层
          for (let y = 0; y <= clampedHeight; y++) {
            let blockType: BlockType;

            if (y === clampedHeight) {
              if (clampedHeight > this.SEA_LEVEL + 160) { // 80m以上雪峰
                blockType = 'snow'; // 雪峰
              } else if (clampedHeight > this.SEA_LEVEL + 60) { // 30m以上山地
                blockType = 'stone'; // 山地
              } else if (clampedHeight <= this.SEA_LEVEL) {
                blockType = 'sand'; // 海滩
              } else {
                blockType = 'grass'; // 草地
              }
            } else if (y >= clampedHeight - 4 && clampedHeight > this.SEA_LEVEL) {
              blockType = clampedHeight <= this.SEA_LEVEL + 1 ? 'sand' : 'dirt';
            } else {
              blockType = 'stone';
            }

            this.setBlockInChunk(chunk, worldX, y, worldZ, blockType);
          }

          // 添加水
          if (clampedHeight < this.SEA_LEVEL) {
            for (let y = clampedHeight + 1; y <= this.SEA_LEVEL; y++) {
              this.setWaterBlockInChunk(chunk, worldX, y, worldZ, 1.0);
            }
          }

          // 随机放置树木
          if (clampedHeight > this.SEA_LEVEL + 2 && clampedHeight < this.SEA_LEVEL + 40 && Math.random() < 0.03) {
            const treeHeight = 6 + Math.floor(Math.random() * 4);
            for (let treeY = clampedHeight + 1; treeY <= clampedHeight + treeHeight; treeY++) {
              this.setBlockInChunk(chunk, worldX, treeY, worldZ, 'wood');
            }

            // 添加树叶
            for (let leafX = worldX - 2; leafX <= worldX + 2; leafX++) {
              for (let leafZ = worldZ - 2; leafZ <= worldZ + 2; leafZ++) {
                if (Math.random() < 0.7 && !(leafX === worldX && leafZ === worldZ)) {
                  this.setBlockInChunk(chunk, leafX, clampedHeight + treeHeight + 1, leafZ, 'grass');
                  if (Math.random() < 0.5) {
                    this.setBlockInChunk(chunk, leafX, clampedHeight + treeHeight + 2, leafZ, 'grass');
                  }
                }
              }
            }
          }
        }
      }

      return chunk;
    } catch (error) {
      console.error('Chunk generation error:', error);
      return {
        x: chunkX,
        z: chunkZ,
        blocks: new Map(),
        waterBlocks: new Map(),
        generated: false
      };
    }
  }

  // 在区块中设置方块
  private setBlockInChunk(chunk: Chunk, worldX: number, worldY: number, worldZ: number, type: BlockType): void {
    const key = `${worldX},${worldY},${worldZ}`;
    chunk.blocks.set(key, {
      position: { x: worldX, y: worldY, z: worldZ },
      type
    });
  }

  // 在区块中设置水方块
  private setWaterBlockInChunk(chunk: Chunk, worldX: number, worldY: number, worldZ: number, level: number): void {
    const key = `${worldX},${worldY},${worldZ}`;
    chunk.waterBlocks.set(key, {
      position: { x: worldX, y: worldY, z: worldZ },
      level
    });
  }

  // 获取或生成区块
  public getOrGenerateChunk(chunkX: number, chunkZ: number): Chunk {
    const key = this.getChunkKey(chunkX, chunkZ);
    let chunk = this.chunks.get(key);

    if (!chunk) {
      chunk = this.generateChunk(chunkX, chunkZ);
      this.chunks.set(key, chunk);
      
      // 标记区块为已生成，可以显示
      setTimeout(() => {
        if (chunk) {
          chunk.generated = true;
        }
      }, 100); // 100ms延迟确保生成完成
    }

    return chunk;
  }

  // 更新加载的区块（基于玩家位置）
  public updateLoadedChunks(playerX: number, playerZ: number): void {
    const playerChunk = this.getChunkCoord(playerX, playerZ);
    const loadedChunks = new Set<string>();

    // 加载玩家周围的区块
    for (let x = playerChunk.x - this.RENDER_DISTANCE; x <= playerChunk.x + this.RENDER_DISTANCE; x++) {
      for (let z = playerChunk.z - this.RENDER_DISTANCE; z <= playerChunk.z + this.RENDER_DISTANCE; z++) {
        const key = this.getChunkKey(x, z);
        loadedChunks.add(key);
        this.getOrGenerateChunk(x, z);
      }
    }

    // 卸载远离的区块
    const chunksToUnload: string[] = [];
    this.chunks.forEach((chunk, key) => {
      if (!loadedChunks.has(key)) {
        chunksToUnload.push(key);
      }
    });

    chunksToUnload.forEach(key => {
      this.chunks.delete(key);
    });
  }

  // 获取所有加载的方块
  public getAllLoadedBlocks(): Block[] {
    const blocks: Block[] = [];
    this.chunks.forEach(chunk => {
      // 只返回已完全生成的区块中的方块
      if (!chunk.generated) return;
      
      chunk.blocks.forEach(block => {
        blocks.push(block);
      });
    });
    return blocks;
  }

  // 获取所有加载的水方块
  public getAllLoadedWaterBlocks(): WaterBlock[] {
    const waterBlocks: WaterBlock[] = [];
    this.chunks.forEach(chunk => {
      // 只返回已完全生成的区块中的水方块
      if (!chunk.generated) return;
      
      chunk.waterBlocks.forEach(water => {
        waterBlocks.push(water);
      });
    });
    return waterBlocks;
  }

  // 放置方块
  public placeBlock(position: { x: number; y: number; z: number }, type: BlockType): void {
    if (position.y < 0 || position.y > this.MAX_HEIGHT + 20) return;
    if (type === 'water') return;

    try {
      const chunkCoord = this.getChunkCoord(position.x, position.z);
      const chunk = this.getOrGenerateChunk(chunkCoord.x, chunkCoord.z);

      // 移除该位置的水
      const waterKey = `${position.x},${position.y},${position.z}`;
      chunk.waterBlocks.delete(waterKey);

      // 添加方块
      const blockKey = `${position.x},${position.y},${position.z}`;
      chunk.blocks.set(blockKey, {
        position: { ...position },
        type
      });
    } catch (error) {
      console.error('Place block error:', error);
    }
  }

  // 移除方块
  public removeBlock(position: { x: number; y: number; z: number }): void {
    try {
      const chunkCoord = this.getChunkCoord(position.x, position.z);
      const chunk = this.chunks.get(this.getChunkKey(chunkCoord.x, chunkCoord.z));

      if (!chunk) return;

      const blockKey = `${position.x},${position.y},${position.z}`;
      chunk.blocks.delete(blockKey);

      // 如果在海平面以下，添加水
      if (position.y <= this.SEA_LEVEL) {
        const waterKey = `${position.x},${position.y},${position.z}`;
        chunk.waterBlocks.set(waterKey, {
          position: { ...position },
          level: 1.0
        });
      }
    } catch (error) {
      console.error('Remove block error:', error);
    }
  }

  // 获取世界数据
  public getWorldData(): any {
    const chunksData: any = {};
    this.chunks.forEach((chunk, key) => {
      chunksData[key] = {
        x: chunk.x,
        z: chunk.z,
        blocks: Array.from(chunk.blocks.entries()),
        waterBlocks: Array.from(chunk.waterBlocks.entries()),
        generated: chunk.generated
      };
    });
    return { chunks: chunksData };
  }

  // 加载世界数据
  public loadWorldData(data: any): void {
    if (!data || !data.chunks) return;

    this.chunks.clear();

    Object.entries(data.chunks).forEach(([key, chunkData]: [string, any]) => {
      const chunk: Chunk = {
        x: chunkData.x,
        z: chunkData.z,
        blocks: new Map(),
        waterBlocks: new Map(),
        generated: chunkData.generated || true
      };

      if (chunkData.blocks) {
        chunkData.blocks.forEach(([blockKey, block]: [string, Block]) => {
          chunk.blocks.set(blockKey, block);
        });
      }

      if (chunkData.waterBlocks) {
        chunkData.waterBlocks.forEach(([waterKey, water]: [string, WaterBlock]) => {
          chunk.waterBlocks.set(waterKey, water);
        });
      }

      this.chunks.set(key, chunk);
    });
  }

  // 清空所有区块
  public clear(): void {
    this.chunks.clear();
  }
}