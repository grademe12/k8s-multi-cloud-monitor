"use client"

import { Button } from "@/components/ui/button"

interface CloudProviderSelectorProps {
  selected: string
  onSelect: (provider: string) => void
}

const providers = [
  { id: "all", name: "All Providers", icon: "☁" },
  { id: "naver", name: "Naver Cloud", icon: "🖥" },
  { id: "aws", name: "AWS EKS", icon: "🖥" },
  { id: "gcp", name: "GCP GKE", icon: "🖥" },
  { id: "azure", name: "Azure AKS", icon: "🖥" },
]

export function CloudProviderSelector({ selected, onSelect }: CloudProviderSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {providers.map((provider) => {
        return (
          <Button
            key={provider.id}
            variant={selected === provider.id ? "default" : "outline"}
            size="sm"
            onClick={() => onSelect(provider.id)}
            className="gap-2"
          >
            <span className="text-base">{provider.icon}</span>
            {provider.name}
          </Button>
        )
      })}
    </div>
  )
}
