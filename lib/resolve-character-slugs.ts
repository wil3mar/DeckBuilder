interface CardInput {
  slug: string
  character_slug?: string | null
  [key: string]: unknown
}

type ResolvedCard = Omit<CardInput, 'character_slug'> & { character_id: string | null }

export interface ResolvedCards {
  resolved: ResolvedCard[]
  skipped: string[]
}

export function resolveCharacterSlugs(
  cards: CardInput[],
  charMap: Record<string, string>
): ResolvedCards {
  const resolved: ResolvedCard[] = []
  const skipped: string[] = []

  for (const { character_slug, ...rest } of cards) {
    if (!rest.slug || typeof rest.slug !== 'string') continue
    if (character_slug && !charMap[character_slug]) {
      skipped.push(rest.slug)
      continue
    }
    resolved.push({
      ...rest,
      character_id: character_slug ? (charMap[character_slug] ?? null) : null,
    })
  }

  return { resolved, skipped }
}
