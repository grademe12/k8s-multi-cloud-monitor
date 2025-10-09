import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Cluster {
  id: string
  name: string
  provider: string
  apiEndpoint: string
  region: string
}

interface CloudProviderSelectorProps {
  selected: string
  onSelect: (clusterId: string) => void
  clusters: Cluster[]
  onDeleteCluster?: (clusterId: string) => void  // 삭제 기능 추가 (선택적)
}

export function CloudProviderSelector({ 
  selected, 
  onSelect, 
  clusters,
  onDeleteCluster 
}: CloudProviderSelectorProps) {
  
  const getProviderIcon = (provider: string) => {
    switch(provider.toLowerCase()) {
      case 'kpaas': return '🇰🇷'
      case 'k-paas': return '🇰🇷'
      case 'aws': return '☁️'
      case 'gcp': return '🔷'
      case 'azure': return '⚠️'
      case 'naver': return '🟢'
      case 'raspberry': return '🍓'
      case 'raspberry pi k3s': return '🍓'
      default: return '📦'
    }
  }

  const getClusterStats = (clusterId: string) => {
    // 여기서 해당 클러스터의 실시간 상태를 표시할 수 있음
    const cluster = clusters.find(c => c.id === clusterId)
    if (!cluster) return null
    
    // 나중에 실제 상태 데이터로 교체
    return {
      status: 'healthy' as const,
      color: 'text-green-500'
    }
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {/* All Clusters - 전체 보기 */}
      <Card
        className={cn(
          "px-4 py-2 cursor-pointer transition-all hover:shadow-md",
          selected === "all" && "ring-2 ring-primary bg-primary/5"
        )}
        onClick={() => onSelect("all")}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🌍</span>
          <div className="flex flex-col">
            <span className="font-medium">All Clusters</span>
            {clusters.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {clusters.length} cluster{clusters.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* 각 클러스터 카드 */}
      {clusters.map((cluster) => {
        const stats = getClusterStats(cluster.id)
        return (
          <Card
            key={cluster.id}
            className={cn(
              "px-4 py-2 cursor-pointer transition-all hover:shadow-md relative group",
              selected === cluster.id && "ring-2 ring-primary bg-primary/5"
            )}
            onClick={() => onSelect(cluster.id)}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{getProviderIcon(cluster.provider)}</span>
              <div className="flex flex-col">
                <span className="font-medium">{cluster.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {cluster.provider}
                  </span>
                  {stats && (
                    <span className={cn("text-xs", stats.color)}>
                      ● {stats.status}
                    </span>
                  )}
                </div>
              </div>
              
              {/* 삭제 버튼 (선택적) */}
              {onDeleteCluster && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()  // 카드 클릭 이벤트 방지
                    onDeleteCluster(cluster.id)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}