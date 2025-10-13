"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { CloudProviderSelector } from "@/components/cloud-provider-selector"
import { StatSelector } from "@/components/stat-selector"
import { MetricCard } from "@/components/metric-card"
import { ChartCard } from "@/components/chart-card"
import { EmptyState } from "@/components/empty-state"
import { AddClusterDialog, type ClusterConfig } from "@/components/add-cluster-dialog"
import { useRouter } from "next/navigation"
import { Trash2, LogOut } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function Dashboard() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name: string } | null>(null)
  
  // Data states
  const [selectedCluster, setSelectedCluster] = useState("all")
  const [selectedStats, setSelectedStats] = useState<string[]>(["cpu", "memory", "pods", "nodes"])
  const [timeRange, setTimeRange] = useState("12h")
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [clusters, setClusters] = useState<ClusterConfig[]>([])
  const [isAddClusterOpen, setIsAddClusterOpen] = useState(false)

  // Check authentication and fetch user info
  useEffect(() => {
    const token = localStorage.getItem('token')
    
    if (!token) {
      router.push('/login')
      setIsAuthenticated(false)
      return
    }

    // 서버에서 사용자 정보 가져오기
    const fetchUserInfo = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const userData = await response.json()
          setCurrentUser(userData)
          setIsAuthenticated(true)
        } else if (response.status === 401) {
          // 토큰이 유효하지 않음
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          router.push('/login')
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error('사용자 정보 조회 실패:', error)
        router.push('/login')
        setIsAuthenticated(false)
      }
    }

    fetchUserInfo()
  }, [router])

  // Fetch clusters
  useEffect(() => {
    if (!isAuthenticated) return

    const fetchClusters = async () => {
      try {
        const token = localStorage.getItem('token')
        
        if (!token) {
          setIsLoading(false)
          return
        }

        const response = await fetch(`${API_URL}/clusters`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        
        if (response.ok) {
          const fetchedClusters = await response.json()
          setClusters(fetchedClusters)
        } else if (response.status === 401) {
          router.push('/login')
        }
      } catch (error) {
        console.error('클러스터 목록 조회 실패:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchClusters()
  }, [isAuthenticated, router])

  // Fetch metrics data
  useEffect(() => {
    if (!isAuthenticated || clusters.length === 0) {
      setIsLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        setIsLoading(true)
        const token = localStorage.getItem('token')
        
        const response = await fetch(
          `${API_URL}/k8s/stats?clusterId=${selectedCluster}&stats=${selectedStats.join(",")}&timeRange=${timeRange}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        )
        
        if (!response.ok) throw new Error(`API Error: ${response.status}`)
        const result = await response.json()
        setData(result)
        setError(null)
      } catch (err) {
        console.error('API Error:', err)
        setError(err as Error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [selectedCluster, selectedStats, timeRange, clusters, isAuthenticated])

  // Handle cluster addition
  const handleAddCluster = async (cluster: ClusterConfig) => {
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_URL}/clusters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: cluster.name,
          provider: cluster.provider,
          apiEndpoint: cluster.apiEndpoint,
          region: cluster.region,
          version: cluster.version,
          token: cluster.token,
        }),
      })

      if (response.ok) {
        const newCluster = await response.json()
        setClusters([...clusters, newCluster])
        alert('클러스터가 성공적으로 등록되었습니다!')
      } else {
        const error = await response.json()
        alert(`클러스터 등록 실패: ${error.message || '알 수 없는 오류'}`)
      }
    } catch (error) {
      console.error('클러스터 등록 오류:', error)
      alert('클러스터 등록 중 오류가 발생했습니다.')
    }
  }

  // Handle cluster deletion
  const handleDeleteCluster = async (clusterId: string) => {
    if (!confirm('정말로 이 클러스터를 삭제하시겠습니까?\n지금까지 저장된 메트릭 데이터도 함께 삭제됩니다.')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/clusters/${clusterId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setClusters(clusters.filter(c => c.id !== clusterId))
        if (selectedCluster === clusterId) {
          setSelectedCluster('all')
        }
        alert('클러스터가 삭제되었습니다.')
      } else {
        alert('클러스터 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('클러스터 삭제 중 오류가 발생했습니다.')
    }
  }

  // Handle logout
  const handleLogout = async () => {
    if (!confirm('로그아웃 하시겠습니까?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      
      // 백엔드에 로그아웃 알림 (로그 기록용 - 선택적)
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
    } catch (error) {
      console.error('로그아웃 API 호출 실패:', error)
      // API 실패해도 로컬 토큰은 삭제
    } finally {
      // 로컬 스토리지에서 토큰 삭제
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    }
  }

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    )
  }

  // Redirect state
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">로그인 페이지로 이동 중...</div>
      </div>
    )
  }

  // Empty state
  if (clusters.length === 0 && !isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Multi-Cloud K8s Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Monitor your Kubernetes clusters across cloud providers
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <div className="font-medium">{currentUser?.name}</div>
                  <div className="text-muted-foreground text-xs">{currentUser?.email}</div>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  로그아웃
                </Button>
              </div>
            </div>
          </div>
        </header>
        <EmptyState onAddCluster={() => setIsAddClusterOpen(true)} />
        <AddClusterDialog 
          open={isAddClusterOpen} 
          onOpenChange={setIsAddClusterOpen} 
          onAddCluster={handleAddCluster} 
        />
      </div>
    )
  }

  // Main dashboard
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Multi-Cloud K8s Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Monitor your Kubernetes clusters across cloud providers
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <div className="font-medium">{currentUser?.name}</div>
                <div className="text-muted-foreground text-xs">{currentUser?.email}</div>
              </div>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last 1 hour</SelectItem>
                  <SelectItem value="6h">Last 6 hours</SelectItem>
                  <SelectItem value="12h">Last 12 hours</SelectItem>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6">
        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex items-center gap-2">
            <CloudProviderSelector
              selected={selectedCluster}
              onSelect={setSelectedCluster}
              clusters={clusters} 
            />
            <Button
              onClick={() => setIsAddClusterOpen(true)}
              size="icon"
              variant="outline"
              className="h-10 w-10 shrink-0"
              title="Add new cluster"
            >
              <span className="text-lg">+</span>
            </Button>
          </div>
          <StatSelector selected={selectedStats} onSelect={setSelectedStats} />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading cluster statistics...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">Failed to load statistics. Please try again.</p>
            </CardContent>
          </Card>
        )}

        {/* Dashboard Content */}
        {data && !isLoading && (
          <div className="space-y-6">
            {/* Overview Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {selectedStats.includes("cpu") && data.metrics.cpu && (
                <MetricCard
                  title="CPU Usage"
                  value={data.metrics.cpu.current}
                  unit="%"
                  trend={data.metrics.cpu.trend}
                  status={data.metrics.cpu.status}
                />
              )}
              {selectedStats.includes("memory") && data.metrics.memory && (
                <MetricCard
                  title="Memory Usage"
                  value={data.metrics.memory.current}
                  unit="%"
                  trend={data.metrics.memory.trend}
                  status={data.metrics.memory.status}
                />
              )}
              {selectedStats.includes("pods") && data.metrics.pods && (
                <MetricCard
                  title="Running Pods"
                  value={data.metrics.pods.current}
                  unit=""
                  trend={data.metrics.pods.trend}
                  status={data.metrics.pods.status}
                />
              )}
              {selectedStats.includes("nodes") && data.metrics.nodes && (
                <MetricCard
                  title="Active Nodes"
                  value={data.metrics.nodes.current}
                  unit=""
                  trend={data.metrics.nodes.trend}
                  status={data.metrics.nodes.status}
                />
              )}
              {selectedStats.includes("requests") && data.metrics.requests && (
                <MetricCard
                  title="API Requests"
                  value={data.metrics.requests.current}
                  unit="/min"
                  trend={data.metrics.requests.trend}
                  status={data.metrics.requests.status}
                />
              )}
              {selectedStats.includes("errors") && data.metrics.errors && (
                <MetricCard
                  title="Pod Error Rate"
                  value={data.metrics.errors.current}
                  unit="%"
                  trend={data.metrics.errors.trend}
                  status={data.metrics.errors.status}
                />
              )}
              {selectedStats.includes("storage") && data.metrics.storage && (
                <MetricCard
                  title="Storage Usage"
                  value={data.metrics.storage.current}
                  unit="%"
                  trend={data.metrics.storage.trend}
                  status={data.metrics.storage.status}
                />
              )}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {selectedStats.includes("cpu") && data.charts.cpu && (
                <ChartCard title="CPU Usage Over Time" data={data.charts.cpu} timeRange={timeRange} />
              )}
              {selectedStats.includes("memory") && data.charts.memory && (
                <ChartCard title="Memory Usage Over Time" data={data.charts.memory} timeRange={timeRange} />
              )}
              {selectedStats.includes("pods") && data.charts.pods && (
                <ChartCard title="Pod Count Over Time" data={data.charts.pods} timeRange={timeRange} />
              )}
              {selectedStats.includes("nodes") && data.charts.nodes && (
                <ChartCard title="Node Count Over Time" data={data.charts.nodes} timeRange={timeRange} />
              )}
              {selectedStats.includes("storage") && data.charts.storage && (
                <ChartCard title="Storage Usage Over Time" data={data.charts.storage} timeRange={timeRange} />
              )}
              {selectedStats.includes("requests") && data.charts.requests && (
                <ChartCard title="API Requests Over Time" data={data.charts.requests} timeRange={timeRange} />
              )}
              {selectedStats.includes("errors") && data.charts.errors && (
                <ChartCard title="Error Rate Over Time" data={data.charts.errors} timeRange={timeRange} />
              )}
            </div>

            {/* Clusters Info */}
            {data.clusters && data.clusters.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Registered Clusters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.clusters.map((cluster: any) => (
                      <div key={cluster.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{cluster.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {cluster.provider} • {cluster.nodes} nodes • {cluster.pods} pods
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCluster(cluster.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <AddClusterDialog 
        open={isAddClusterOpen} 
        onOpenChange={setIsAddClusterOpen} 
        onAddCluster={handleAddCluster} 
      />
    </div>
  )
}