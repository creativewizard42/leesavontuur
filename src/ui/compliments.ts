/** Session-local rotation: specific praise alternates with general encouragement.
 * Never say "read well" for an auditory or comprehension-only exercise.
 */
export function createComplimentPicker(): (specific: string) => string {
  const general = ['fb.correct.2', 'fb.correct.8', 'fb.correct.9', 'fb.correct.10', 'fb.correct.11', 'fb.correct.12'];
  let count = 0;
  let previous = '';
  return specific => {
    let key = count % 2 === 0 ? specific : general[Math.floor(count / 2) % general.length]!;
    if (key === previous) key = general[(Math.floor(count / 2) + 1) % general.length]!;
    count += 1;
    previous = key;
    return key;
  };
}
