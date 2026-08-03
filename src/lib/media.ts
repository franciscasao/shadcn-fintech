// ---------------------------------------------------------------------------
// Small path-building helpers shared between the static seed data
// (src/data/seed.ts) and the SQLite-backed query/seed layer
// (src/server/db, src/server/queries). Kept dependency-free so either side
// can import them without pulling in the database client.
// ---------------------------------------------------------------------------

/** Local avatar image for a given avatar id, e.g. avatar(1) -> "/avatars/1.jpg" */
export const avatar = (id: number) => `/avatars/${id}.jpg`

/** Local company/brand logo for a domain, e.g. logo("stripe.com") -> "/logos/stripe-com.png" */
export const logo = (domain: string) => `/logos/${domain.replace(/\./g, "-")}.png`
