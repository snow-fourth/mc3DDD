import * as THREE from 'three';
import { Block } from './types';

export class CollisionManager {
  private blocks: Map<string, Block> = new Map();
  private readonly BLOCK_SIZE = 0.5;
  private readonly PLAYER_HEIGHT = 1.0; // 2格高 = 1米
  private readonly PLAYER_WIDTH = 0.6;  // 0.6米宽

  public updateBlocks(blocks: Block[]): void {
    this.blocks.clear();
    blocks.forEach(block => {
      const key = `${block.position.x},${block.position.y},${block.position.z}`;
      this.blocks.set(key, block);
    });
  }

  public checkCollision(position: THREE.Vector3, velocity: THREE.Vector3): THREE.Vector3 {
    const newPosition = position.clone().add(velocity);
    const correctedPosition = newPosition.clone();

    // 检查玩家边界框与方块的碰撞
    const playerBox = this.getPlayerBoundingBox(newPosition);
    
    // 分别检查X、Y、Z轴的碰撞
    const originalPos = position.clone();
    
    // X轴碰撞检测
    const testPosX = new THREE.Vector3(newPosition.x, originalPos.y, originalPos.z);
    if (this.hasCollisionAtPosition(testPosX)) {
      correctedPosition.x = originalPos.x;
    }
    
    // Y轴碰撞检测
    const testPosY = new THREE.Vector3(correctedPosition.x, newPosition.y, originalPos.z);
    if (this.hasCollisionAtPosition(testPosY)) {
      correctedPosition.y = originalPos.y;
    }
    
    // Z轴碰撞检测
    const testPosZ = new THREE.Vector3(correctedPosition.x, correctedPosition.y, newPosition.z);
    if (this.hasCollisionAtPosition(testPosZ)) {
      correctedPosition.z = originalPos.z;
    }

    return correctedPosition;
  }

  private getPlayerBoundingBox(position: THREE.Vector3): THREE.Box3 {
    const halfWidth = this.PLAYER_WIDTH / 2;
    const min = new THREE.Vector3(
      position.x - halfWidth,
      position.y - this.PLAYER_HEIGHT,
      position.z - halfWidth
    );
    const max = new THREE.Vector3(
      position.x + halfWidth,
      position.y,
      position.z + halfWidth
    );
    return new THREE.Box3(min, max);
  }

  private hasCollisionAtPosition(position: THREE.Vector3): boolean {
    const playerBox = this.getPlayerBoundingBox(position);
    
    // 获取玩家可能碰撞的方块范围
    const minBlockX = Math.floor((playerBox.min.x) / this.BLOCK_SIZE);
    const maxBlockX = Math.floor((playerBox.max.x) / this.BLOCK_SIZE);
    const minBlockY = Math.floor((playerBox.min.y) / this.BLOCK_SIZE);
    const maxBlockY = Math.floor((playerBox.max.y) / this.BLOCK_SIZE);
    const minBlockZ = Math.floor((playerBox.min.z) / this.BLOCK_SIZE);
    const maxBlockZ = Math.floor((playerBox.max.z) / this.BLOCK_SIZE);

    // 检查范围内的所有方块
    for (let x = minBlockX; x <= maxBlockX; x++) {
      for (let y = minBlockY; y <= maxBlockY; y++) {
        for (let z = minBlockZ; z <= maxBlockZ; z++) {
          const blockKey = `${x},${y},${z}`;
          if (this.blocks.has(blockKey)) {
            const blockBox = this.getBlockBoundingBox(x, y, z);
            if (playerBox.intersectsBox(blockBox)) {
              return true;
            }
          }
        }
      }
    }
    
    return false;
  }

  private getBlockBoundingBox(x: number, y: number, z: number): THREE.Box3 {
    const halfSize = this.BLOCK_SIZE / 2;
    const worldX = x * this.BLOCK_SIZE;
    const worldY = y * this.BLOCK_SIZE;
    const worldZ = z * this.BLOCK_SIZE;
    
    const min = new THREE.Vector3(
      worldX - halfSize,
      worldY - halfSize,
      worldZ - halfSize
    );
    const max = new THREE.Vector3(
      worldX + halfSize,
      worldY + halfSize,
      worldZ + halfSize
    );
    
    return new THREE.Box3(min, max);
  }

  public getGroundHeight(x: number, z: number): number {
    // 从高处向下检查，找到最高的方块
    for (let y = 200; y >= -10; y--) {
      const blockKey = `${Math.floor(x / this.BLOCK_SIZE)},${y},${Math.floor(z / this.BLOCK_SIZE)}`;
      if (this.blocks.has(blockKey)) {
        return (y + 1) * this.BLOCK_SIZE + this.PLAYER_HEIGHT;
      }
    }
    return this.PLAYER_HEIGHT; // 默认高度
  }
}