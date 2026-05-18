import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Skeleton className="mb-4 h-3 w-32" />
      <Card>
        <CardContent className="p-8">
          <div className="mb-6 flex justify-between">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="size-7 rounded-full" />
            ))}
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
            <div className="mt-6 space-y-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 flex-1" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
