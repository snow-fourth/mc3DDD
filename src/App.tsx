import React, { useState } from 'react';
import { HomePage } from './components/HomePage';
import { GameWorld } from './components/GameWorld';

export interface SaveData {
  id: string;
  name: string;
  lastPlayed: Date;
  thumbnail?: string;
  worldData: any;
}

function App() {
  const [currentView, setCurrentView] = useState<'home' | 'game'>('home');
  const [currentSave, setCurrentSave] = useState<SaveData | null>(null);

  const handleStartGame = (save: SaveData) => {
    setCurrentSave(save);
    setCurrentView('game');
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setCurrentSave(null);
  };

  return (
    <div className="w-full h-screen bg-black">
      {currentView === 'home' ? (
        <HomePage onStartGame={handleStartGame} />
      ) : (
        <GameWorld 
          saveData={currentSave} 
          onBackToHome={handleBackToHome}
        />
      )}
    </div>
  );
}

export default App;