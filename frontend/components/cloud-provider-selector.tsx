// frontend/components/cloud-provider-selector.tsx

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

interface Cluster {
  id: string
  name: string
  provider: string
  apiEndpoint: string
  region: string
}

interface CloudProviderSelectorProps {
  selected: string
  onSelect: (provider: string) => void
  clusters: Cluster[]
}

export function CloudProviderSelector({ 
  selected, 
  onSelect, 
  clusters 
}: CloudProviderSelectorProps) {
  
  const getProviderIcon = (provider: string) => {
    switch(provider) {
      case 'kpaas': return '🇰🇷'
      case 'aws': return '☁️'
      case 'gcp': return '🔷'
      case 'azure': return '⚠️'
      case 'naver': return '🟢'
      default: return '📦'
    }
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {/* All Clusters */}
      <Card
        className={cn(
          "px-4 py-2 cursor-pointer transition-all",
          selected === "all" && "ring-2 ring-primary"
        )}
        onClick={() => onSelect("all")}
      >
        <div className="flex items-center gap-2">
          <span>🌍</span>
          <span className="font-medium">All Clusters</span>
          {clusters.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({clusters.length})
            </span>
          )}
        </div>
      </Card>

      {/* 각 클러스터 */}
      {clusters.map((cluster) => (
        <Card
          key={cluster.id}
          className={cn(
            "px-4 py-2 cursor-pointer transition-all",
            selected === cluster.id && "ring-2 ring-primary"
          )}
          onClick={() => onSelect(cluster.id)}
        >
          <div className="flex items-center gap-2">
            <span>{getProviderIcon(cluster.provider)}</span>
            <span className="font-medium">{cluster.name}</span>
          </div>
        </Card>
      ))}
    </div>
  )
}