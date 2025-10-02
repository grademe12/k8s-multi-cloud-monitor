import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as k8s from '@kubernetes/client-node';

@Injectable()
export class K8sService {
  private kubeConfig: k8s.KubeConfig;

  constructor(private configService: ConfigService) {
    this.initializeCluster();
  }

  private initializeCluster() {
    this.kubeConfig = new k8s.KubeConfig();
    
    this.kubeConfig.loadFromOptions({
      clusters: [{
        name: 'raspberry',
        server: this.configService.get('RASPBERRY_K8S_HOST'),
        skipTLSVerify: this.configService.get('RASPBERRY_K8S_SKIP_TLS') === 'true',
      }],
      users: [{
        name: 'monitor-sa',
        token: this.configService.get('RASPBERRY_K8S_TOKEN'),
      }],
      contexts: [{
        name: 'raspberry-context',
        cluster: 'raspberry',
        user: 'monitor-sa',
      }],
      currentContext: 'raspberry-context',
    });
  }

  async getNodes() {
    try {
      const k8sApi = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
      const response = await k8sApi.listNode();
      
      // response가 바로 V1NodeList 타입
      return response.items.map(node => ({
        name: node.metadata?.name,
        status: node.status?.conditions?.find(c => c.type === 'Ready')?.status,
        capacity: {
          cpu: node.status?.capacity?.cpu,
          memory: node.status?.capacity?.memory,
        },
      }));
    } catch (error) {
      throw new Error(`Failed to get nodes: ${error.message}`);
    }
  }

  async getPods(namespace = 'default') {
    try {
      const k8sApi = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
      
      const response = await k8sApi.listNamespacedPod({
        namespace: namespace,
      });
      
      // response가 바로 V1PodList 타입
      return response.items.map(pod => ({
        name: pod.metadata?.name,
        namespace: pod.metadata?.namespace,
        status: pod.status?.phase,
        nodeName: pod.spec?.nodeName,
      }));
    } catch (error) {
      throw new Error(`Failed to get pods: ${error.message}`);
    }
  }
}