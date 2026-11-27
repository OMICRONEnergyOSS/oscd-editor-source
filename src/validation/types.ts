export interface FindingLocation {
  line: number;
  column?: number;
}

export interface Finding {
  validatorId: string;
  severity: 'error' | 'warning';
  message: string;
  /** Position reported by the validator; not guaranteed to point at the cause. */
  location?: FindingLocation;
  /** Original diagnostic, kept for later enrichment and debugging. */
  raw?: unknown;
}

/** A run that could not complete is `failed`; it says nothing about the document. */
export type ValidationOutcome =
  | { status: 'completed'; findings: Finding[] }
  | { status: 'failed'; reason: string };
