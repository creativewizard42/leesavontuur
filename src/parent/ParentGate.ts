/**
 * Oudercheck (GD §9.1): 5 s ingedrukt houden + geschreven rekensom.
 * TODO(Builder): implementeer; fout -> terug naar spel zonder uitleg.
 */
export interface ParentGateOptions {
  onPass: () => void;
  onFail: () => void;
}

export function createParentGate(_options: ParentGateOptions): HTMLElement {
  throw new Error('TODO(Builder): ParentGate.create');
}
