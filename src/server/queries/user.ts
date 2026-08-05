import { eq } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { users } from "@/server/db/schema"

/** The single seeded demo user (see DEMO_USER_ID) — there's no auth in this app. */
export async function getCurrentUser() {
  const db = getDb()
  const user = db.select().from(users).where(eq(users.id, DEMO_USER_ID)).get()
  if (!user) throw new Error("Demo user not seeded — run `pnpm db:seed`")
  return user
}
