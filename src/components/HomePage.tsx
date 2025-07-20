import React, { useState, useEffect } from 'react';
import { Play, Plus, Trash2, Mountain, Calendar } from 'lucide-react';
import { SaveData } from '../App';

interface HomePageProps {
  onStartGame: (save: SaveData) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onStartGame }) => {
  const [saves, setSaves] = useState<SaveData[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorldName, setNewWorldName] = useState('');

  useEffect(() => {
    // Load saves from localStorage
    const savedData = localStorage.getItem('minecraft-saves');
    if (savedData) {
      try {
        const parsedSaves = JSON.parse(savedData).map((save: any) => ({
          ...save,
          lastPlayed: new Date(save.lastPlayed)
        }));
        setSaves(parsedSaves);
      } catch (error) {
        console.error('Error loading saves:', error);
        createDefaultSave();
      }
    } else {
      createDefaultSave();
    }
  }, []);

  const createDefaultSave = () => {
    const defaultSave: SaveData = {
      id: 'default',
      name: '我的世界',
      lastPlayed: new Date(),
      worldData: null
    };
    setSaves([defaultSave]);
    localStorage.setItem('minecraft-saves', JSON.stringify([defaultSave]));
  };

  const createNewWorld = () => {
    if (!newWorldName.trim()) return;
    
    const newSave: SaveData = {
      id: Date.now().toString(),
      name: newWorldName,
      lastPlayed: new Date(),
      worldData: null
    };
    
    const updatedSaves = [...saves, newSave];
    setSaves(updatedSaves);
    localStorage.setItem('minecraft-saves', JSON.stringify(updatedSaves));
    setNewWorldName('');
    setShowCreateModal(false);
  };

  const deleteSave = (id: string) => {
    const updatedSaves = saves.filter(save => save.id !== id);
    setSaves(updatedSaves);
    localStorage.setItem('minecraft-saves', JSON.stringify(updatedSaves));
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-green-800 to-brown-700 flex flex-col">
      {/* Header */}
      <div className="text-center py-12">
        <h1 className="text-6xl font-bold text-white mb-4 drop-shadow-lg">
          我的世界 3D
        </h1>
        <p className="text-xl text-blue-100">探索无限的方块世界</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-8">
        <div className="bg-black bg-opacity-50 rounded-lg p-8 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Mountain className="w-8 h-8" />
              游戏存档
            </h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              创建新世界
            </button>
          </div>

          {/* Saves Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {saves.map((save) => (
              <div
                key={save.id}
                className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors group"
              >
                <div className="aspect-video bg-gradient-to-br from-green-400 to-blue-500 rounded-lg mb-4 flex items-center justify-center">
                  <Mountain className="w-12 h-12 text-white opacity-75" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">{save.name}</h3>
                
                <div className="flex items-center text-gray-400 text-sm mb-4">
                  <Calendar className="w-4 h-4 mr-2" />
                  {formatDate(save.lastPlayed)}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onStartGame(save)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    开始游戏
                  </button>
                  
                  {save.id !== 'default' && (
                    <button
                      onClick={() => deleteSave(save.id)}
                      className="bg-red-600 hover:bg-red-700 text-white p-2 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create World Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-white mb-6">创建新世界</h3>
            
            <div className="mb-6">
              <label className="block text-white mb-2">世界名称</label>
              <input
                type="text"
                value={newWorldName}
                onChange={(e) => setNewWorldName(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入世界名称..."
                onKeyPress={(e) => e.key === 'Enter' && createNewWorld()}
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={createNewWorld}
                disabled={!newWorldName.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 rounded-lg transition-colors"
              >
                创建
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewWorldName('');
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-8 text-blue-200">
        <p>使用 WASD 移动，鼠标控制视角，左键放置方块，右键破坏方块</p>
      </div>
    </div>
  );
};