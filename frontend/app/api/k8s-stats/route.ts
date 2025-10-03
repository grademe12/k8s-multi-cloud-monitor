import { type NextRequest, NextResponse } from "next/server"

// Mock data generator for demonstration
function generateMockData(provider: string, stats: string[], timeRange: string) {
  const dataPoints = timeRange === "1h" ? 12 : timeRange === "6h" ? 24 : 48

  const generateTimeSeries = (base: number, variance: number) => {
    return Array.from({ length: dataPoints }, (_, i) => ({
      time: `${i}h`,
      value: base + Math.random() * variance - variance / 2,
    }))
  }

  return {
    metrics: {
      cpu: {
        current: 65.4 + Math.random() * 10,
        trend: Math.random() * 10 - 5,
        status: "healthy" as const,
      },
      memory: {
        current: 72.8 + Math.random() * 10,
        trend: Math.random() * 10 - 5,
        status: "warning" as const,
      },
      pods: {
        current: Math.floor(145 + Math.random() * 20),
        trend: Math.random() * 10 - 5,
        status: "healthy" as const,
      },
      nodes: {
        current: Math.floor(8 + Math.random() * 4),
        trend: 0,
        status: "healthy" as const,
      },
      requests: {
        current: Math.floor(15000 + Math.random() * 5000),
        trend: Math.random() * 10 - 5,
        status: "healthy" as const,
      },
      errors: {
        current: 0.5 + Math.random() * 1.5,
        trend: Math.random() * 10 - 5,
        status: "healthy" as const,
      },
    },
    charts: {
      cpu: generateTimeSeries(65, 20),
      memory: generateTimeSeries(70, 15),
      network: generateTimeSeries(500, 200),
      storage: generateTimeSeries(80, 10),
      requests: generateTimeSeries(15000, 5000),
      errors: generateTimeSeries(0.8, 0.5),
    },
    clusters: [
      {
        id: "1",
        name: "naver-prod-cluster",
        provider: "Naver Cloud K8s",
        status: "healthy",
        nodes: 12,
        pods: 156,
        version: "v1.28.3",
      },
      {
        id: "2",
        name: "aws-eks-prod",
        provider: "AWS EKS",
        status: "healthy",
        nodes: 8,
        pods: 98,
        version: "v1.29.0",
      },
      {
        id: "3",
        name: "gcp-gke-staging",
        provider: "GCP GKE",
        status: "healthy",
        nodes: 6,
        pods: 72,
        version: "v1.28.5",
      },
    ].filter((cluster) => provider === "all" || cluster.provider.toLowerCase().includes(provider)),
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const provider = searchParams.get("provider") || "all"
  const stats = searchParams.get("stats")?.split(",") || ["cpu", "memory"]
  const timeRange = searchParams.get("timeRange") || "12h"

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  // In a real implementation, you would:
  // 1. Fetch data from Naver Cloud K8s API
  // 2. Fetch data from AWS EKS API
  // 3. Fetch data from other cloud providers
  // 4. Aggregate and normalize the data
  // 5. Return the combined results

  const data = generateMockData(provider, stats, timeRange)

  return NextResponse.json(data)
}
