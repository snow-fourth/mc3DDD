import * as THREE from 'three';

export class PlayerModel {
  public group: THREE.Group;
  private head: THREE.Mesh;
  private body: THREE.Mesh;
  private leftArm: THREE.Mesh;
  private rightArm: THREE.Mesh;
  private leftLeg: THREE.Mesh;
  private rightLeg: THREE.Mesh;
  private walkAnimation = 0;
  private isWalking = false;

  constructor() {
    this.group = new THREE.Group();
    this.createPlayerModel();
  }

  private createPlayerModel(): void {
    // 创建MC风格的像素化材质
    const skinTexture = this.createSkinTexture();
    const material = new THREE.MeshStandardMaterial({ 
      map: skinTexture,
      transparent: false
    });

    // 头部 (8x8x8 像素 = 0.2x0.2x0.2 米)
    const headGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    this.head = new THREE.Mesh(headGeometry, material);
    this.head.position.set(0, 0.85, 0); // 头部位置
    this.head.castShadow = true;
    this.group.add(this.head);

    // 身体 (8x12x4 像素 = 0.2x0.3x0.1 米)
    const bodyGeometry = new THREE.BoxGeometry(0.2, 0.3, 0.1);
    this.body = new THREE.Mesh(bodyGeometry, material);
    this.body.position.set(0, 0.5, 0);
    this.body.castShadow = true;
    this.group.add(this.body);

    // 左臂 (4x12x4 像素 = 0.1x0.3x0.1 米)
    const armGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.1);
    this.leftArm = new THREE.Mesh(armGeometry, material);
    this.leftArm.position.set(-0.15, 0.5, 0);
    this.leftArm.castShadow = true;
    this.group.add(this.leftArm);

    // 右臂
    this.rightArm = new THREE.Mesh(armGeometry, material);
    this.rightArm.position.set(0.15, 0.5, 0);
    this.rightArm.castShadow = true;
    this.group.add(this.rightArm);

    // 左腿 (4x12x4 像素 = 0.1x0.3x0.1 米)
    const legGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.1);
    this.leftLeg = new THREE.Mesh(legGeometry, material);
    this.leftLeg.position.set(-0.05, 0.15, 0);
    this.leftLeg.castShadow = true;
    this.group.add(this.leftLeg);

    // 右腿
    this.rightLeg = new THREE.Mesh(legGeometry, material);
    this.rightLeg.position.set(0.05, 0.15, 0);
    this.rightLeg.castShadow = true;
    this.group.add(this.rightLeg);

    // 设置整个模型的位置（相对于相机）
    this.group.position.set(0, -0.9, 0); // 调整到相机下方
    this.group.scale.set(0.8, 0.8, 0.8); // 稍微缩小一点
  }

  private createSkinTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d')!;

    // 创建Steve皮肤的简化版本
    // 头部 (棕色头发，肤色脸部)
    context.fillStyle = '#8B4513'; // 棕色头发
    context.fillRect(8, 8, 8, 8);
    context.fillStyle = '#FDBCB4'; // 肤色
    context.fillRect(8, 8, 8, 8);
    
    // 身体 (蓝色衬衫)
    context.fillStyle = '#0066CC';
    context.fillRect(20, 20, 8, 12);
    
    // 手臂 (肤色)
    context.fillStyle = '#FDBCB4';
    context.fillRect(44, 20, 4, 12);
    context.fillRect(36, 52, 4, 12);
    
    // 腿部 (蓝色裤子)
    context.fillStyle = '#003366';
    context.fillRect(4, 20, 4, 12);
    context.fillRect(20, 52, 4, 12);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    return texture;
  }

  public update(isMoving: boolean, deltaTime: number): void {
    this.isWalking = isMoving;
    
    if (this.isWalking) {
      this.walkAnimation += deltaTime * 8; // 行走动画速度
      
      // 手臂摆动
      this.leftArm.rotation.x = Math.sin(this.walkAnimation) * 0.5;
      this.rightArm.rotation.x = -Math.sin(this.walkAnimation) * 0.5;
      
      // 腿部摆动
      this.leftLeg.rotation.x = -Math.sin(this.walkAnimation) * 0.5;
      this.rightLeg.rotation.x = Math.sin(this.walkAnimation) * 0.5;
      
      // 轻微的上下摆动
      this.group.position.y = -0.9 + Math.sin(this.walkAnimation * 2) * 0.02;
    } else {
      // 停止时恢复默认姿势
      this.leftArm.rotation.x = 0;
      this.rightArm.rotation.x = 0;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.group.position.y = -0.9;
    }
  }

  public setPosition(position: THREE.Vector3): void {
    this.group.position.copy(position);
    this.group.position.y -= 0.9; // 调整到脚部位置
  }

  public setRotation(rotation: number): void {
    this.group.rotation.y = rotation;
  }

  public dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
  }
}