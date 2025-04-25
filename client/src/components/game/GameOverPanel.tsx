import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Socket } from 'socket.io-client';
import { GameState, Room } from '@/types/game';

interface GameOverPanelProps {
  gameState: GameState;
  currentRoom: Room | null;
  userId: string;
  socket: Socket | null;
  initialPlayerCount: number;
  reason?: 'time_up' | 'normal';
}

const GameOverPanel: React.FC<GameOverPanelProps> = ({
  gameState,
  currentRoom,
  userId,
  socket,
  initialPlayerCount,
  reason = 'normal'
}) => {
  const navigate = useNavigate();
  const winner = gameState.winner;
  const isUserWinner = winner?.id === userId;
  const poolAmount = (currentRoom?.betAmount || 0) * initialPlayerCount;

  const handleReturnToLobby = () => {
    if (socket) {
      socket.emit('leave_room', currentRoom?.id);
    }
    navigate('/lobby');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#0B0C10] p-4 sm:p-6 md:p-8 rounded-lg w-full max-w-lg mx-auto my-auto">
        {/* Game Over Header */}
        <div className="text-center space-y-2 mb-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-blue-300">
            {reason === 'time_up' ? "Time's Up! Game Over!" : "Game Over!"}
          </h2>
          <div className="text-lg sm:text-xl text-white">
            {isUserWinner ? (
              <span className="text-green-400">Congratulations! You won! 🎉</span>
            ) : (
              <span className="text-yellow-400">{winner?.username} won the game!</span>
            )}
          </div>
        </div>
        
        {/* Pool Amount Display */}
        <div className="bg-[#1A1B1E] p-3 sm:p-4 rounded-lg mb-4">
          <div className="text-center">
            <div className="text-gray-400 text-sm mb-1">Total Pool Amount</div>
            <div className="text-xl sm:text-2xl font-bold text-green-400">₹{poolAmount}</div>
            <div className="text-xs text-gray-500 mt-1">
              ({initialPlayerCount} players × ₹{currentRoom?.betAmount || 0} bet)
            </div>
          </div>
        </div>

        
       

        {/* Return to Lobby Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleReturnToLobby}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors w-full sm:w-auto"
          >
            Return to Lobby
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GameOverPanel; 