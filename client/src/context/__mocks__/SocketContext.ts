export const useSocket = jest.fn(() => ({
  gameState: {
    gameStarted: true,
    players: [],
    currentPlayerIndex: 0,
    centralPile: [],
    status: 'in_progress'
  },
  currentRoom: {
    id: 'room1',
    betAmount: 100
  },
  socket: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  },
  playCard: jest.fn(),
  shuffleDeck: jest.fn()
})); 