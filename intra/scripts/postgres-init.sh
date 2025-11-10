# terraform/aws/scripts/postgres-init.sh
#!/bin/bash
set -e

# PostgreSQL 설치
apt-get update
apt-get install -y postgresql postgresql-contrib

# 외부 접근 허용 설정
echo "listen_addresses = '*'" >> /etc/postgresql/14/main/postgresql.conf
echo "host all all 10.0.0.0/16 md5" >> /etc/postgresql/14/main/pg_hba.conf

# PostgreSQL 재시작
systemctl restart postgresql

# DB 생성
sudo -u postgres psql <<EOF
CREATE DATABASE k8s_dashboard;
CREATE USER woosupar WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE k8s_dashboard TO k8s_user;
EOF

echo "PostgreSQL installation completed!"