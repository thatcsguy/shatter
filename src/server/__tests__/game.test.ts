import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Server } from 'socket.io';
import { Game } from '../game.js';
import { PLAYER_COLORS } from '../../shared/types.js';

// --- Socket.IO mock ---
type Handler = (...args: any[]) => void;

function createMockSocket(id: string) {
  const handlers: Record<string, Handler> = {};
  return {
    id,
    handlers,
    on: vi.fn((event: string, cb: Handler) => {
      handlers[event] = cb;
    }),
    emit: vi.fn(),
  };
}

function createMockIO() {
  const connectionHandlers: Handler[] = [];
  const io = {
    on: vi.fn((event: string, cb: Handler) => {
      if (event === 'connection') connectionHandlers.push(cb);
    }),
    emit: vi.fn(),
    _connect(socket: ReturnType<typeof createMockSocket>) {
      for (const cb of connectionHandlers) cb(socket);
    },
  };
  return io;
}

describe('Game color management', () => {
  let io: ReturnType<typeof createMockIO>;
  let game: Game;

  beforeEach(() => {
    vi.useFakeTimers();
    io = createMockIO();
    game = new Game(io as unknown as Server);
    game.start();
  });

  afterEach(() => {
    game.stop();
    vi.useRealTimers();
  });

  function connectAndJoin(id: string) {
    const socket = createMockSocket(id);
    io._connect(socket);
    socket.handlers['game:join']();
    return socket;
  }

  function getJoinedColor(socket: ReturnType<typeof createMockSocket>): number {
    const joinedCall = socket.emit.mock.calls.find(
      (c: any[]) => c[0] === 'game:joined'
    );
    if (!joinedCall) throw new Error('No game:joined event emitted');
    const data = joinedCall[1] as { id: string; state: { players: Record<string, { color: number }> } };
    return data.state.players[data.id].color;
  }

  it('assigns a color from the palette on join', () => {
    const socket = connectAndJoin('p1');
    const color = getJoinedColor(socket);
    expect((PLAYER_COLORS as readonly number[]).includes(color)).toBe(true);
  });

  it('assigns unique colors to different players', () => {
    const s1 = connectAndJoin('p1');
    const s2 = connectAndJoin('p2');
    const s3 = connectAndJoin('p3');
    const s4 = connectAndJoin('p4');

    const colors = [s1, s2, s3, s4].map(s => getJoinedColor(s));
    const unique = new Set(colors);
    expect(unique.size).toBe(4);
  });

  it('allows color change to an available color', () => {
    const s1 = connectAndJoin('p1');
    const initialColor = getJoinedColor(s1);

    // Pick a different color from the palette
    const newColor = PLAYER_COLORS.find(c => c !== initialColor)!;
    io.emit.mockClear();

    s1.handlers['player:colorChange']({ color: newColor });

    expect(io.emit).toHaveBeenCalledWith('player:colorChanged', {
      id: 'p1',
      color: newColor,
    });
  });

  it('rejects color change to a color taken by another player', () => {
    const s1 = connectAndJoin('p1');
    const s2 = connectAndJoin('p2');
    const p2Color = getJoinedColor(s2);

    io.emit.mockClear();
    s1.handlers['player:colorChange']({ color: p2Color });

    // Should not emit colorChanged
    expect(io.emit).not.toHaveBeenCalledWith(
      'player:colorChanged',
      expect.anything()
    );
  });

  it('rejects color change to a color not in the palette', () => {
    const s1 = connectAndJoin('p1');
    io.emit.mockClear();

    s1.handlers['player:colorChange']({ color: 0x123456 });

    expect(io.emit).not.toHaveBeenCalledWith(
      'player:colorChanged',
      expect.anything()
    );
  });

  it('frees previous color on color change', () => {
    const s1 = connectAndJoin('p1');
    const s2 = connectAndJoin('p2');
    const p1Color = getJoinedColor(s1);

    // Pick a color not taken by either player
    const p2Color = getJoinedColor(s2);
    const freeColor = PLAYER_COLORS.find(c => c !== p1Color && c !== p2Color)!;

    // p1 changes to freeColor
    s1.handlers['player:colorChange']({ color: freeColor });

    // Now p1's old color should be available — p2 should be able to take it
    io.emit.mockClear();
    s2.handlers['player:colorChange']({ color: p1Color });

    expect(io.emit).toHaveBeenCalledWith('player:colorChanged', {
      id: 'p2',
      color: p1Color,
    });
  });

  it('frees color on disconnect', () => {
    const s1 = connectAndJoin('p1');
    const p1Color = getJoinedColor(s1);

    // Disconnect p1
    s1.handlers['disconnect']();

    // New player should be able to get p1's old color (eventually, since random)
    // Instead, let's connect a new player and verify the color is available
    const s2 = connectAndJoin('p2');
    io.emit.mockClear();

    // p2 should be able to change to p1's old color
    s2.handlers['player:colorChange']({ color: p1Color });
    expect(io.emit).toHaveBeenCalledWith('player:colorChanged', {
      id: 'p2',
      color: p1Color,
    });
  });

  it('allows re-selecting your own current color (no-op)', () => {
    const s1 = connectAndJoin('p1');
    const p1Color = getJoinedColor(s1);

    io.emit.mockClear();
    s1.handlers['player:colorChange']({ color: p1Color });

    // Should succeed (no-op but valid)
    expect(io.emit).toHaveBeenCalledWith('player:colorChanged', {
      id: 'p1',
      color: p1Color,
    });
  });
});
