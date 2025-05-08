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
          // Add small random delay for each card to create a natural flow
          setTimeout(() => {
            animateCard(playerIndex, cardIndex);
          }, Math.random() * 50); // Reduced random delay between 0-50ms
        }
      });

      // Set completion timeout to 3 seconds
      const animationDuration = 3000; // 3 seconds total
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
    cardElement.className = 'card-distribution-animation';
    cardElement.style.position = 'fixed';
    cardElement.style.zIndex = '9999';
    cardElement.style.width = '60px';
    cardElement.style.height = '90px';
    cardElement.style.left = `${centerRect.left + centerRect.width / 2 - 30}px`;
    cardElement.style.top = `${centerRect.top + centerRect.height / 2 - 45}px`;
    cardElement.style.transform = 'scale(0.7)';
    cardElement.style.opacity = '1';
    cardElement.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
    cardElement.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)';
    cardElement.style.borderRadius = '8px';
    cardElement.style.overflow = 'hidden';
    cardElement.style.backgroundColor = 'transparent';
    cardElement.style.pointerEvents = 'none';
    cardElement.style.willChange = 'transform, opacity, left, top';
    cardElement.style.transformOrigin = 'center center';

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
    root.render(
      <div className="w-full h-full rounded-lg overflow-hidden flex items-center justify-center">
        <div 
          className="w-full h-full bg-cover bg-center" 
          style={{ 
            backgroundImage: "url('/cardback.png')",
            borderRadius: '6px',
            border: '2px solid rgba(59, 130, 246, 0.7)'
          }}
        />
      </div>
    );

    // Calculate path with slight randomization
    const midX = (centerRect.left + playerRect.left) / 2 + (Math.random() * 20 - 10);
    const arcHeight = 30 + Math.random() * 10;
    const midY = Math.min(centerRect.top, playerRect.top) - arcHeight;
    
    // Add slight offset for card stacking effect
    const offsetX = (cardIndex % 3) * 2 - 2;
    const offsetY = (cardIndex % 3) * 2 - 2;
    const finalX = playerRect.left + playerRect.width / 2 - 30 + offsetX;
    const finalY = playerRect.top + playerRect.height / 2 - 45 + offsetY;

    // Animate along path
    let startTime: number;
    const travelTime = 250; // Faster animation (250ms)
    
    const animateAlongPath = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / travelTime, 1);
      
      // Enhanced easing for smoother card movement
      const easeOutBack = (t: number): number => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      };
      
      const easedProgress = easeOutBack(progress);
      
      // Bezier curve calculation with smoother path
      const t = easedProgress;
      const u = 1 - t;
      const tt = t * t;
      const uu = u * u;
      const uuu = uu * u;
      const ttt = tt * t;
      
      // Enhanced cubic bezier curve for smoother movement
      const x = uuu * (centerRect.left + centerRect.width / 2 - 30) + 
                3 * uu * t * midX + 
                3 * u * tt * (midX + (finalX - midX) * 0.5) + 
                ttt * finalX;
                
      const y = uuu * (centerRect.top + centerRect.height / 2 - 45) + 
                3 * uu * t * midY + 
                3 * u * tt * (midY + (finalY - midY) * 0.5) + 
                ttt * finalY;
                
      // Apply position with smooth transform
      cardElement.style.left = `${x}px`;
      cardElement.style.top = `${y}px`;
      
      // Only scale, no rotation
      const scale = 0.7 + (easedProgress * 0.3);
      cardElement.style.transform = `scale(${scale})`;
      
      // Enhanced glow effect
      if (progress > 0.7) {
        const glowIntensity = (progress - 0.7) * 3.3;
        cardElement.style.boxShadow = `0 8px 20px rgba(0, 0, 0, 0.15), 0 0 ${10 + glowIntensity * 10}px rgba(59, 130, 246, ${glowIntensity * 0.5})`;
      }
      
      // Smoother fade out
      if (progress > 0.85) {
        cardElement.style.opacity = `${(1 - progress) * 6.7}`;
      }
      
      if (progress < 1) {
        requestAnimationFrame(animateAlongPath);
      } else {
        // Animation complete
        setTimeout(() => {
          setActiveAnimations(prev => prev - 1);
          setCardsDealt(prev => {
            const newCount = prev + 1;
            setProgress(Math.min(100, Math.floor((newCount / totalCardsToDistribute) * 100)));
            return newCount;
          });
          
          // Clean up element immediately
          if (document.body.contains(cardElement)) {
            try {
              root.unmount();
              document.body.removeChild(cardElement);
            } catch (e) {
              console.error("Error removing animation element:", e);
            }
          }
        }, 50);
      }
    };
    
    requestAnimationFrame(animateAlongPath);
  };

  // Add styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .card-distribution-animation {
        position: fixed !important;
        z-index: 9999 !important;
        pointer-events: none !important;
        background-color: transparent !important;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2) !important;
        border-radius: 8px !important;
        overflow: hidden !important;
        will-change: transform, opacity, left, top !important;
        backface-visibility: hidden !important;
        transform: translateZ(0) !important;
        border: 2px solid rgba(59, 130, 246, 0.7) !important;
        filter: drop-shadow(0 0 5px rgba(59, 130, 246, 0.7));
        transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
      }

      @keyframes pulse-glow {
        0%, 100% { box-shadow: 0 0 10px 3px rgba(59, 130, 246, 0.5); }
        50% { box-shadow: 0 0 15px 5px rgba(59, 130, 246, 0.7); }
      }
      
      .pulse-glow {
        animation: pulse-glow 1.5s ease-in-out infinite;
      }
      
      .glassmorphism {
        background: rgba(30, 58, 138, 0.25);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(59, 130, 246, 0.3);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 z-[9995] flex items-center justify-center pointer-events-none backdrop-blur-sm">
      <div className="glassmorphism rounded-xl shadow-xl text-center p-6 max-w-sm w-full mx-auto">
        <h3 className="text-2xl font-bold text-white mb-2">Dealing Cards</h3>
        
        {/* Card stack visualization */}
        <div className="relative h-16 my-3 flex justify-center items-center">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pulse-glow rounded-full w-8 h-8 bg-blue-900/30"></div>
          {[...Array(3)].map((_, i) => (
            <div 
              key={i}
              className="absolute w-12 h-16 bg-white rounded-md shadow-md" 
              style={{ 
                backgroundImage: "url('/cardback.png')",
                backgroundSize: 'cover',
                transform: `rotate(${(i - 1) * 15}deg) translateX(${(i - 1) * 3}px)`,
                zIndex: 10 - Math.abs(i - 1)
              }}
            />
          ))}
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-700 rounded-full h-2 mb-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="text-blue-300 text-xs flex justify-between items-center">
          <div className="text-center w-full">
            {Math.round(progress)}% Complete
          </div>
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