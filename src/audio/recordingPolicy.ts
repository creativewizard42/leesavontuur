/** Teaching phonemes requires reviewed human speech, including embedded sounds. */
export function needsHumanRecording(key: string, kind: string): boolean {
  return kind === 'grapheme-sound' || kind === 'blend' ||
    /^(instr\.(fn\.|klankjager\.(first|last)|lk\.(sound_to_grapheme|intro)|letterklank\.r2)|fb\.specific\.(first_sound|last_sound|middle_sound|middle_consonant|letter_confusion|letter_sound|blend_retry))/.test(key);
}
