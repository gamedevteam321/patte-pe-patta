import React, { useEffect, useState } from 'react';
import { Card, Player } from '@/context/SocketContext';
import PlayingCard from './PlayingCard';
import { createRoot } from 'react-dom/client';

interface CardDistributionAnimationProps {
  players: Player[];
  onComplete: () => void;
}

const CardDistributionAnimation: React.FC<CardDistributionAnimationProps> = ({ players, onComplete }) => {
  const [isDistributing, setIsDistributing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [activeAnimations, setActiveAnimations] = useState<number>(0);
  const [animationElements, setAnimationElements] = useState<HTMLElement[]>([]);
  const [totalCardsToDistribute] = useState(13 * players.length);
  const [cardsDealt, setCardsDealt] = useState(0);
  const [deckSize, setDeckSize] = useState(52); // Initialize with full deck

  // Add more robust initialization and cleanup
  useEffect(() => {
    console.log("CardDistributionAnimation component mounted");
    
    // Clear any existing animation elements from previous runs
    const existingElements = document.querySelectorAll('.card-distribution-animation');
    existingElements.forEach(el => {
      try {
        if (document.body.contains(el)) {
          document.body.removeChild(el);
        }
      } catch (e) {
        console.error("Error removing existing animation element:", e);
      }
    });
    
    // Reset animation state
    setActiveAnimations(0);
    setAnimationElements([]);
    setProgress(0);
    setCardsDealt(0);
    setDeckSize(52);
    
    return () => {
      // Clean up any remaining animation elements when component unmounts
      animationElements.forEach(el => {
        try {
          if (document.body.contains(el)) {
            document.body.removeChild(el);
          }
        } catch (e) {
          console.error("Error removing animation element on unmount:", e);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (isDistributing) {
      // Start distributing cards to all players simultaneously
      players.forEach((player, playerIndex) => {
        for (let cardIndex = 0; cardIndex < 13; cardIndex++) {
          // Remove delay for instant distribution
          setTimeout(() => {
            animateCard(playerIndex, cardIndex);
            setDeckSize(prev => prev - 1);
          }, 100); // Set to 0 to remove delay
        }
      });

      // Set completion timeout to 2 seconds
      const animationDuration = 2000; // 2 seconds total
      setTimeout(() => {
        if (isDistributing) {
          console.log("Animation complete");
          onComplete();
        }
      }, animationDuration);
    }
  }, [isDistributing, players, onComplete]);

  const animateCard = (playerIndex: number, cardIndex: number) => {
    const centerPool = document.querySelector('.center-area');
    const playerPosition = getPlayerPosition(playerIndex, players.length);
    const playerContainer = document.querySelector(`.player-deck-${playerPosition}`);
    
    if (!centerPool || !playerContainer) return;

    const centerRect = centerPool.getBoundingClientRect();
    const playerRect = playerContainer.getBoundingClientRect();

    // Create card element for animation
    const cardElement = document.createElement('div');
    cardElement.className = 'card-travel';
    cardElement.style.position = 'fixed';
    cardElement.style.zIndex = '9999';
    cardElement.style.width = '60px';
    cardElement.style.height = '90px';
    cardElement.style.left = `${centerRect.left + centerRect.width / 2 - 30}px`;
    cardElement.style.top = `${centerRect.top + centerRect.height / 2 - 45}px`;
    cardElement.style.transform = 'scale(0.7)';
    cardElement.style.transition = 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';

    // Create container for ReactDOM
    const cardContent = document.createElement('div');
    cardContent.className = 'w-full h-full relative';
    cardElement.appendChild(cardContent);

    // Add to body
    document.body.appendChild(cardElement);
    
    // Track this active animation
    setActiveAnimations(prev => prev + 1);

    // Create root and render card (always face down)
    const root = createRoot(cardContent);
    root.render(
      <div className="w-full h-full rounded-lg overflow-hidden flex items-center justify-center">
        <div 
          className="w-full h-full bg-cover bg-center" 
          style={{ 
            backgroundImage: "url('/cardback.png')",
            borderRadius: '6px',
            border: '2px solid rgba(94, 96, 99, 0.7)'
          }}
        />
      </div>
    );

    // Add slight offset for card stacking effect
    const offsetX = (cardIndex % 3) * 2 - 2;
    const offsetY = (cardIndex % 3) * 2 - 2;
    const finalX = playerRect.left + playerRect.width / 2 - 30 + offsetX;
    const finalY = playerRect.top + playerRect.height / 2 - 45 + offsetY;

    // Start animation after a small delay
    setTimeout(() => {
      cardElement.style.left = `${finalX}px`;
      cardElement.style.top = `${finalY}px`;
      cardElement.style.transform = 'scale(1)';
    }, 10);

    // Clean up after animation completes
    setTimeout(() => {
      setActiveAnimations(prev => prev - 1);
      if (document.body.contains(cardElement)) {
        try {
          root.unmount();
          document.body.removeChild(cardElement);
        } catch (e) {
          console.error("Error removing animation element:", e);
        }
      }
    }, 500);
  };

  // Add styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .card-travel {
        position: fixed !important;
        z-index: 9999 !important;
        pointer-events: none !important;
        background-color: transparent !important;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2) !important;
        border-radius: 8px !important;
        overflow: hidden !important;
        will-change: transform, opacity, left, top !important;
        backface-visibility: hidden !important;
        transform: translateZ(0) !important;
        border: 2px solid rgba(94, 96, 99, 0.7) !important;
      }

      @keyframes card-travel {
        0% {
          transform: scale(1) rotate(0deg);
          box-shadow: 0 0 0 rgba(0, 0, 0, 0);
        }
        40% {
          transform: scale(1.2) rotate(180deg) translateY(-80px);
          box-shadow: 0 0 20px rgba(88, 89, 90, 0.7);
        }
        100% {
          transform: scale(1) rotate(360deg);
          box-shadow: 0 0 10px rgba(174, 181, 192, 0.3);
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  

  return (
    <div className="fixed inset-0 z-[9995] flex items-center justify-center pointer-events-none ">
      <div className=" rounded-xl shadow-xl text-center p-6 max-w-sm w-full mx-auto">
        {/* Card stack visualization */}
        <div className="center-area relative h-32 my-3 flex justify-center items-center">
          
        </div>
        
       
      </div>
    </div>
  );
};

// Get player position based on index and total players
const getPlayerPosition = (index: number, totalPlayers: number) => {
  switch (totalPlayers) {
    case 2:
      return index === 0 ? 'bottom' : 'top';
    case 3:
      switch (index) {
        case 0: return 'bottom';
        case 1: return 'left';
        case 2: return 'top';
        default: return 'bottom';
      }
    case 4:
      switch (index) {
        case 0: return 'bottom';
        case 1: return 'left';
        case 2: return 'top';
        case 3: return 'right';
        default: return 'bottom';
      }
    case 5:
      switch (index) {
        case 0: return 'bottom';
        case 1: return 'left';
        case 2: return 'top';
        case 3: return 'right';
        case 4: return 'top-left';
        default: return 'bottom';
      }
    case 6:
      switch (index) {
        case 0: return 'bottom';
        case 1: return 'left';
        case 2: return 'top';
        case 3: return 'right';
        case 4: return 'top-left';
        case 5: return 'top-right';
        default: return 'bottom';
      }
    default:
      return 'bottom';
  }
};

export default CardDistributionAnimation; 