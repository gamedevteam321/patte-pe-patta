import React from 'react';
import { toast } from '@/hooks/use-toast';
import { Socket } from 'socket.io-client';

interface VotePanelProps {
  socket: Socket | null;
  voteRequest: {
    playerId: string;
    playerName: string;
    roomId: string;
  } | null;
  userPlayerId: string | undefined;
  voteTimer: number;
  onVoteSubmitted: () => void;
}

const VotePanelComponent: React.FC<VotePanelProps> = ({
  socket,
  voteRequest,
  userPlayerId,
  voteTimer,
  onVoteSubmitted
}) => {
  if (!voteRequest || !socket) {
    return null;
  }

  // Direct event handlers for buttons - no arrow functions in JSX
  function approveVote() {
    console.log('APPROVE button clicked');
    
    // Submit vote to server
    socket.emit('submit_card_vote', {
      roomId: voteRequest.roomId,
      playerId: voteRequest.playerId,
      vote: true
    });
    
    // Show feedback toast
    toast({
      title: "Vote: Approved",
      description: "Your vote has been submitted",
      duration: 2000
    });
    
    // Tell parent component the vote was submitted
    onVoteSubmitted();
  }
  
  function rejectVote() {
    console.log('REJECT button clicked');
    
    // Submit vote to server
    socket.emit('submit_card_vote', {
      roomId: voteRequest.roomId,
      playerId: voteRequest.playerId,
      vote: false
    });
    
    // Show feedback toast
    toast({
      title: "Vote: Rejected",
      description: "Your vote has been submitted",
      duration: 2000
    });
    
    // Tell parent component the vote was submitted
    onVoteSubmitted();
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]" style={{pointerEvents: 'auto'}}>
      <div className="bg-[#1F2937] p-6 rounded-lg shadow-xl max-w-md w-full mx-4 border border-blue-500/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Card Request Vote</h3>
          <div className="flex items-center gap-2">
            <div className="bg-blue-500/20 px-3 py-1 rounded-full text-sm text-blue-300">
              Vote Required
            </div>
            <div className="bg-red-500/20 px-3 py-1 rounded-full text-sm text-red-300">
              {voteTimer}s
            </div>
          </div>
        </div>
        
        <p className="text-gray-300 mb-6">
          <span className="text-blue-400 font-medium">{voteRequest.playerName}</span> is requesting new cards.
          Do you approve this request?
        </p>
        
        <div className="flex gap-4 justify-center">
          <button
            type="button"
            onClick={approveVote}
            style={{
              pointerEvents: 'auto',
              cursor: 'pointer',
              backgroundColor: '#22c55e', 
              padding: '12px 24px',
              borderRadius: '8px',
              color: 'white',
              fontWeight: 'bold',
              border: 'none',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Approve
          </button>
          <button
            type="button"
            onClick={rejectVote}
            style={{
              pointerEvents: 'auto',
              cursor: 'pointer',
              backgroundColor: '#ef4444',
              padding: '12px 24px',
              borderRadius: '8px',
              color: 'white',
              fontWeight: 'bold',
              border: 'none',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reject
          </button>
        </div>

        <div className="mt-4 text-center text-sm text-gray-400">
          {voteTimer > 0 
            ? `You have ${voteTimer} seconds to vote`
            : "Time's up! Auto-rejecting..."}
        </div>
      </div>
    </div>
  );
};

export default VotePanelComponent; 