import { Server } from 'socket.io';
import { Player } from './player.js';
import {
  GameState,
  PlayerInput,
  PLAYER_COLORS,
  MAX_PLAYERS,
  SERVER_TICK_RATE,
  BROADCAST_RATE,
  ServerToClientEvents,
  ClientToServerEvents,
} from '../shared/types.js';

export class Game {
  private players = new Map<string, Player>();
  private colorPool: number[] = [...PLAYER_COLORS];
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private broadcastInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private io: Server<ClientToServerEvents, ServerToClientEvents>) {}

  start(): void {
    this.tickInterval = setInterval(() => this.tick(), 1000 / SERVER_TICK_RATE);
    this.broadcastInterval = setInterval(() => this.broadcast(), 1000 / BROADCAST_RATE);

    this.io.on('connection', (socket) => {
      socket.on('game:join', () => {
        if (this.players.size >= MAX_PLAYERS) {
          return;
        }

        const color = this.colorPool.shift() ?? 0xcccccc;
        const player = new Player(socket.id, color);
        this.players.set(socket.id, player);

        socket.emit('game:joined', {
          id: socket.id,
          state: this.getState(),
        });
      });

      socket.on('game:input', (input: PlayerInput) => {
        const player = this.players.get(socket.id);
        if (player) {
          player.queueInput(input);
        }
      });

      socket.on('disconnect', () => {
        const player = this.players.get(socket.id);
        if (player) {
          this.colorPool.push(player.color);
          this.players.delete(socket.id);
          this.io.emit('game:playerLeft', socket.id);
        }
      });
    });
  }

  stop(): void {
    if (this.tickInterval) clearInterval(this.tickInterval);
    if (this.broadcastInterval) clearInterval(this.broadcastInterval);
  }

  private tick(): void {
    for (const player of this.players.values()) {
      player.processInputs();
    }
  }

  private broadcast(): void {
    const state = this.getState();
    this.io.emit('game:state', state);
  }

  private getState(): GameState {
    const players: GameState['players'] = {};
    for (const player of this.players.values()) {
      players[player.id] = player.toState();
    }
    return { players, timestamp: Date.now() };
  }
}
