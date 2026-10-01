import type { SkillId } from '../types';

/**
 * Leerlijn in 9 fasen (ED §3) en de koppeling naar de game-gebieden in Het
 * Klankwoud (GD §1.3). Structurele data; de beslisregels zelf (drempels,
 * poortcondities) staan in `core/Progression.ts` en `core/Adaptive.ts`.
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
    skills: ['AN.VC', 'SY.VC', 'AN.CVC', 'SY.CVC', 'FN.COUNT'],
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
    skills: ['DE.CVVC', 'DE.CCVC', 'DE.CVCC', 'DE.CCVCC', 'AN.CLUSTER', 'SY.CLUSTER'],
    minItems: 15,
  },
  {
    id: 7,
    name: 'Zinnen',
    area: 'De Zinnenzee',
    skills: ['SW.de', 'SW.een', 'SW.het', 'ZI.PHRASE', 'ZI.SIMPLE', 'ZI.CAPITAL', 'LK.UPPER'],
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

/** Gebied op de wereldkaart (GD §1.3). `phase: 0` = vrij spelen (geen fase). */
export interface Area {
  phase: number;
  name: string;
  description: string;
}

export const AREAS: readonly Area[] = [
  { phase: 1, name: 'De Fluisterheuvel', description: 'Rijm, klappen, eerste/laatste klank horen (auditief).' },
  { phase: 2, name: 'Het Vormenwoud', description: 'Letter zien, klank horen, letter terugvinden.' },
  { phase: 3, name: 'De Klankbron', description: 'Letter zien en de juiste klank kiezen; klank horen en de letter kiezen.' },
  { phase: 4, name: 'De Plakplek', description: 'Hakken en plakken van klanken.' },
  { phase: 5, name: 'De Woordweide', description: 'Eerste echte, korte klankzuivere woorden lezen.' },
  { phase: 6, name: 'De Klauterrotsen', description: 'Langere en moeilijker woorden: clusters en tweetekenklanken.' },
  { phase: 7, name: 'De Zinnenzee', description: 'Woordgroepen en zinnen, inclusief sight words en hoofdletters.' },
  { phase: 8, name: 'Het Verhalendal', description: 'Korte verhaalpagina’s met een begripsvraag.' },
  { phase: 9, name: 'De Vlotheidstoren', description: 'Vlotheid ten opzichte van het eigen record, pas na accuraatheid.' },
  { phase: 0, name: 'De Speelwei', description: 'Vrij oefenen zonder opdracht en zonder score.' },
];

export function getPhase(id: number): Phase | undefined {
  return PHASES.find((p) => p.id === id);
}

export function getArea(phase: number): Area | undefined {
  return AREAS.find((a) => a.phase === phase);
}
