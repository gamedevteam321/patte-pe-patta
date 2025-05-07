// Game pause/resume synchronization
useEffect(() => {
  if (!socket) return;

  // Listen for game pause event (when cards are being distributed)
  socket.on('game_paused', () => {
    console.log("Received game_paused event - pausing game for all players");
    // Save current timer value if available
    if (turnTimer !== null) {
      setSavedTurnTime(turnTimer);
    }
    setIsGamePaused(true);
    setIsDistributingCards(true);
  });

  // Listen for game resume event (when card distribution is complete)
  socket.on('game_resumed', () => {
    console.log("Received game_resumed event - resuming game for all players");
    setIsDistributingCards(false);
    setIsGamePaused(false);
    
    // Restore the timer if needed
    if (savedTurnTime !== null && gameState?.turnEndTime && gameState.gameStarted && !gameState.isGameOver) {
      // Update the turn end time to now + saved remaining time
      gameState.turnEndTime = Date.now() + savedTurnTime;
      setSavedTurnTime(null);
    }
  });

  return () => {
    socket.off('game_paused');
    socket.off('game_resumed');
  };
}, [socket, turnTimer, savedTurnTime, gameState]); 