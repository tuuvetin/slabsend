/**
 * Parses a free-text search query and extracts:
 * - tab:        'rent' or 'sell'
 * - category:   matched Gear / Shoes / Clothing / Wall equipment
 * - subcategory: matched subcategory
 * - cleanQuery: original query minus navigation words (rent, a, the…)
 *               and the matched category keyword so the remaining
 *               term can be used as a brand/model search
 */
export function parseSearchIntent(raw: string) {
  const q = raw.toLowerCase()

  // ── Tab intent ──────────────────────────────────────────────────────────────
  const wantsRent = /\brent(al)?\b|\bvuokra|\blainaa/.test(q)

  // ── Category / subcategory rules (most-specific first) ─────────────────────
  const rules: Array<{ pattern: RegExp; category: string; subcategory?: string; strip?: RegExp }> = [
    { pattern: /crash\s?pad/,         category: 'Gear',           subcategory: 'Crash pads',           strip: /crash\s?pad/gi },
    { pattern: /climbing shoe|rock shoe/, category: 'Shoes',      subcategory: 'Climbing shoes',        strip: /climbing shoe|rock shoe/gi },
    { pattern: /approach shoe/,        category: 'Shoes',          subcategory: 'Approach shoes',        strip: /approach shoe/gi },
    { pattern: /mountain boot/,        category: 'Shoes',          subcategory: 'Mountain boots',        strip: /mountain boot/gi },
    { pattern: /\bshoe|\bkenkä/,       category: 'Shoes' },
    { pattern: /\bharness|\bvaljaat/,  category: 'Gear',           subcategory: 'Harnesses',            strip: /harness|valjaat/gi },
    { pattern: /\brope\b|\bköysi/,     category: 'Gear',           subcategory: 'Ropes',                strip: /\brope\b|köysi/gi },
    { pattern: /\bhelmet|\bkypärä/,    category: 'Gear',           subcategory: 'Helmets',              strip: /helmet|kypärä/gi },
    { pattern: /chalk bag|chalk brush|magnesium/, category: 'Gear', subcategory: 'Chalk bags & brushes', strip: /chalk bag|chalk brush|magnesium/gi },
    { pattern: /hangboard|campus board|training board/, category: 'Gear', subcategory: 'Training equipment', strip: /hangboard|campus board|training board/gi },
    { pattern: /\bjacket|\btakki/,     category: 'Clothing',       subcategory: 'Jackets',              strip: /jacket|takki/gi },
    { pattern: /\bhoodie|\bhuppari/,   category: 'Clothing',       subcategory: 'Hoodies',              strip: /hoodie|huppari/gi },
    { pattern: /\bt-shirt|\btshirt/,   category: 'Clothing',       subcategory: 'T-Shirts',             strip: /t-shirt|tshirt/gi },
    { pattern: /climbing hold/,        category: 'Wall equipment', subcategory: 'Climbing holds',       strip: /climbing hold/gi },
    { pattern: /safety mat/,           category: 'Wall equipment', subcategory: 'Safety mats',          strip: /safety mat/gi },
  ]

  let category = ''
  let subcategory = ''
  let stripPattern: RegExp | undefined

  for (const rule of rules) {
    if (rule.pattern.test(q)) {
      category = rule.category
      subcategory = rule.subcategory || ''
      stripPattern = rule.strip
      break
    }
  }

  // ── Clean query ─────────────────────────────────────────────────────────────
  let clean = raw
  if (wantsRent)   clean = clean.replace(/\brent(al)?\b/gi, '').replace(/\bvuokra\w*/gi, '').replace(/\blainaa\w*/gi, '')
  if (stripPattern) clean = clean.replace(stripPattern, '')
  clean = clean.replace(/\b(a|an|the)\b/gi, '').replace(/\s+/g, ' ').trim()

  return { tab: wantsRent ? 'rent' : 'sell', category, subcategory, cleanQuery: clean }
}
