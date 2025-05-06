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

  useEffect(() => {
    // If we've distributed all cards to all players, complete the animation
    if (currentPlayerIndex >= players.length) {
      onComplete();
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
      
      // Get player position based on index
      let playerPosition;
      switch (currentPlayerIndex) {
        case 0:
          playerPosition = 'bottom';
          break;
        case 1:
          playerPosition = 'top';
          break;
        case 2:
          playerPosition = 'right';
          break;
        case 3:
          playerPosition = 'left';
          break;
        case 4:
          playerPosition = 'top-left';
          break;
        case 5:
          playerPosition = 'top-right';
          break;
        default:
          playerPosition = 'bottom';
      }

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
      cardElement.className = 'card-distribution-animation';
      cardElement.style.position = 'fixed';
      cardElement.style.zIndex = '9999';
      cardElement.style.width = '50px';
      cardElement.style.height = '80px';
      cardElement.style.left = `${centerRect.left + centerRect.width / 2 - 40}px`;
      cardElement.style.top = `${centerRect.top + centerRect.height / 2 - 60}px`;
      cardElement.style.transform = 'scale(0.5)';
      cardElement.style.opacity = '1';
      cardElement.style.transition = 'all 0.1s cubic-bezier(0.4, 0, 0.2, 1)';
      cardElement.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
      cardElement.style.borderRadius = '8px';
      cardElement.style.overflow = 'hidden';
      cardElement.style.backgroundColor = 'white';
      cardElement.style.pointerEvents = 'none';
      cardElement.style.willChange = 'transform, opacity, left, top';

      // Create container for ReactDOM
      const cardContent = document.createElement('div');
      cardContent.className = 'w-full h-full relative';
      cardElement.appendChild(cardContent);

      // Add to body
      document.body.appendChild(cardElement);

      // Create root and render card
      const root = createRoot(cardContent);
      root.render(<PlayingCard card={currentPlayer.cards[currentCardIndex]} />);

      // Animate card to player with a slight delay for smoother animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          cardElement.style.left = `${playerRect.left + playerRect.width / 2 - 40}px`;
          cardElement.style.top = `${playerRect.top + playerRect.height / 2 - 60}px`;
          cardElement.style.transform = 'scale(0.5) rotate(360deg)';
          cardElement.style.opacity = '0';
        });
      });

      // Clean up after animation
      setTimeout(() => {
        root.unmount();
        document.body.removeChild(cardElement);
        setIsAnimating(false);
        setCurrentCardIndex(prev => prev + 1);
      }, 300); // Reduced from 500ms to 300ms
    };

    if (!isAnimating) {
      animateCard();
    }
  }, [currentPlayerIndex, currentCardIndex, players, isAnimating, onComplete]);

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
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return null;
};

export default CardDistributionAnimation; 