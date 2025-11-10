# terraform/aws/scripts/k3s-master-init.sh
#!/bin/bash
set -e

# 시스템 업데이트
apt-get update
apt-get upgrade -y

# K3s 설치 (Master)
curl -sfL https://get.k3s.io | sh -s - server \
  --write-kubeconfig-mode 644 \
  --disable traefik \
  --node-name k3s-master

# K3s 토큰 저장 (Worker 노드가 Join할 때 필요)
cat /var/lib/rancher/k3s/server/node-token > /tmp/node-token

# kubectl alias 설정
echo "alias k=kubectl" >> /home/ubuntu/.bashrc

# 완료 메시지
echo "K3s master installation completed!"