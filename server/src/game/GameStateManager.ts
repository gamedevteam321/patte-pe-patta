import { GameState, Player, Card, GamePhase } from '../types/game';
import { GameError } from '../utils/errors';
import { logError, logInfo } from '../utils/logger';

export class GameStateManager {
  private state: GameState;
  private roomId: string;

  constructor(roomId: string, initialPlayers: Player[]) {
    this.roomId = roomId;
    this.state = this.initializeGameState(initialPlayers);
  }

  private initializeGameState(players: Player[]): GameState {
    return {
      phase: 'waiting',
      players: players.map(player => ({
        ...player,
        cards: [],
        isReady: false,
        score: 0
      })),
      currentPlayerIndex: 0,
      deck: this.createDeck(),
      discardPile: [],
      lastPlayedCard: null,
      lastPlayedPlayer: null,
      lastSyncTime: Date.now()
    };
  }

  private createDeck(): Card[] {
    const suits: ('hearts' | 'diamonds' | 'clubs' | 'spades')[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck: Card[] = [];

    for (const suit of suits) {
      for (const value of values) {
        deck.push({ suit, value });
      }
    }

    return this.shuffleDeck(deck);
  }

  private shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  public getState(): GameState {
    return { ...this.state };
  }

  public setPlayerReady(playerId: string): void {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) {
      throw new GameError('PLAYER_NOT_FOUND', 'Player not found in game');
    }

    player.isReady = true;
    this.checkAllPlayersReady();
  }

  private checkAllPlayersReady(): void {
    const allReady = this.state.players.every(player => player.isReady);
    if (allReady && this.state.players.length >= 2) {
      this.startGame();
    }
  }

  private startGame(): void {
    this.state.phase = 'dealing';
    this.dealCards();
    this.state.phase = 'playing';
    this.state.currentPlayerIndex = 0;
    logInfo(`Game started in room ${this.roomId}`);
  }

  private dealCards(): void {
    const cardsPerPlayer = 13;
    for (let i = 0; i < cardsPerPlayer; i++) {
      for (const player of this.state.players) {
        const card = this.state.deck.pop();
        if (card) {
          player.cards.push(card);
        }
      }
    }
  }

  public playCard(playerId: string, card: Card): void {
    if (this.state.phase !== 'playing') {
      throw new GameError('INVALID_PHASE', 'Cannot play card in current phase');
    }

    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      throw new GameError('NOT_YOUR_TURN', 'It is not your turn to play');
    }

    const playerCardIndex = currentPlayer.cards.findIndex(
      c => c.suit === card.suit && c.value === card.value
    );

    if (playerCardIndex === -1) {
      throw new GameError('CARD_NOT_FOUND', 'Card not found in player hand');
    }

    // Remove card from player's hand
    currentPlayer.cards.splice(playerCardIndex, 1);

    // Add card to discard pile
    this.state.discardPile.push(card);
    this.state.lastPlayedCard = card;
    this.state.lastPlayedPlayer = playerId;

    // Check for game end
    if (currentPlayer.cards.length === 0) {
      this.endGame(playerId);
      return;
    }

    // Move to next player
    this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
    this.state.lastSyncTime = Date.now();
  }

  private endGame(winnerId: string): void {
    this.state.phase = 'ended';
    const winner = this.state.players.find(p => p.id === winnerId);
    if (winner) {
      winner.score += 1;
    }
    logInfo(`Game ended in room ${this.roomId}. Winner: ${winnerId}`);
  }

  public addPlayer(player: Player): void {
    if (this.state.phase !== 'waiting') {
      throw new GameError('GAME_IN_PROGRESS', 'Cannot add player while game is in progress');
    }

    this.state.players.push({
      ...player,
      cards: [],
      isReady: false,
      score: 0
    });
  }

  public removePlayer(playerId: string): void {
    if (this.state.phase !== 'waiting') {
      throw new GameError('GAME_IN_PROGRESS', 'Cannot remove player while game is in progress');
    }

    const playerIndex = this.state.players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
      this.state.players.splice(playerIndex, 1);
    }
  }
} 