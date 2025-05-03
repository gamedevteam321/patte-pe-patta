import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GameBoard from '../GameBoard';
import '@testing-library/jest-dom';

// Mock the socket context
jest.mock('@/context/SocketContext', () => ({
  useSocket: () => ({
    gameState: {
      gameStarted: true,
      players: [
        { id: 'player1', userId: 'user1', username: 'Player 1', cards: [], isActive: true },
        { id: 'player2', userId: 'user2', username: 'Player 2', cards: [], isActive: true }
      ],
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
  })
}));

// Mock the balance context
jest.mock('@/context/BalanceContext', () => ({
  useBalance: () => ({
    balance: { demo: 1000 }
  })
}));

// Mock the toast
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn()
}));

describe('GameBoard Card Voting', () => {
  let mockSocket;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock socket
    mockSocket = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn()
    };

    // Update the socket in the useSocket mock
    jest.mock('@/context/SocketContext', () => ({
      useSocket: () => ({
        ...jest.requireActual('@/context/SocketContext').useSocket(),
        socket: mockSocket
      })
    }));
  });

  it('should handle card vote request and approval correctly', async () => {
    render(<GameBoard userId="user1" />);

    // Simulate receiving a vote request
    const voteRequestHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'card_vote_request'
    )[1];

    voteRequestHandler({
      roomId: 'room1',
      playerId: 'player2',
      playerName: 'Player 2'
    });

    // Verify vote panel is shown
    expect(screen.getByText('Card Request Vote')).toBeInTheDocument();
    expect(screen.getByText('Player 2 is requesting new cards.')).toBeInTheDocument();

    // Simulate approving the vote
    fireEvent.click(screen.getByText('Approve'));

    // Verify vote was submitted
    expect(mockSocket.emit).toHaveBeenCalledWith('submit_card_vote', {
      roomId: 'room1',
      playerId: 'player2',
      vote: true
    });

    // Simulate receiving vote result
    const voteResultHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'card_vote_result'
    )[1];

    voteResultHandler({
      roomId: 'room1',
      playerId: 'player2',
      approved: true,
      yesVotes: 2,
      noVotes: 0
    });

    // Verify new card deck request was sent
    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('new_card_deck_request', {
        roomId: 'room1',
        playerId: 'player2'
      });
    });
  });

  it('should handle card vote rejection correctly', async () => {
    render(<GameBoard userId="user1" />);

    // Simulate receiving a vote request
    const voteRequestHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'card_vote_request'
    )[1];

    voteRequestHandler({
      roomId: 'room1',
      playerId: 'player2',
      playerName: 'Player 2'
    });

    // Simulate rejecting the vote
    fireEvent.click(screen.getByText('Reject'));

    // Verify vote was submitted
    expect(mockSocket.emit).toHaveBeenCalledWith('submit_card_vote', {
      roomId: 'room1',
      playerId: 'player2',
      vote: false
    });

    // Simulate receiving vote result
    const voteResultHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'card_vote_result'
    )[1];

    voteResultHandler({
      roomId: 'room1',
      playerId: 'player2',
      approved: false,
      yesVotes: 1,
      noVotes: 1
    });

    // Verify rejection toast was shown
    expect(toast).toHaveBeenCalledWith({
      title: "Request Rejected",
      description: "Card request was rejected by other players",
      variant: "destructive"
    });
  });

  it('should prevent duplicate processing of vote results', async () => {
    render(<GameBoard userId="user1" />);

    // Simulate receiving a vote request
    const voteRequestHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'card_vote_request'
    )[1];

    voteRequestHandler({
      roomId: 'room1',
      playerId: 'player2',
      playerName: 'Player 2'
    });

    // Simulate approving the vote
    fireEvent.click(screen.getByText('Approve'));

    // Simulate receiving vote result twice
    const voteResultHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'card_vote_result'
    )[1];

    // First vote result
    voteResultHandler({
      roomId: 'room1',
      playerId: 'player2',
      approved: true,
      yesVotes: 2,
      noVotes: 0
    });

    // Second vote result (should be ignored)
    voteResultHandler({
      roomId: 'room1',
      playerId: 'player2',
      approved: true,
      yesVotes: 2,
      noVotes: 0
    });

    // Verify new card deck request was sent only once
    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledTimes(1);
    });
  });

  it('should auto-reject if vote timer expires', async () => {
    render(<GameBoard userId="user1" />);

    // Simulate receiving a vote request
    const voteRequestHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'card_vote_request'
    )[1];

    voteRequestHandler({
      roomId: 'room1',
      playerId: 'player2',
      playerName: 'Player 2'
    });

    // Fast-forward timer
    jest.advanceTimersByTime(5000);

    // Verify auto-reject was sent
    expect(mockSocket.emit).toHaveBeenCalledWith('submit_card_vote', {
      roomId: 'room1',
      playerId: 'player2',
      vote: false
    });
  });
}); 