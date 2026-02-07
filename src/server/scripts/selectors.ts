import type { Player } from '../player.js';

export type Selector = (players: Player[]) => Player[];

interface Point {
  x: number;
  z: number;
}

function distanceTo(player: Player, point: Point): number {
  const dx = player.position.x - point.x;
  const dz = player.position.z - point.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/** Select all players. */
export function all(): Selector {
  return (players) => [...players];
}

/** Select n random players. */
export function random(n: number): Selector {
  return (players) => {
    if (n >= players.length) return [...players];
    const shuffled = [...players];
    // Fisher-Yates shuffle, take first n
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, n);
  };
}

/** Select the single closest player to a point. */
export function closest(point: Point): Selector {
  return (players) => {
    if (players.length === 0) return [];
    let best = players[0];
    let bestDist = distanceTo(best, point);
    for (let i = 1; i < players.length; i++) {
      const d = distanceTo(players[i], point);
      if (d < bestDist) {
        best = players[i];
        bestDist = d;
      }
    }
    return [best];
  };
}

/** Select the single furthest player from a point. */
export function furthest(point: Point): Selector {
  return (players) => {
    if (players.length === 0) return [];
    let best = players[0];
    let bestDist = distanceTo(best, point);
    for (let i = 1; i < players.length; i++) {
      const d = distanceTo(players[i], point);
      if (d > bestDist) {
        best = players[i];
        bestDist = d;
      }
    }
    return [best];
  };
}

/** Select the n closest players to a point. */
export function nClosest(n: number, point: Point): Selector {
  return (players) => {
    if (n >= players.length) return [...players];
    return [...players]
      .sort((a, b) => distanceTo(a, point) - distanceTo(b, point))
      .slice(0, n);
  };
}

/** Select the n furthest players from a point. */
export function nFurthest(n: number, point: Point): Selector {
  return (players) => {
    if (n >= players.length) return [...players];
    return [...players]
      .sort((a, b) => distanceTo(b, point) - distanceTo(a, point))
      .slice(0, n);
  };
}
