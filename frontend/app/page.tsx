"use client"

import { useEffect, useState } from "react"
import { MetricCard } from "@/components/metric-card"
import { ChartCard } from "@/components/chart-card"
import { ClusterCard } from "@/components/cluster-card"
import { CloudProviderSelector } from "@/components/cloud-provider-selector"
import { StatsToggle } from "@/components/stats-toggle"
import { AddClusterDialog } from "@/components/add-cluster-dialog"
import { EmptyState } from "@/components/empty-state"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

// Types
interface Cluster {
  id: string
  name: string
  provider: string
  apiEndpoint: string
  region: string
  version?: string
  status?: 'healthy' | 'warning' | 'critical'
  nodes?: number
  pods?: number
}

interface ClusterConfig {
  name: string
  provider: string
  apiEndpoint: string
  region: string
  version: string
  token: string
}

interface MetricDto {
  current: number
  trend: number
  status: 'healthy' | 'warning' | 'critical'
}

interface K8sStatsResponse {
  metrics: {
    cpu?: MetricDto
    memory?: MetricDto
    pods?: MetricDto
    nodes?: MetricDto
    storage?: MetricDto
    network?: MetricDto
    requests?: MetricDto
    errors?: MetricDto
  }
  charts: {
    cpu?: Array<{ time: string; value: number }>
    memory?: Array<{ time: string; value: number }>
    pods?: Array<{ time: string; value: number }>
    nodes?: Array<{ time: string; value: number }>
    storage?: Array<{ time: string; value: number }>
    network?: Array<{ time: string; value: number }>
    requests?: Array<{ time: string; value: number }>
    errors?: Array<{ time: string; value: number }>
  }
  clusters: Array<{
    id: string
    name: string
    provider: string
    status: 'healthy' | 'warning' | 'critical'
    nodes: number
    pods: number
    version: string
  }>
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function Home() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const router = useRouter()
  
  // Data states
  const [data, setData] = useState<K8sStatsResponse | null>(null)
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  // UI states
  const [selectedCluster, setSelectedCluster] = useState("all")
  const [selectedStats, setSelectedStats] = useState(["cpu", "memory", "pods", "nodes"])
  const [timeRange, setTimeRange] = useState("12h")
  const [isAddClusterOpen, setIsAddClusterOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token')
      if (!token) {
        setIsAuthenticated(false)
        router.push('/login')
      } else {
        setIsAuthenticated(true)
      }
    }
    checkAuth()
  }, [router])

  // Fetch clusters on authentication
  useEffect(() => {
    if (!isAuthenticated) return

    const fetchClusters = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${API_URL}/clusters`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        
        if (response.ok) {
          const fetchedClusters = await response.json()
          setClusters(fetchedClusters)
        } else if (response.status === 401) {
          setIsAuthenticated(false)
          router.push('/login')
        }
      } catch (error) {
        console.error('클러스터 목록 조회 실패:', error)
      }
    }
    
    fetchClusters()
  }, [isAuthenticated, router])

  // Fetch metrics data
  useEffect(() => {
    if (!isAuthenticated || clusters.length === 0) return

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
    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [selectedCluster, selectedStats, timeRange, clusters, isAuthenticated])

  // Handle cluster addition
  const handleAddCluster = async (cluster: ClusterConfig) => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        alert('로그인이 필요합니다.')
        router.push('/login')
        return
      }

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
        setIsAddClusterOpen(false)
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
    if (!confirm('정말로 이 클러스터를 삭제하시겠습니까?')) {
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
        const updatedClusters = clusters.filter(c => c.id !== clusterId)
        setClusters(updatedClusters)
        
        // If deleted cluster was selected, switch to 'all'
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

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const token = localStorage.getItem('token')
      
      // Refresh clusters
      const clustersResponse = await fetch(`${API_URL}/clusters`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (clustersResponse.ok) {
        const fetchedClusters = await clustersResponse.json()
        setClusters(fetchedClusters)
      }
      
      // Refresh stats
      const statsResponse = await fetch(
        `${API_URL}/k8s/stats?clusterId=${selectedCluster}&stats=${selectedStats.join(",")}&timeRange=${timeRange}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      )
      if (statsResponse.ok) {
        const result = await statsResponse.json()
        setData(result)
      }
    } catch (error) {
      console.error('Refresh error:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect state
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // Empty state - no clusters
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
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
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
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
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
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Cluster Selector */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Select Cluster</h2>
            <Button onClick={() => setIsAddClusterOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Cluster
            </Button>
          </div>
          <CloudProviderSelector 
            selected={selectedCluster} 
            onSelect={setSelectedCluster} 
            clusters={clusters}
            onDeleteCluster={handleDeleteCluster}
          />
          {selectedCluster !== 'all' && (
            <div className="text-sm text-muted-foreground mt-2">
              Viewing: {clusters.find(c => c.id === selectedCluster)?.name || 'All Clusters'}
            </div>
          )}
        </div>

        {/* Stats Toggle */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Metrics</h2>
          <StatsToggle selected={selectedStats} onToggle={setSelectedStats} />
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            <p className="font-semibold">Error loading data</p>
            <p className="text-sm">{error.message}</p>
          </div>
        )}

        {/* Loading State for Metrics */}
        {isLoading && !data && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading metrics...</p>
          </div>
        )}

        {/* Metrics Grid */}
        {data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
              {selectedStats.includes("network") && data.metrics.network && (
                <MetricCard
                  title="Network Traffic"
                  value={data.metrics.network.current}
                  unit="Mbps"
                  trend={data.metrics.network.trend}
                  status={data.metrics.network.status}
                />
              )}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              {selectedStats.includes("cpu") && data.charts.cpu && (
                <ChartCard 
                  title="CPU Usage Over Time" 
                  data={data.charts.cpu} 
                  timeRange={timeRange} 
                />
              )}
              {selectedStats.includes("memory") && data.charts.memory && (
                <ChartCard 
                  title="Memory Usage Over Time" 
                  data={data.charts.memory} 
                  timeRange={timeRange} 
                />
              )}
              {selectedStats.includes("pods") && data.charts.pods && (
                <ChartCard 
                  title="Pod Count Over Time" 
                  data={data.charts.pods} 
                  timeRange={timeRange} 
                />
              )}
              {selectedStats.includes("nodes") && data.charts.nodes && (
                <ChartCard 
                  title="Node Count Over Time" 
                  data={data.charts.nodes} 
                  timeRange={timeRange} 
                />
              )}
              {selectedStats.includes("storage") && data.charts.storage && (
                <ChartCard 
                  title="Storage Usage Over Time" 
                  data={data.charts.storage} 
                  timeRange={timeRange} 
                />
              )}
              {selectedStats.includes("network") && data.charts.network && (
                <ChartCard 
                  title="Network Traffic Over Time" 
                  data={data.charts.network} 
                  timeRange={timeRange} 
                />
              )}
              {selectedStats.includes("requests") && data.charts.requests && (
                <ChartCard 
                  title="API Requests Over Time" 
                  data={data.charts.requests} 
                  timeRange={timeRange} 
                />
              )}
              {selectedStats.includes("errors") && data.charts.errors && (
                <ChartCard 
                  title="Error Rate Over Time" 
                  data={data.charts.errors} 
                  timeRange={timeRange} 
                />
              )}
            </div>

            {/* Cluster Cards */}
            {data.clusters && data.clusters.length > 0 && (
              <>
                <h2 className="text-lg font-semibold mb-4">Cluster Status</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.clusters.map((cluster) => (
                    <ClusterCard
                      key={cluster.id}
                      id={cluster.id}
                      name={cluster.name}
                      provider={cluster.provider}
                      status={cluster.status}
                      nodes={cluster.nodes}
                      pods={cluster.pods}
                      version={cluster.version}
                      onDelete={handleDeleteCluster}
                      onSelect={() => setSelectedCluster(cluster.id)}
                      isSelected={selectedCluster === cluster.id}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Add Cluster Dialog */}
      <AddClusterDialog 
        open={isAddClusterOpen} 
        onOpenChange={setIsAddClusterOpen} 
        onAddCluster={handleAddCluster} 
      />
    </div>
  )
}