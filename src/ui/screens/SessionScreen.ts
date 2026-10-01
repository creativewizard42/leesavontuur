/**
 * Sessiescherm: rendert de vaste sessie-loop (GD §3.1) met huisknop en
 * herhaal-knop. TODO(Builder): implementeer.
 */
import type { SessionPlan } from '../../core/SessionPlanner';
import type { Profile } from '../../types';

export interface SessionScreenDeps {
  profile: Profile;
  plan: SessionPlan;
  onExit: () => void;
  onFinished: () => void;
}

export function createSessionScreen(_deps: SessionScreenDeps): HTMLElement {
  throw new Error('TODO(Builder): ui.createSessionScreen');
}
