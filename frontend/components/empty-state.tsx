"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  onAddCluster: () => void
}

export function EmptyState({ onAddCluster }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md">
        <CardContent className="pt-6 pb-6 text-center">
          <div className="mb-4 text-6xl">☁️</div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">No Clusters Registered</h2>
          <p className="text-muted-foreground mb-6">
            Get started by registering your first Kubernetes cluster to monitor its performance and health across cloud
            providers.
          </p>
          <Button onClick={onAddCluster} size="lg" className="bg-primary hover:bg-primary/90">
            + Add Your First Cluster
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
