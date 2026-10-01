import type { SkillId } from '../types';

/**
 * Leerlijn in 9 fasen (ED §3). Structurele data; de beslisregels zelf
 * (drempels, poortcondities) staan in `core/Progression.ts` en
 * `core/Adaptive.ts`.
 */
export interface Phase {
  id: number;
  name: string;
  /** Gebied in het Klankwoud (GD §1.3). */
  area: string;
  skills: SkillId[];
  /** Aantal items dat minimaal nodig is voor "gemeesterd" (ED §3). */
  minItems: number;
}

export const PHASES: readonly Phase[] = [
  {
    id: 1,
    name: 'Klanken herkennen (auditief)',
    area: 'De Fluisterheuvel',
    skills: ['PH.RHYME', 'PH.SYLLABLE', 'FN.FIRST_SOUND', 'FN.LAST_SOUND', 'FN.COUNT'],
    minItems: 12,
  },
  {
    id: 2,
    name: 'Letters (vorm)',
    area: 'Het Vormenwoud',
    skills: ['LK.RECOGNIZE'],
    minItems: 10,
  },
  {
    id: 3,
    name: 'Letter-klankkoppeling',
    area: 'De Klankbron',
    skills: ['LK.SOUND'],
    minItems: 12,
  },
  {
    id: 4,
    name: 'Samenvoegen (analyse/synthese)',
    area: 'De Plakplek',
    skills: ['AN.VC', 'SY.VC', 'AN.CVC', 'SY.CVC'],
    minItems: 12,
  },
  {
    id: 5,
    name: 'Korte klankzuivere woorden',
    area: 'De Woordweide',
    skills: ['DE.VC', 'DE.CVC', 'DE.CVVC'],
    minItems: 15,
  },
  {
    id: 6,
    name: 'Meer woorden (clusters, tweetekenklanken)',
    area: 'De Klauterrotsen',
    skills: ['DE.CCVC', 'DE.CVCC', 'DE.CCVCC', 'AN.CLUSTER', 'SY.CLUSTER'],
    minItems: 15,
  },
  {
    id: 7,
    name: 'Zinnen',
    area: 'De Zinnenzee',
    skills: ['SW.de', 'ZI.PHRASE', 'ZI.SIMPLE', 'ZI.CAPITAL', 'LK.UPPER'],
    minItems: 10,
  },
  {
    id: 8,
    name: 'Korte teksten',
    area: 'Het Verhalendal',
    skills: ['TX.SHORT'],
    minItems: 5,
  },
  {
    id: 9,
    name: 'Automatiseren',
    area: 'De Vlotheidstoren',
    skills: ['FL.GRAPHEME', 'FL.CVC', 'FL.WORDLIST', 'FL.SENTENCE'],
    minItems: 20,
  },
];

export function getPhase(id: number): Phase | undefined {
  return PHASES.find((p) => p.id === id);
}
