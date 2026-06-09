// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Schichtplan {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    datum?: string; // Format: YYYY-MM-DD oder ISO String
    mitarbeiter_fruehschicht?: string; // applookup -> URL zu 'Mitarbeitende' Record
    mitarbeiter_spaetschicht?: string; // applookup -> URL zu 'Mitarbeitende' Record
    notiz?: string;
  };
}

export interface Mitarbeitende {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    bemerkung?: string;
  };
}

export const APP_IDS = {
  SCHICHTPLAN: '6a26d437aa06a821653cb480',
  MITARBEITENDE: '6a26d4338b9ba3ce84ee6789',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'schichtplan': {
    'datum': 'date/date',
    'mitarbeiter_fruehschicht': 'applookup/select',
    'mitarbeiter_spaetschicht': 'applookup/select',
    'notiz': 'string/textarea',
  },
  'mitarbeitende': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'bemerkung': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateSchichtplan = StripLookup<Schichtplan['fields']>;
export type CreateMitarbeitende = StripLookup<Mitarbeitende['fields']>;