import type { Schichtplan } from './app';

export type EnrichedSchichtplan = Schichtplan & {
  mitarbeiter_fruehschichtName: string;
  mitarbeiter_spaetschichtName: string;
};
