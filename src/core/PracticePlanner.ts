import type { Profile, Rng } from '../types';
import { phaseUnlocked } from './Progression';
import { planSession, type SessionPlan } from './SessionPlanner';
import { readingPractice } from '../learning/Reading';

/** Area selection selects real learning work; an empty area stays locked. */
export function planPractice(profile: Profile, phase: number, rng: Rng): SessionPlan | undefined {
  if (!Number.isInteger(phase) || phase < 1 || phase > 8 || !phaseUnlocked(profile, phase)) return undefined;
  const sessionNumber = profile.sessionCount + 1;
  if (phase >= 7) {
    const items = readingPractice(profile, phase, rng);
    return items.length ? { sessionNumber, sections: [{ step: phase + 10, name: phase === 7 ? 'Zinnen lezen' : 'Verhalen lezen', items }] } : undefined;
  }
  const plan = planSession(profile, rng);
  const steps: Readonly<Record<number, readonly number[]>> = {
    1: [1, 2], 2: [3, 7], 3: [3, 7], 4: [4], 5: [5], 6: [4, 5, 6],
  };
  const sections = plan.sections.filter(section => steps[phase]?.includes(section.step)).map(section =>
    phase === 2 || phase === 3 ? { ...section, items: section.items.filter(item => item.kind === 'letterklank') } : section
  ).filter(section => section.items.length > 0);
  return sections.length ? { sessionNumber, sections } : undefined;
}

export function practiceAvailable(profile: Profile, phase: number): boolean {
  return planPractice(profile, phase, () => 0.5) !== undefined;
}
