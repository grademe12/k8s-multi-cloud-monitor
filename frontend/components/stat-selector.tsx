"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface StatSelectorProps {
  selected: string[]
  onSelect: (stats: string[]) => void
}

const availableStats = [
  { id: "cpu", name: "CPU Usage" },
  { id: "memory", name: "Memory Usage" },
  { id: "pods", name: "Pod Count" },
  { id: "nodes", name: "Node Count" },
  { id: "network", name: "Network Traffic" },
  { id: "storage", name: "Storage Usage" },
  { id: "requests", name: "API Requests" },
  { id: "errors", name: "Error Rate" },
]

export function StatSelector({ selected, onSelect }: StatSelectorProps) {
  const toggleStat = (statId: string) => {
    if (selected.includes(statId)) {
      onSelect(selected.filter((s) => s !== statId))
    } else {
      onSelect([...selected, statId])
    }
  }

  return (
    <div className="flex items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <span className="text-base">⚙</span>
            Select Metrics
            <Badge variant="secondary" className="ml-1">
              {selected.length}
            </Badge>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Available Metrics</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {availableStats.map((stat) => (
            <DropdownMenuCheckboxItem
              key={stat.id}
              checked={selected.includes(stat.id)}
              onCheckedChange={() => toggleStat(stat.id)}
            >
              {stat.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
