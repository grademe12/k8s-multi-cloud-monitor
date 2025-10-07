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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function Dashboard() {
  const [selectedProvider, setSelectedProvider] = useState("all")
  const [selectedStats, setSelectedStats] = useState<string[]>(["cpu", "memory", "pods", "nodes"])
  const [timeRange, setTimeRange] = useState("12h")
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [clusters, setClusters] = useState<ClusterConfig[]>([])
  const [isAddClusterOpen, setIsAddClusterOpen] = useState<boolean | null>(null)

  // 로그인 관련
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      setIsAuthenticated(false)
    } else {
      setIsAuthenticated(true)
    }
  }, [router])
  // 로그인 관련

  useEffect(() => {
    const savedClusters = localStorage.getItem("k8s-clusters")
    if (savedClusters) {
      setClusters(JSON.parse(savedClusters))
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (clusters.length > 0) {
      localStorage.setItem("k8s-clusters", JSON.stringify(clusters))
    }
  }, [clusters])

  useEffect(() => {
    // isAuthenticated가 false면 실행 안 함
    if (!isAuthenticated || clusters.length === 0) {
      setIsLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        setIsLoading(true)
        // Mock API 대신 실제 백엔드 호출
        const response = await fetch(
          `${API_URL}/k8s/stats?provider=${selectedProvider}&stats=${selectedStats.join(",")}&timeRange=${timeRange}`,
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
  }, [selectedProvider, selectedStats, timeRange, clusters])

  const handleAddCluster = (cluster: ClusterConfig) => {
    setClusters([...clusters, cluster])
  }

    if (isAuthenticated === null) {
    return <div>Loading...</div>
  }

  if (isAuthenticated === false) {
    return <div>Redirecting to login...</div>
  }

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
            </div>
          </div>
        </header>
        <EmptyState onAddCluster={() => setIsAddClusterOpen(true)} />
        <AddClusterDialog open={isAddClusterOpen} onOpenChange={setIsAddClusterOpen} onAddCluster={handleAddCluster} />
      </div>
    )
  }

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
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6">
        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex items-center gap-2">
            <CloudProviderSelector
              selected={selectedProvider}
              onSelect={setSelectedProvider}
              clusters={clusters} />
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
              {selectedStats.includes("cpu") && (
                <MetricCard
                  title="CPU Usage"
                  value={data.metrics.cpu.current}
                  unit="%"
                  trend={data.metrics.cpu.trend}
                  status={data.metrics.cpu.status}
                />
              )}
              {selectedStats.includes("memory") && (
                <MetricCard
                  title="Memory Usage"
                  value={data.metrics.memory.current}
                  unit="%"
                  trend={data.metrics.memory.trend}
                  status={data.metrics.memory.status}
                />
              )}
              {selectedStats.includes("pods") && (
                <MetricCard
                  title="Running Pods"
                  value={data.metrics.pods.current}
                  unit=""
                  trend={data.metrics.pods.trend}
                  status={data.metrics.pods.status}
                />
              )}
              {selectedStats.includes("nodes") && (
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
              {selectedStats.includes("cpu") && (
                <ChartCard title="CPU Usage Over Time" data={data.charts.cpu} timeRange={timeRange} />
              )}
              {selectedStats.includes("memory") && (
                <ChartCard title="Memory Usage Over Time" data={data.charts.memory} timeRange={timeRange} />
              )}
              {selectedStats.includes("network") && (
                <ChartCard title="Network Traffic" data={data.charts.network} timeRange={timeRange} />
              )}
              {selectedStats.includes("storage") && (
                <ChartCard title="Storage Usage" data={data.charts.storage} timeRange={timeRange} />
              )}
              {selectedStats.includes("requests") && (
                <ChartCard title="API Requests Over Time" data={data.charts.requests} timeRange={timeRange} />
              )}
              {selectedStats.includes("errors") && (
                <ChartCard title="Error Rate Over Time" data={data.charts.errors} timeRange={timeRange} />
              )}
            </div>

            {/* Cluster Details */}
            <Card>
              <CardHeader>
                <CardTitle>Cluster Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clusters.map((cluster) => (
                    <div
                      key={cluster.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-chart-2" />
                        <div>
                          <p className="font-medium text-foreground">{cluster.name}</p>
                          <p className="text-sm text-muted-foreground">{cluster.provider}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-muted-foreground">Region: </span>
                          <span className="text-foreground font-mono">{cluster.region}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Version: </span>
                          <span className="text-foreground font-mono">{cluster.version}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Endpoint: </span>
                          <span className="text-foreground font-mono text-xs">{cluster.apiEndpoint}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <AddClusterDialog open={isAddClusterOpen} onOpenChange={setIsAddClusterOpen} onAddCluster={handleAddCluster} />
    </div>
  )
}
