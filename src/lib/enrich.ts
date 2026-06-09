import type { EnrichedSchichtplan } from '@/types/enriched';
import type { Mitarbeitende, Schichtplan } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface SchichtplanMaps {
  mitarbeitendeMap: Map<string, Mitarbeitende>;
}

export function enrichSchichtplan(
  schichtplan: Schichtplan[],
  maps: SchichtplanMaps
): EnrichedSchichtplan[] {
  return schichtplan.map(r => ({
    ...r,
    mitarbeiter_fruehschichtName: resolveDisplay(r.fields.mitarbeiter_fruehschicht, maps.mitarbeitendeMap, 'vorname', 'nachname'),
    mitarbeiter_spaetschichtName: resolveDisplay(r.fields.mitarbeiter_spaetschicht, maps.mitarbeitendeMap, 'vorname', 'nachname'),
  }));
}
