import type { BaseMechanic } from '../mechanics/baseMechanic.js';
import { RadialKnockbackMechanic } from '../mechanics/radialKnockback.js';
import type { MechanicFactory, MechanicParams } from './scriptRunner.js';

export class DefaultMechanicFactory implements MechanicFactory {
  create(params: MechanicParams, now: number, delay?: number): BaseMechanic {
    switch (params.type) {
      case 'radialKnockback':
        return new RadialKnockbackMechanic(
          params.x,
          params.z,
          now,
          delay,
          params.knockbackDistance,
          params.knockbackDuration,
        );
    }
  }
}
