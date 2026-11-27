export interface SclVersion {
  version: string;
  revision: string;
  release: string;
}

export type SchemaKey = '2003' | '2007B' | '2007B4';

const versionToSchema: Partial<Record<string, SchemaKey>> = {
  '': '2003',
  '2007': '2007B',
  '2007A': '2007B',
  '2007B': '2007B',
  '2007B1': '2007B',
  '2007B2': '2007B4',
  '2007B3': '2007B4',
  '2007B4': '2007B4',
};

// Anchored: only a prolog (declaration, comments, doctype) may precede the root.
const rootStartTag =
  /^\uFEFF?(?:\s|<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!DOCTYPE[^>]*>)*<SCL((?:\s+[^\s=>/]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*\/?>/;
const attribute = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

/** Reads the version attributes from the root start tag without parsing the document. */
export function sniffSclVersion(xml: string): SclVersion | null {
  const match = rootStartTag.exec(xml);
  if (match === null) {
    return null;
  }

  const attributes = new Map<string, string>();
  for (const [, name, double, single] of match[1].matchAll(attribute)) {
    attributes.set(name, double ?? single ?? '');
  }

  return {
    version: attributes.get('version') ?? '',
    revision: attributes.get('revision') ?? '',
    release: attributes.get('release') ?? '',
  };
}

export function getSchemaKey({
  version,
  revision,
  release,
}: SclVersion): SchemaKey | null {
  return versionToSchema[version + revision + release] ?? null;
}
