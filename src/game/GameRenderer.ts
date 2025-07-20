import * as THREE from 'three';
import { Block, WaterBlock, Intersection } from './types';
import { PlayerModel } from './PlayerModel';

export class GameRenderer {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  public camera: THREE.PerspectiveCamera;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private blockMeshes: Map<string, THREE.Mesh> = new Map();
  private waterMeshes: Map<string, THREE.Mesh> = new Map();
  private materials: Map<string, THREE.Material> = new Map();
  private textureLoader: THREE.TextureLoader;
  private instancedMeshes: Map<string, THREE.InstancedMesh> = new Map();
  private blockGeometry: THREE.BoxGeometry;
  private waterGeometry: THREE.BoxGeometry;
  private maxInstances = 10000;
  private playerModel: PlayerModel;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    // 创建天空盒渐变效果
    this.createSkybox();
    this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
    
    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 40, 0);
    
    this.renderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
      depth: true
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.textureLoader = new THREE.TextureLoader();
    this.blockGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    this.waterGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    
    this.setupLighting();
    this.setupEventListeners(canvas);
    this.createMaterials();
    this.setupInstancedMeshes();
    
    // 创建玩家模型
    this.playerModel = new PlayerModel();
    this.scene.add(this.playerModel.group);
  }

  private createSkybox(): void {
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0077ff) },
        bottomColor: { value: new THREE.Color(0xffffff) },
        offset: { value: 33 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(sky);
  }
  private setupLighting(): void {
    // 环境光 - 更柔和
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);
    
    // 主光源 (太阳)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(100, 150, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.bias = -0.0001;
    directionalLight.shadow.normalBias = 0.02;
    this.scene.add(directionalLight);

    // 添加辅助光源 (天空光)
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x362d1d, 0.3);
    this.scene.add(hemisphereLight);

    // 添加点光源 (模拟反射光)
    const pointLight = new THREE.PointLight(0xffffff, 0.5, 100);
    pointLight.position.set(-50, 80, -50);
    this.scene.add(pointLight);
  }

  private createPixelTexture(colors: number[][]): THREE.Texture {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d')!;
    
    const pixelSize = size / colors.length;
    
    for (let y = 0; y < colors.length; y++) {
      for (let x = 0; x < colors[y].length; x++) {
        const color = colors[y][x];
        context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.generateMipmaps = false;
    return texture;
  }

  private createMaterials(): void {
    // Create Minecraft original style textures
    const grassTexture = this.createPixelTexture([
      [0x7CB342, 0x8BC34A, 0x689F38, 0x7CB342, 0x8BC34A, 0x689F38, 0x7CB342, 0x8BC34A],
      [0x8BC34A, 0x689F38, 0x558B2F, 0x689F38, 0x7CB342, 0x8BC34A, 0x689F38, 0x7CB342],
      [0x689F38, 0x558B2F, 0x689F38, 0x7CB342, 0x8BC34A, 0x689F38, 0x558B2F, 0x689F38],
      [0x7CB342, 0x689F38, 0x7CB342, 0x8BC34A, 0x689F38, 0x7CB342, 0x689F38, 0x7CB342],
      [0x8BC34A, 0x7CB342, 0x8BC34A, 0x689F38, 0x7CB342, 0x8BC34A, 0x7CB342, 0x8BC34A],
      [0x689F38, 0x8BC34A, 0x689F38, 0x7CB342, 0x8BC34A, 0x689F38, 0x8BC34A, 0x689F38],
      [0x7CB342, 0x689F38, 0x7CB342, 0x8BC34A, 0x689F38, 0x7CB342, 0x689F38, 0x7CB342],
      [0x8BC34A, 0x7CB342, 0x8BC34A, 0x689F38, 0x7CB342, 0x8BC34A, 0x7CB342, 0x8BC34A]
    ]);
    
    const dirtTexture = this.createPixelTexture([
      [0x8D6E63, 0x795548, 0x6D4C41, 0x8D6E63, 0x795548, 0x6D4C41, 0x8D6E63, 0x795548],
      [0x795548, 0x6D4C41, 0x5D4037, 0x6D4C41, 0x8D6E63, 0x795548, 0x6D4C41, 0x8D6E63],
      [0x6D4C41, 0x5D4037, 0x6D4C41, 0x795548, 0x8D6E63, 0x6D4C41, 0x5D4037, 0x6D4C41],
      [0x8D6E63, 0x6D4C41, 0x795548, 0x8D6E63, 0x6D4C41, 0x795548, 0x6D4C41, 0x795548],
      [0x795548, 0x8D6E63, 0x6D4C41, 0x795548, 0x8D6E63, 0x795548, 0x8D6E63, 0x6D4C41],
      [0x6D4C41, 0x795548, 0x5D4037, 0x6D4C41, 0x795548, 0x6D4C41, 0x795548, 0x6D4C41],
      [0x8D6E63, 0x6D4C41, 0x795548, 0x8D6E63, 0x6D4C41, 0x795548, 0x6D4C41, 0x795548],
      [0x795548, 0x8D6E63, 0x6D4C41, 0x795548, 0x8D6E63, 0x795548, 0x8D6E63, 0x6D4C41]
    ]);
    
    const stoneTexture = this.createPixelTexture([
      [0x9E9E9E, 0x757575, 0x616161, 0x9E9E9E, 0x757575, 0x616161, 0x9E9E9E, 0x757575],
      [0x757575, 0x616161, 0x424242, 0x616161, 0x9E9E9E, 0x757575, 0x616161, 0x9E9E9E],
      [0x616161, 0x424242, 0x616161, 0x757575, 0x9E9E9E, 0x616161, 0x424242, 0x616161],
      [0x9E9E9E, 0x616161, 0x757575, 0x9E9E9E, 0x616161, 0x757575, 0x616161, 0x757575],
      [0x757575, 0x9E9E9E, 0x616161, 0x757575, 0x9E9E9E, 0x757575, 0x9E9E9E, 0x616161],
      [0x616161, 0x757575, 0x424242, 0x616161, 0x757575, 0x616161, 0x757575, 0x616161],
      [0x9E9E9E, 0x616161, 0x757575, 0x9E9E9E, 0x616161, 0x757575, 0x616161, 0x757575],
      [0x757575, 0x9E9E9E, 0x616161, 0x757575, 0x9E9E9E, 0x757575, 0x9E9E9E, 0x616161]
    ]);
    
    const woodTexture = this.createPixelTexture([
      [0x8D6E63, 0x6D4C41, 0x5D4037, 0x8D6E63, 0x6D4C41, 0x5D4037, 0x8D6E63, 0x6D4C41],
      [0x6D4C41, 0x5D4037, 0x4E342E, 0x5D4037, 0x8D6E63, 0x6D4C41, 0x5D4037, 0x8D6E63],
      [0x5D4037, 0x4E342E, 0x5D4037, 0x6D4C41, 0x8D6E63, 0x5D4037, 0x4E342E, 0x5D4037],
      [0x8D6E63, 0x5D4037, 0x6D4C41, 0x8D6E63, 0x5D4037, 0x6D4C41, 0x5D4037, 0x6D4C41],
      [0x6D4C41, 0x8D6E63, 0x5D4037, 0x6D4C41, 0x8D6E63, 0x6D4C41, 0x8D6E63, 0x5D4037],
      [0x5D4037, 0x6D4C41, 0x4E342E, 0x5D4037, 0x6D4C41, 0x5D4037, 0x6D4C41, 0x5D4037],
      [0x8D6E63, 0x5D4037, 0x6D4C41, 0x8D6E63, 0x5D4037, 0x6D4C41, 0x5D4037, 0x6D4C41],
      [0x6D4C41, 0x8D6E63, 0x5D4037, 0x6D4C41, 0x8D6E63, 0x6D4C41, 0x8D6E63, 0x5D4037]
    ]);
    
    const sandTexture = this.createPixelTexture([
      [0xFDD835, 0xF9A825, 0xF57F17, 0xFDD835, 0xF9A825, 0xF57F17, 0xFDD835, 0xF9A825],
      [0xF9A825, 0xF57F17, 0xEF6C00, 0xF57F17, 0xFDD835, 0xF9A825, 0xF57F17, 0xFDD835],
      [0xF57F17, 0xEF6C00, 0xF57F17, 0xF9A825, 0xFDD835, 0xF57F17, 0xEF6C00, 0xF57F17],
      [0xFDD835, 0xF57F17, 0xF9A825, 0xFDD835, 0xF57F17, 0xF9A825, 0xF57F17, 0xF9A825],
      [0xF9A825, 0xFDD835, 0xF57F17, 0xF9A825, 0xFDD835, 0xF9A825, 0xFDD835, 0xF57F17],
      [0xF57F17, 0xF9A825, 0xEF6C00, 0xF57F17, 0xF9A825, 0xF57F17, 0xF9A825, 0xF57F17],
      [0xFDD835, 0xF57F17, 0xF9A825, 0xFDD835, 0xF57F17, 0xF9A825, 0xF57F17, 0xF9A825],
      [0xF9A825, 0xFDD835, 0xF57F17, 0xF9A825, 0xFDD835, 0xF9A825, 0xFDD835, 0xF57F17]
    ]);
    
    const snowTexture = this.createPixelTexture([
      [0xFFFFFF, 0xF5F5F5, 0xEEEEEE, 0xFFFFFF, 0xF5F5F5, 0xEEEEEE, 0xFFFFFF, 0xF5F5F5],
      [0xF5F5F5, 0xEEEEEE, 0xE0E0E0, 0xEEEEEE, 0xFFFFFF, 0xF5F5F5, 0xEEEEEE, 0xFFFFFF],
      [0xEEEEEE, 0xE0E0E0, 0xEEEEEE, 0xF5F5F5, 0xFFFFFF, 0xEEEEEE, 0xE0E0E0, 0xEEEEEE],
      [0xFFFFFF, 0xEEEEEE, 0xF5F5F5, 0xFFFFFF, 0xEEEEEE, 0xF5F5F5, 0xEEEEEE, 0xF5F5F5],
      [0xF5F5F5, 0xFFFFFF, 0xEEEEEE, 0xF5F5F5, 0xFFFFFF, 0xF5F5F5, 0xFFFFFF, 0xEEEEEE],
      [0xEEEEEE, 0xF5F5F5, 0xE0E0E0, 0xEEEEEE, 0xF5F5F5, 0xEEEEEE, 0xF5F5F5, 0xEEEEEE],
      [0xFFFFFF, 0xEEEEEE, 0xF5F5F5, 0xFFFFFF, 0xEEEEEE, 0xF5F5F5, 0xEEEEEE, 0xF5F5F5],
      [0xF5F5F5, 0xFFFFFF, 0xEEEEEE, 0xF5F5F5, 0xFFFFFF, 0xF5F5F5, 0xFFFFFF, 0xEEEEEE]
    ]);

    // 使用更高质量的材质
    this.materials.set('grass', new THREE.MeshStandardMaterial({ 
      map: grassTexture,
      roughness: 0.8,
      metalness: 0.0
    }));
    this.materials.set('dirt', new THREE.MeshStandardMaterial({ 
      map: dirtTexture,
      roughness: 0.9,
      metalness: 0.0
    }));
    this.materials.set('stone', new THREE.MeshStandardMaterial({ 
      map: stoneTexture,
      roughness: 0.7,
      metalness: 0.1
    }));
    this.materials.set('wood', new THREE.MeshStandardMaterial({ 
      map: woodTexture,
      roughness: 0.8,
      metalness: 0.0
    }));
    this.materials.set('sand', new THREE.MeshStandardMaterial({ 
      map: sandTexture,
      roughness: 0.9,
      metalness: 0.0
    }));
    this.materials.set('snow', new THREE.MeshStandardMaterial({ 
      map: snowTexture,
      roughness: 0.1,
      metalness: 0.0
    }));

    // Water material
    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x006994,
      transparent: true,
      opacity: 0.8,
      roughness: 0.1,
      metalness: 0.0,
      side: THREE.DoubleSide,
      envMapIntensity: 1.0
    });
    this.materials.set('water', waterMaterial);
  }

  private setupInstancedMeshes(): void {
    // 为每种方块类型创建实例化网格
    const blockTypes = ['grass', 'dirt', 'stone', 'wood', 'sand', 'snow'];
    
    blockTypes.forEach(type => {
      const material = this.materials.get(type);
      if (material) {
        const instancedMesh = new THREE.InstancedMesh(
          this.blockGeometry,
          material,
          this.maxInstances
        );
        instancedMesh.castShadow = true;
        instancedMesh.receiveShadow = true;
        instancedMesh.count = 0;
        this.instancedMeshes.set(type, instancedMesh);
        this.scene.add(instancedMesh);
      }
    });

    // 水的实例化网格
    const waterMaterial = this.materials.get('water');
    if (waterMaterial) {
      const waterInstancedMesh = new THREE.InstancedMesh(
        this.waterGeometry,
        waterMaterial,
        this.maxInstances
      );
      waterInstancedMesh.count = 0;
      this.instancedMeshes.set('water', waterInstancedMesh);
      this.scene.add(waterInstancedMesh);
    }
  }
  private setupEventListeners(canvas: HTMLCanvasElement): void {
    const handleResize = () => {
      this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    
    window.addEventListener('resize', handleResize);
  }

  public render(blocks: Block[], waterBlocks: WaterBlock[] = []): void {
    try {
      // 使用实例化渲染提高性能
      this.renderInstancedBlocks(blocks);
      this.renderInstancedWater(waterBlocks);
      
      this.renderer.render(this.scene, this.camera);
    } catch (error) {
      console.error('Render error:', error);
    }
  }

  public updatePlayerModel(isMoving: boolean, deltaTime: number): void {
    this.playerModel.update(isMoving, deltaTime);
    
    // 更新玩家模型位置和旋转
    const cameraPosition = this.camera.position.clone();
    cameraPosition.y -= 1.0; // 调整到脚部位置
    this.playerModel.setPosition(cameraPosition);
    
    // 根据相机旋转设置玩家模型旋转
    const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
    this.playerModel.setRotation(euler.y);
  }

  private renderInstancedBlocks(blocks: Block[]): void {
    // 按类型分组方块
    const blocksByType = new Map<string, Block[]>();
    blocks.forEach(block => {
      if (!blocksByType.has(block.type)) {
        blocksByType.set(block.type, []);
      }
      blocksByType.get(block.type)!.push(block);
    });

    // 更新每种类型的实例化网格
    this.instancedMeshes.forEach((instancedMesh, type) => {
      if (type === 'water') return;
      
      const blocksOfType = blocksByType.get(type) || [];
      instancedMesh.count = Math.min(blocksOfType.length, this.maxInstances);
      
      const matrix = new THREE.Matrix4();
      blocksOfType.slice(0, this.maxInstances).forEach((block, index) => {
        matrix.setPosition(
          block.position.x * 0.5,
          block.position.y * 0.5,
          block.position.z * 0.5
        );
        instancedMesh.setMatrixAt(index, matrix);
      });
      
      if (instancedMesh.count > 0) {
        instancedMesh.instanceMatrix.needsUpdate = true;
      }
    });
  }

  private renderInstancedWater(waterBlocks: WaterBlock[]): void {
    const waterInstancedMesh = this.instancedMeshes.get('water');
    if (!waterInstancedMesh) return;

    waterInstancedMesh.count = Math.min(waterBlocks.length, this.maxInstances);
    
    const matrix = new THREE.Matrix4();
    waterBlocks.slice(0, this.maxInstances).forEach((water, index) => {
      matrix.makeScale(1, water.level, 1);
      matrix.setPosition(
        water.position.x * 0.5,
        water.position.y * 0.5,
        water.position.z * 0.5
      );
      waterInstancedMesh.setMatrixAt(index, matrix);
    });
    
    if (waterInstancedMesh.count > 0) {
      waterInstancedMesh.instanceMatrix.needsUpdate = true;
    }
  }

  public getBlockIntersection(event: MouseEvent): Intersection | null {
    try {
      const canvas = this.renderer.domElement;
      const rect = canvas.getBoundingClientRect();
      
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      this.raycaster.setFromCamera(this.mouse, this.camera);
      
      // 检测实例化网格的交集
      const instancedMeshes = Array.from(this.instancedMeshes.values()).filter(mesh => mesh.count > 0);
      const intersects = this.raycaster.intersectObjects(instancedMeshes);
      
      if (intersects.length > 0) {
        const intersect = intersects[0];
        const instancedMesh = intersect.object as THREE.InstancedMesh;
        const instanceId = intersect.instanceId!;
        
        // 获取实例的变换矩阵
        const matrix = new THREE.Matrix4();
        instancedMesh.getMatrixAt(instanceId, matrix);
        
        const position = new THREE.Vector3();
        matrix.decompose(position, new THREE.Quaternion(), new THREE.Vector3());
        
        const blockPosition = {
          x: Math.round(position.x / 0.5),
          y: Math.round(position.y / 0.5),
          z: Math.round(position.z / 0.5)
        };
        
        // Calculate adjacent position based on face normal
        const face = intersect.face!;
        const normal = face.normal.clone();
        normal.transformDirection(instancedMesh.matrixWorld);
        
        const adjacentPosition = {
          x: blockPosition.x + Math.round(normal.x),
          y: blockPosition.y + Math.round(normal.y),
          z: blockPosition.z + Math.round(normal.z)
        };
        
        return {
          position: adjacentPosition,
          blockPosition,
          face: this.getFaceName(normal)
        };
      }
      
      return null;
    } catch (error) {
      console.error('Intersection error:', error);
      return null;
    }
  }

  private getFaceName(normal: THREE.Vector3): string {
    const abs = normal.clone().normalize();
    if (abs.y > 0.5) return 'top';
    if (abs.y < -0.5) return 'bottom';
    if (abs.x > 0.5) return 'right';
    if (abs.x < -0.5) return 'left';
    if (abs.z > 0.5) return 'front';
    if (abs.z < -0.5) return 'back';
    return 'unknown';
  }
}