// frontend/components/add-cluster-dialog.tsx

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
  id?: string
  name: string
  provider: string
  apiEndpoint: string
  region: string
  version: string
  token: string  // 👈 token 필드 추가!
}

export function AddClusterDialog({ open, onOpenChange, onAddCluster }: AddClusterDialogProps) {
  const [formData, setFormData] = useState<Partial<ClusterConfig>>({
    provider: "raspberry",
    region: "local",
    version: "v1.28.3"
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name && formData.provider && formData.apiEndpoint && formData.region && formData.token) {
      onAddCluster({
        name: formData.name,
        provider: formData.provider,
        apiEndpoint: formData.apiEndpoint,
        region: formData.region,
        version: formData.version || "v1.28.0",
        token: formData.token,
      })
      // 폼 초기화
      setFormData({ 
        provider: "raspberry",
        region: "local",
        version: "v1.28.3"
      })
      onOpenChange(false)
    } else {
      alert('모든 필수 필드를 입력해주세요.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register New Cluster</DialogTitle>
          <DialogDescription>
            Add a new Kubernetes cluster to monitor its performance and health.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Cluster Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Cluster Name *</Label>
              <Input
                id="name"
                placeholder="my-k8s-cluster"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Cloud Provider */}
            <div className="grid gap-2">
              <Label htmlFor="provider">Cloud Provider *</Label>
              <Select
                value={formData.provider}
                onValueChange={(value) => setFormData({ ...formData, provider: value })}
              >
                <SelectTrigger id="provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="raspberry">Raspberry Pi K3s</SelectItem>
                  <SelectItem value="k-paas">K-PaaS</SelectItem>
                  <SelectItem value="naver">Naver Cloud Platform</SelectItem>
                  <SelectItem value="aws">AWS EKS</SelectItem>
                  <SelectItem value="gcp">GCP GKE</SelectItem>
                  <SelectItem value="azure">Azure AKS</SelectItem>
                  <SelectItem value="local">Local Cluster</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* API Endpoint */}
            <div className="grid gap-2">
              <Label htmlFor="apiEndpoint">API Endpoint *</Label>
              <Input
                id="apiEndpoint"
                placeholder="https://192.168.1.100:6443"
                value={formData.apiEndpoint || ""}
                onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                K8s API 서버 주소 (예: https://your-k8s-api:6443)
              </p>
            </div>

            {/* Token - Input으로 변경 */}
            <div className="grid gap-2">
              <Label htmlFor="token">Service Account Token *</Label>
              <Input
                id="token"
                type="password"
                placeholder="Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6..."
                value={formData.token || ""}
                onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                className="font-mono text-xs"
                required
              />
              <p className="text-xs text-muted-foreground">
                K8s Service Account 토큰 (Bearer 포함하여 입력)
              </p>
            </div>

            {/* Region */}
            <div className="grid gap-2">
              <Label htmlFor="region">Region *</Label>
              <Input
                id="region"
                placeholder="ap-northeast-2"
                value={formData.region || ""}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                required
              />
            </div>

            {/* Version (Optional) */}
            <div className="grid gap-2">
              <Label htmlFor="version">Kubernetes Version</Label>
              <Input
                id="version"
                placeholder="v1.28.3"
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