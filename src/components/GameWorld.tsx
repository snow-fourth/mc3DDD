import React, { useRef, useEffect, useState } from 'react';
import { ArrowLeft, Package, Settings } from 'lucide-react';
import { GameRenderer } from '../game/GameRenderer';
import { WorldManager } from '../game/WorldManager';
import { ControlManager } from '../game/ControlManager';
import { CollisionManager } from '../game/CollisionManager';
import { BlockType } from '../game/types';
import { SaveData } from '../App';

interface GameWorldProps {
  saveData: SaveData | null;
  onBackToHome: () => void;
}

export const GameWorld: React.FC<GameWorldProps> = ({ saveData, onBackToHome }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<{
    renderer: GameRenderer;
    world: WorldManager;
    controls: ControlManager;
    collision: CollisionManager;
  } | null>(null);
  
  const [selectedBlock, setSelectedBlock] = useState<BlockType>('grass');
  const [isLoaded, setIsLoaded] = useState(false);
  const [showInventory, setShowInventory] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const initGame = async () => {
      try {
        const renderer = new GameRenderer(canvasRef.current!);
        const world = new WorldManager();
        const collision = new CollisionManager();
        const controls = new ControlManager(renderer.camera, canvasRef.current!, collision);

        // Load world data or generate new terrain
        if (saveData?.worldData) {
          world.loadWorldData(saveData.worldData);
        } else {
          world.generateTerrain();
        }
        
        // Set up game loop
        let lastTime = 0;
        const targetFPS = 60;
        const frameTime = 1000 / targetFPS;
        
        const animate = () => {
          const currentTime = performance.now();
          const deltaTime = currentTime - lastTime;
          
          if (deltaTime >= frameTime) {
          try {
          controls.update();
          
          // 更新玩家模型
          const isMoving = controls.getIsMoving();
          renderer.updatePlayerModel(isMoving, deltaTime / 1000);
          
          // 更新世界区块（基于玩家位置）
          const playerPos = renderer.camera.position;
            // Convert camera position back to world coordinates
            world.updateWorld(playerPos.x / 0.5, playerPos.z / 0.5);
          
              const blocks = world.getBlocks();
              const waterBlocks = world.getWaterBlocks();
              
              // 更新碰撞检测
              collision.updateBlocks(blocks);
              controls.updateCollisionBlocks(blocks);
              
              renderer.render(blocks, waterBlocks);
            lastTime = currentTime - (deltaTime % frameTime);
          } catch (error) {
            console.error('Animation loop error:', error);
          }
          }
          requestAnimationFrame(animate);
        };

        // Handle block interactions
        const handleClick = (event: MouseEvent) => {
          try {
            event.preventDefault();
            const intersect = renderer.getBlockIntersection(event);
            
            if (intersect) {
              if (event.button === 0) {
                // Left click - place block
                world.placeBlock(intersect.position, selectedBlock);
              } else if (event.button === 2) {
                // Right click - remove block
                world.removeBlock(intersect.blockPosition);
              }
            }
          } catch (error) {
            console.error('Click handler error:', error);
          }
        };

        canvasRef.current.addEventListener('click', handleClick);
        canvasRef.current.addEventListener('contextmenu', (e) => e.preventDefault());

        gameRef.current = { renderer, world, controls, collision };
        animate();
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to initialize game:', error);
      }
    };

    initGame();

    return () => {
      if (gameRef.current) {
        gameRef.current.controls.dispose();
      }
    };
  }, [selectedBlock, saveData]);

  const saveGame = () => {
    if (!gameRef.current || !saveData) return;
    
    const worldData = gameRef.current.world.getWorldData();
    const updatedSave = {
      ...saveData,
      lastPlayed: new Date(),
      worldData
    };
    
    const saves = JSON.parse(localStorage.getItem('minecraft-saves') || '[]');
    const updatedSaves = saves.map((save: SaveData) => 
      save.id === saveData.id ? updatedSave : save
    );
    
    localStorage.setItem('minecraft-saves', JSON.stringify(updatedSaves));
  };

  const blockTypes: BlockType[] = ['grass', 'dirt', 'stone', 'wood', 'sand', 'snow'];
  
  const getBlockColor = (type: BlockType) => {
    switch (type) {
      case 'grass': return '#7CB342';
      case 'dirt': return '#8D6E63';
      case 'stone': return '#9E9E9E';
      case 'wood': return '#8D6E63';
      case 'sand': return '#FDD835';
      case 'snow': return '#FFFFFF';
      default: return '#9E9E9E';
    }
  };

  const getBlockName = (type: BlockType) => {
    const names = {
      grass: '草方块',
      dirt: '泥土',
      stone: '石头',
      wood: '木头',
      sand: '沙子',
      snow: '雪'
    };
    return names[type];
  };

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        style={{ display: 'block' }}
      />
      
      {/* Top UI Bar */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
        <div className="flex gap-4">
          <button
            onClick={onBackToHome}
            className="bg-black bg-opacity-75 hover:bg-opacity-90 text-white p-3 rounded-lg flex items-center gap-2 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            返回主页
          </button>
          
          <button
            onClick={saveGame}
            className="bg-green-600 bg-opacity-75 hover:bg-opacity-90 text-white px-4 py-3 rounded-lg transition-all"
          >
            保存游戏
          </button>
        </div>

        <div className="bg-black bg-opacity-75 p-4 rounded-lg text-white">
          <h2 className="text-lg font-bold mb-2">{saveData?.name || '未知世界'}</h2>
          <div className="text-sm space-y-1">
            <p>WASD - 移动</p>
            <p>鼠标 - 视角</p>
            <p>左键 - 放置方块</p>
            <p>右键 - 破坏方块</p>
            <p>空格 - 上升</p>
            <p>Shift - 下降</p>
            <p className="text-yellow-400">山峰高度: 200米</p>
            <p className="text-blue-400">人物身高: 2米</p>
          </div>
        </div>
      </div>

      {/* Block Inventory */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
        <div className="bg-black bg-opacity-75 p-4 rounded-lg">
          <div className="flex items-center gap-4 mb-3">
            <Package className="w-5 h-5 text-white" />
            <span className="text-white font-medium">方块库存</span>
            <button
              onClick={() => setShowInventory(!showInventory)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex gap-2">
            {blockTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedBlock(type)}
                className={`w-14 h-14 rounded border-2 transition-all duration-200 relative group ${
                  selectedBlock === type 
                    ? 'border-white scale-110 shadow-lg' 
                    : 'border-gray-500 hover:border-gray-300'
                }`}
                style={{ backgroundColor: getBlockColor(type) }}
                title={getBlockName(type)}
              >
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {getBlockName(type)}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-black flex items-center justify-center z-20">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-white text-xl">正在加载世界...</div>
            <div className="text-gray-400 text-sm mt-2">生成地形和水体</div>
          </div>
        </div>
      )}

      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
        <div className="w-6 h-6 border border-white opacity-75">
          <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>
      </div>

      {/* Minimap */}
      <div className="absolute top-4 right-4 w-32 h-32 bg-black bg-opacity-75 rounded-lg p-2 z-10">
        <div className="w-full h-full bg-green-800 rounded relative">
          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-1 left-1 text-white text-xs">地图</div>
        </div>
      </div>
    </div>
  );
};