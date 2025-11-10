# terraform/aws/scripts/k3s-worker-init.sh
#!/bin/bash
set -e

MASTER_IP="${master_ip}"

# 시스템 업데이트
apt-get update
apt-get upgrade -y

# Master 노드에서 토큰 가져오기 (실제로는 SSM Parameter Store나 Secrets Manager 사용 권장)
# 임시로 30초 대기 후 master에서 가져오기
sleep 30

# K3s 설치 (Worker)
curl -sfL https://get.k3s.io | K3S_URL=https://$MASTER_IP:6443 \
  K3S_TOKEN=$(ssh -o StrictHostKeyChecking=no ubuntu@$MASTER_IP cat /tmp/node-token) \
  sh -

echo "K3s worker installation completed!"