import * as THREE from 'three';
import { CollisionManager } from './CollisionManager';

export class ControlManager {
  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  private keys: Set<string> = new Set();
  private mouseMovement = { x: 0, y: 0 };
  private isPointerLocked = false;
  private velocity = new THREE.Vector3();
  private direction = new THREE.Vector3();
  private euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private collisionManager: CollisionManager;
  private isOnGround = false;
  private verticalVelocity = 0;
  private readonly GRAVITY = -20; // 重力加速度
  private readonly JUMP_FORCE = 8; // 跳跃力度
  private isMoving = false;

  private readonly MOVE_SPEED = 15; // 7.5m/s in world units (15 blocks/s * 0.5m/block)
  private readonly LOOK_SPEED = 0.002;

  constructor(camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement, collisionManager: CollisionManager) {
    this.camera = camera;
    this.canvas = canvas;
    this.collisionManager = collisionManager;
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Keyboard events
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
    
    // Mouse events
    this.canvas.addEventListener('click', this.requestPointerLock.bind(this));
    document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
  }

  private requestPointerLock(): void {
    this.canvas.requestPointerLock();
  }

  private onPointerLockChange(): void {
    this.isPointerLocked = document.pointerLockElement === this.canvas;
  }

  private onKeyDown(event: KeyboardEvent): void {
    this.keys.add(event.code);
    
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft'].includes(event.code)) {
      event.preventDefault();
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keys.delete(event.code);
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isPointerLocked) return;
    
    this.mouseMovement.x += event.movementX;
    this.mouseMovement.y += event.movementY;
  }

  public update(): void {
    const delta = 1 / 60;
    
    this.updateRotation();
    this.updateMovement(delta);
  }

  private updateRotation(): void {
    if (!this.isPointerLocked) return;
    
    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y -= this.mouseMovement.x * this.LOOK_SPEED;
    this.euler.x -= this.mouseMovement.y * this.LOOK_SPEED;
    
    // Limit vertical rotation
    this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
    
    this.camera.quaternion.setFromEuler(this.euler);
    
    // Reset mouse movement
    this.mouseMovement.x = 0;
    this.mouseMovement.y = 0;
  }

  private updateMovement(delta: number): void {
    const originalPosition = this.camera.position.clone();
    
    // Get forward and right directions
    this.camera.getWorldDirection(this.direction);
    this.direction.y = 0;
    this.direction.normalize();
    
    const right = new THREE.Vector3();
    right.crossVectors(this.direction, this.camera.up).normalize();
    
    // Reset velocity
    this.velocity.set(0, 0, 0);
    this.isMoving = false;
    
    // Calculate movement
    if (this.keys.has('KeyW')) {
      this.velocity.add(this.direction);
      this.isMoving = true;
    }
    if (this.keys.has('KeyS')) {
      this.velocity.sub(this.direction);
      this.isMoving = true;
    }
    if (this.keys.has('KeyA')) {
      this.velocity.sub(right);
      this.isMoving = true;
    }
    if (this.keys.has('KeyD')) {
      this.velocity.add(right);
      this.isMoving = true;
    }
    
    // Normalize to prevent diagonal speed boost
    if (this.velocity.length() > 0) {
      this.velocity.normalize();
      this.velocity.multiplyScalar(this.MOVE_SPEED * delta);
      this.camera.position.add(this.velocity);
    }
    
    // 跳跃逻辑
    if (this.keys.has('Space') && this.isOnGround) {
      this.verticalVelocity = this.JUMP_FORCE;
      this.isOnGround = false;
    }
    
    // 创意模式飞行
    if (this.keys.has('ShiftLeft') && this.keys.has('Space')) {
      this.verticalVelocity = 0;
      this.velocity.y = this.MOVE_SPEED * delta;
    } else if (this.keys.has('ShiftLeft')) {
      this.verticalVelocity = 0;
      this.velocity.y = -this.MOVE_SPEED * delta;
    } else {
      // 应用重力
      this.verticalVelocity += this.GRAVITY * delta;
      this.velocity.y = this.verticalVelocity * delta;
    }
    
    // 碰撞检测
    const newPosition = this.collisionManager.checkCollision(originalPosition, this.velocity);
    
    // 检查是否着地
    const groundHeight = this.collisionManager.getGroundHeight(newPosition.x, newPosition.z);
    if (newPosition.y <= groundHeight && this.verticalVelocity <= 0) {
      newPosition.y = groundHeight;
      this.verticalVelocity = 0;
      this.isOnGround = true;
    } else {
      this.isOnGround = false;
    }
    
    this.camera.position.copy(newPosition);
  }
  
  public getIsMoving(): boolean {
    return this.isMoving;
  }

  public updateCollisionBlocks(blocks: any[]): void {
    this.collisionManager.updateBlocks(blocks);
  }

  public dispose(): void {
    document.removeEventListener('keydown', this.onKeyDown.bind(this));
    document.removeEventListener('keyup', this.onKeyUp.bind(this));
    document.removeEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
    document.removeEventListener('mousemove', this.onMouseMove.bind(this));
  }
}