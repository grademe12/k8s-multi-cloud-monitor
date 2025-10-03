import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface MetricCardProps {
  title: string
  value: number
  unit: string
  trend: number
  status: "healthy" | "warning" | "critical"
}

export function MetricCard({ title, value, unit, trend, status }: MetricCardProps) {
  const statusColors = {
    healthy: "text-chart-2",
    warning: "text-chart-3",
    critical: "text-destructive",
  }

  const trendSymbol = trend > 0 ? "↑" : trend < 0 ? "↓" : "−"

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-semibold ${statusColors[status]}`}>{value.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">{unit}</span>
          </div>
          <div
            className={`flex items-center gap-1 text-sm ${trend > 0 ? "text-chart-2" : trend < 0 ? "text-destructive" : "text-muted-foreground"}`}
          >
            <span className="text-base">{trendSymbol}</span>
            <span>{Math.abs(trend).toFixed(1)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
