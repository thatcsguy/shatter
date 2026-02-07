import { Server } from 'socket.io';
import { Player } from './player.js';
import { MechanicManager } from './mechanics/mechanicManager.js';
import { RadialKnockbackMechanic } from './mechanics/radialKnockback.js';
import {
  GameState,
  PlayerInput,
  PLAYER_COLORS,
  ARENA_SIZE,
  MAX_PLAYERS,
  SERVER_TICK_RATE,
  BROADCAST_RATE,
  ServerToClientEvents,
  ClientToServerEvents,
} from '../shared/types.js';

export class Game {
  private players = new Map<string, Player>();
  private colorAssignments = new Map<number, string>(); // color -> playerId
  private mechanicManager = new MechanicManager();
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

        const color = this.pickRandomAvailableColor();
        const player = new Player(socket.id, color);
        this.players.set(socket.id, player);
        this.colorAssignments.set(color, socket.id);

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

      socket.on('player:colorChange', ({ color }) => {
        const player = this.players.get(socket.id);
        if (!player) return;

        // Validate color exists in palette
        if (!(PLAYER_COLORS as readonly number[]).includes(color)) return;

        // Validate color is not taken by another player
        const owner = this.colorAssignments.get(color);
        if (owner && owner !== socket.id) return;

        // Release old color and assign new one
        this.colorAssignments.delete(player.color);
        player.color = color;
        this.colorAssignments.set(color, socket.id);

        this.io.emit('player:colorChanged', { id: socket.id, color });
      });

      socket.on('admin:spawnKnockback', () => {
        const x = Math.random() * ARENA_SIZE;
        const z = Math.random() * ARENA_SIZE;
        this.mechanicManager.add(new RadialKnockbackMechanic(x, z, Date.now()));
      });

      socket.on('disconnect', () => {
        const player = this.players.get(socket.id);
        if (player) {
          this.colorAssignments.delete(player.color);
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

  private pickRandomAvailableColor(): number {
    const available = PLAYER_COLORS.filter(c => !this.colorAssignments.has(c));
    if (available.length === 0) return 0xcccccc;
    return available[Math.floor(Math.random() * available.length)];
  }

  private tick(): void {
    const now = Date.now();
    const players = Array.from(this.players.values());
    this.mechanicManager.tick(now, players);
    for (const player of players) {
      player.processInputs(now);
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
    return { players, mechanics: this.mechanicManager.getStates(), timestamp: Date.now() };
  }
}
