"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AddClusterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddCluster: (cluster: ClusterConfig) => void
}

export interface ClusterConfig {
  id: string
  name: string
  provider: string
  apiEndpoint: string
  region: string
  version: string
}

export function AddClusterDialog({ open, onOpenChange, onAddCluster }: AddClusterDialogProps) {
  const [formData, setFormData] = useState<Partial<ClusterConfig>>({
    provider: "naver",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name && formData.provider && formData.apiEndpoint && formData.region) {
      onAddCluster({
        id: Date.now().toString(),
        name: formData.name,
        provider: formData.provider,
        apiEndpoint: formData.apiEndpoint,
        region: formData.region,
        version: formData.version || "v1.28.0",
      })
      setFormData({ provider: "naver" })
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Register New Cluster</DialogTitle>
          <DialogDescription>Add a new Kubernetes cluster to monitor its performance and health.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Cluster Name</Label>
              <Input
                id="name"
                placeholder="my-production-cluster"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="provider">Cloud Provider</Label>
              <Select
                value={formData.provider}
                onValueChange={(value) => setFormData({ ...formData, provider: value })}
              >
                <SelectTrigger id="provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="naver">Naver Cloud K8s</SelectItem>
                  <SelectItem value="aws">AWS EKS</SelectItem>
                  <SelectItem value="gcp">GCP GKE</SelectItem>
                  <SelectItem value="azure">Azure AKS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="apiEndpoint">API Endpoint</Label>
              <Input
                id="apiEndpoint"
                placeholder="https://api.cluster.example.com"
                value={formData.apiEndpoint || ""}
                onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                placeholder="us-east-1"
                value={formData.region || ""}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="version">Kubernetes Version (Optional)</Label>
              <Input
                id="version"
                placeholder="v1.28.0"
                value={formData.version || ""}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Cluster</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
