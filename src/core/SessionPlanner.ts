/**
 * Sessieplanner: vaste sessie-loop (GD §3.1) met adaptieve mix 60/25/15
 * (ED §10.3). DOM-vrij en injecteerbaar-RNG.
 * TODO(Builder): implementeer de sessie-opbouw en integrate met learning/.
 */
import type { ActivityItem, Profile, Rng } from '../types';
import { defaultRng } from '../types';

export interface SessionSection {
  step: number;
  name: string;
  items: ActivityItem[];
}

export interface SessionPlan {
  sessionNumber: number;
  sections: SessionSection[];
}

export function planSession(
  _profile: Profile,
  _rng: Rng = defaultRng,
): SessionPlan {
  throw new Error('TODO(Builder): SessionPlanner.planSession');
}
