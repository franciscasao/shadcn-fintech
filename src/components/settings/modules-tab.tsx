"use client"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useDisabledModules } from "@/hooks/use-disabled-modules"
import { OPTIONAL_MODULES } from "@/lib/modules"

export function ModulesTab() {
  const { isEnabled, setDisabled } = useDisabledModules()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modules</CardTitle>
        <CardDescription>
          Turn off features you don&apos;t use to declutter the sidebar and
          command menu. Core pages like Accounts and Transactions always stay
          on.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {OPTIONAL_MODULES.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between rounded-lg px-1 py-3"
          >
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{m.label}</p>
              <p className="text-sm text-muted-foreground">{m.description}</p>
            </div>
            <Switch
              checked={isEnabled(m.id)}
              onCheckedChange={(checked) => setDisabled(m.id, !checked)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
