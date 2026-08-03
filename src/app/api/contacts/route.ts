import { getContacts } from "@/server/queries/contacts"

export async function GET() {
  const contacts = await getContacts()
  return Response.json(contacts)
}
