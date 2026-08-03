import { getMoneyMovement } from "@/server/queries/analytics"

export async function GET() {
  return Response.json(await getMoneyMovement())
}
