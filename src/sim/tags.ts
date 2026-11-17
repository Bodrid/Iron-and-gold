// Tags change when a nation is formed (Prussia → Germany); rivalries, companies and events keep recognising the old ones.
import type { Country } from './types';

export function hasTag(c: Country, tag: string): boolean { return c.tag === tag || !!c.formerTags?.includes(tag); }
/** Whether any tag in `tags` (e.g. a personality's rivals) names this country. */
export function anyTag(tags: readonly string[], c: Country): boolean { return tags.some(t => hasTag(c, t)); }
