import { describe, expect, it } from 'vitest';
import { MVP_WORDS } from '../words';
import { blendSkillForWord, decodeSkillForWord, segmentSkillForWord } from '../skills';

describe('pattern → skill-mapping (EDU-011)', () => {
  it('decodeert korte patronen naar DE.VC/DE.CVC', () => {
    expect(decodeSkillForWord('as')).toBe('DE.VC');
    expect(decodeSkillForWord('arm')).toBe('DE.CVCC');
    expect(decodeSkillForWord('kam')).toBe('DE.CVC');
    expect(decodeSkillForWord('mis')).toBe('DE.CVC');
  });

  it('geeft lange klinkers/tweetekenklanken de CVVC-categorie', () => {
    expect(decodeSkillForWord('kaas')).toBe('DE.CVVC');
    expect(decodeSkillForWord('muur')).toBe('DE.CVVC');
    expect(decodeSkillForWord('oom')).toBe('DE.CVVC');
    expect(decodeSkillForWord('eet')).toBe('DE.CVVC');
    expect(decodeSkillForWord('bij')).toBe('DE.CVVC');
  });

  it('classificeert clusters als CCVC/CVCC/CCVCC (geen CVC meer)', () => {
    expect(decodeSkillForWord('kast')).toBe('DE.CVCC');
    expect(decodeSkillForWord('stam')).toBe('DE.CCVC');
    expect(decodeSkillForWord('kras')).toBe('DE.CCVC');
    expect(decodeSkillForWord('start')).toBe('DE.CCVCC');
    expect(decodeSkillForWord('kraan')).toBe('DE.CCVC');
  });

  it('analyse/synthese: clusters naar CLUSTER, VC naar VC', () => {
    expect(segmentSkillForWord('as')).toBe('AN.VC');
    expect(segmentSkillForWord('kam')).toBe('AN.CVC');
    expect(segmentSkillForWord('kaas')).toBe('AN.CVC');
    expect(segmentSkillForWord('kast')).toBe('AN.CLUSTER');
    expect(segmentSkillForWord('start')).toBe('AN.CLUSTER');
    expect(blendSkillForWord('as')).toBe('SY.VC');
    expect(blendSkillForWord('kam')).toBe('SY.CVC');
    expect(blendSkillForWord('stam')).toBe('SY.CLUSTER');
  });

  it('dekt alle MVP-woorden zonder DE.CVC voor clusters', () => {
    for (const word of MVP_WORDS) {
      const skill = decodeSkillForWord(word.word);
      expect(skill.startsWith('DE.'), word.word).toBe(true);
      if (word.graphemes.length >= 4) {
        expect(skill, word.word).not.toBe('DE.CVC');
      }
    }
  });
});
