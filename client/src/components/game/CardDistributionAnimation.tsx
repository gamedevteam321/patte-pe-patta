import React, { useEffect, useState } from 'react';
import { Card, Player } from '@/context/SocketContext';
import PlayingCard from './PlayingCard';
import { createRoot } from 'react-dom/client';

interface CardDistributionAnimationProps {
  players: Player[];
  onComplete: () => void;
}

const CardDistributionAnimation: React.FC<CardDistributionAnimationProps> = ({ players, onComplete }) => {
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeAnimations, setActiveAnimations] = useState<number>(0);
  const [animationElements, setAnimationElements] = useState<HTMLElement[]>([]);
  const [isDistributing, setIsDistributing] = useState(true);
  const [totalCardsToDistribute] = useState(13 * players.length);
  const [dealSpeed] = useState(50); // ms per card

  // Add more robust initialization and cleanup
  useEffect(() => {
    console.log("CardDistributionAnimation component mounted");
    
    // Clear any existing animation elements from previous runs
    const existingElements = document.querySelectorAll('.card-distribution-animation');
    console.log(`Found ${existingElements.length} existing animation elements to clean up`);
    
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
    setCurrentPlayerIndex(0);
    setCurrentCardIndex(0);
    setIsAnimating(false);
    setActiveAnimations(0);
    setAnimationElements([]);
    
    console.log("CardDistributionAnimation initialized with", players.length, "players");
    
    return () => {
      console.log("CardDistributionAnimation component unmounting");
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
      // Track how long the distribution is taking
      const animation = setTimeout(() => {
        // Start animation
        console.log("Starting card distribution animation");
        
        // After all cards are dealt, notify parent that animation is complete
        const animationDuration = 2000 + (dealSpeed * totalCardsToDistribute); // Base 2 seconds + time per card
        setTimeout(onComplete, animationDuration);

        // Set a safety timeout in case animation gets stuck
        setTimeout(() => {
          if (isDistributing) {
            console.log("Warning: Animation took too long - forcing completion");
            onComplete();
          }
        }, animationDuration + 2000); // Add 2 seconds safety margin
      }, 1000);
      
      return () => {
        clearTimeout(animation);
      };
    }
  }, [isDistributing, onComplete, totalCardsToDistribute, dealSpeed]);

  useEffect(() => {
    // If we've distributed all cards to all players, complete the animation
    if (currentPlayerIndex >= players.length) {
      console.log("All players have received their cards, animation complete");
      
      // Wait for all active animations to complete
      if (activeAnimations === 0) {
        console.log("All animations finished, cleaning up and signaling completion");
        
        // Clean up animation elements
        setTimeout(() => {
          animationElements.forEach(el => {
            try {
              if (document.body.contains(el)) {
                document.body.removeChild(el);
              }
            } catch (e) {
              console.error("Error removing animation element:", e);
            }
          });
          setAnimationElements([]);
          
          // Signal completion after cleanup
          console.log("Animation cleanup complete, calling onComplete callback");
          onComplete();
        }, 500);
      }
      return;
    }

    // If we've distributed all cards to the current player, move to next player
    if (currentCardIndex >= 13) {
      setCurrentPlayerIndex(prev => prev + 1);
      setCurrentCardIndex(0);
      return;
    }

    const animateCard = () => {
      setIsAnimating(true);
      const currentPlayer = players[currentPlayerIndex];
      
      if (!currentPlayer) return;

      // Get center pool and player container elements
      const centerPool = document.querySelector('.center-area');
      
      // Get player position based on index and total players
      const playerPosition = getPlayerPosition(currentPlayerIndex, players.length);

      const playerContainer = document.querySelector(`.player-deck-${playerPosition}`);
      
      if (!centerPool || !playerContainer) {
        console.log("Missing elements:", { centerPool, playerContainer });
        setIsAnimating(false);
        return;
      }

      const centerRect = centerPool.getBoundingClientRect();
      const playerRect = playerContainer.getBoundingClientRect();

      // Create card element for animation
      const cardElement = document.createElement('div');
      cardElement.className = 'card-distribution-animation water-flow';
      cardElement.style.position = 'fixed';
      cardElement.style.zIndex = '9999';
      cardElement.style.width = '50px';
      cardElement.style.height = '80px';
      cardElement.style.left = `${centerRect.left + centerRect.width / 2 - 40}px`;
      cardElement.style.top = `${centerRect.top + centerRect.height / 2 - 60}px`;
      cardElement.style.transform = 'scale(0.5)';
      cardElement.style.opacity = '1';
      cardElement.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
      cardElement.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
      cardElement.style.borderRadius = '8px';
      cardElement.style.overflow = 'hidden';
      cardElement.style.backgroundColor = 'white';
      cardElement.style.pointerEvents = 'none';
      cardElement.style.willChange = 'transform, opacity, left, top';

      // Add to tracked elements list
      setAnimationElements(prev => [...prev, cardElement]);

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
      
      // Even if the player already has cards, show them face down during distribution
      if (currentPlayer.cards[currentCardIndex]) {
        root.render(<PlayingCard card={currentPlayer.cards[currentCardIndex]} isBack={true}/>);
      } else {
        // Fallback for when card might not be available yet
        root.render(
          <div className="w-full h-full bg-blue-800 rounded-lg flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
          </div>
        );
      }

      // Calculate a curved path for more fluid motion
      const midX = (centerRect.left + playerRect.left) / 2 + Math.random() * 50 - 25; // Add some randomness
      const midY = (centerRect.top + playerRect.top) / 2 - 50 - Math.random() * 30; // Higher arc with randomness
      
      // Set random travel time between 400-800ms for more natural flow
      const travelTime = 400 + Math.random() * 400;
      
      // Animate along bezier path with varying speeds
      let startTime: number;
      
      const animateAlongPath = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / travelTime, 1);
        
        // Bezier curve calculation
        const t = progress;
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * t;
        
        // Quadratic bezier curve (smoother)
        const x = uuu * (centerRect.left + centerRect.width / 2 - 40) + 
                  3 * uu * t * midX + 
                  3 * u * tt * midX + 
                  ttt * (playerRect.left + playerRect.width / 2 - 40);
                  
        const y = uuu * (centerRect.top + centerRect.height / 2 - 60) + 
                  3 * uu * t * midY + 
                  3 * u * tt * midY + 
                  ttt * (playerRect.top + playerRect.height / 2 - 60);
                  
        // Apply position
        cardElement.style.left = `${x}px`;
        cardElement.style.top = `${y}px`;
        
        // Apply rotation based on progress
        const rotation = 360 * progress;
        cardElement.style.transform = `scale(${0.5 + progress * 0.2}) rotate(${rotation}deg)`;
        
        // Fade out near the end
        if (progress > 0.8) {
          cardElement.style.opacity = `${(1 - progress) * 5}`; // Fade out in last 20%
        }
        
        if (progress < 1) {
          requestAnimationFrame(animateAlongPath);
        } else {
          // Animation complete
          setTimeout(() => {
            // Decrement active animations counter
            setActiveAnimations(prev => prev - 1);
            setIsAnimating(false);
            setCurrentCardIndex(prev => prev + 1);
            
            // Add a small delay before removing the element
            setTimeout(() => {
              if (document.body.contains(cardElement)) {
                try {
                  root.unmount();
                  document.body.removeChild(cardElement);
                } catch (e) {
                  console.error("Error removing animation element:", e);
                }
              }
            }, 100);
          }, 100);
        }
      };
      
      requestAnimationFrame(animateAlongPath);
    };

    // Animate with staggered timing for more natural flow
    if (!isAnimating) {
      setTimeout(() => {
        animateCard();
      }, Math.random() * 50); // Add slight randomness to timing
    }
  }, [currentPlayerIndex, currentCardIndex, players, isAnimating, onComplete, activeAnimations, animationElements]);

  // Add styles to ensure animation is visible
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .card-distribution-animation {
        position: fixed !important;
        z-index: 9999 !important;
        pointer-events: none !important;
        background-color: white !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
        border-radius: 8px !important;
        overflow: hidden !important;
        will-change: transform, opacity, left, top !important;
        backface-visibility: hidden !important;
        transform: translateZ(0) !important;
      }

      @keyframes water-flow {
        0% {
          transform: translateY(0) rotate(0deg) scale(1);
          filter: brightness(1);
        }
        25% {
          transform: translateY(-20px) rotate(5deg) scale(1.1);
          filter: brightness(1.2);
        }
        50% {
          transform: translateY(-40px) rotate(-5deg) scale(1.2);
          filter: brightness(1.3);
        }
        75% {
          transform: translateY(-20px) rotate(5deg) scale(1.1);
          filter: brightness(1.2);
        }
        100% {
          transform: translateY(0) rotate(0deg) scale(1);
          filter: brightness(1);
        }
      }

      .water-flow {
        animation: water-flow 1.5s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 z-[9995] flex items-center justify-center pointer-events-none">
      <div className="bg-blue-900/80 p-6 rounded-lg shadow-xl text-center">
        <h3 className="text-2xl font-bold text-white mb-4">Distributing Cards</h3>
        <div className="text-blue-200 mb-4">
          Please wait while cards are being distributed...
        </div>
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <div className="text-blue-300 mt-4 text-sm">
          {players.length > 0 ? (
            <span>
              Player {currentPlayerIndex + 1}/{players.length}, Card {currentCardIndex + 1}/13
            </span>
          ) : (
            <span>Preparing animation...</span>
          )}
        </div>
      </div>
    </div>
  );
};

// Get player position based on index and total players
const getPlayerPosition = (index: number, totalPlayers: number) => {
  switch (totalPlayers) {
    case 2:
      // For 2 players: bottom and top
      return index === 0 ? 'bottom' : 'top';
    
    case 3:
      // For 3 players: bottom, right, and top
      switch (index) {
        case 0: return 'bottom';
        case 1: return 'left';
        case 2: return 'top';
        default: return 'bottom';
      }
    
    case 4:
      // For 4 players: bottom, right, top, and left
      switch (index) {
        case 0: return 'bottom';
        case 1: return 'left';
        case 2: return 'top';
        case 3: return 'right';
        default: return 'bottom';
      }
    
    case 5:
      // For 5 players: bottom, right, top, left, and top-left
      switch (index) {
        case 0: return 'bottom';
        case 1: return 'left';
        case 2: return 'top';
        case 3: return 'right';
        case 4: return 'top-left';
        default: return 'bottom';
      }
    
    case 6:
      // For 6 players: bottom, right, top, left, top-left, and top-right
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
      // Default to bottom for any other case
      return 'bottom';
  }
};

export default CardDistributionAnimation; 