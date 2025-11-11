# terraform/aws/scripts/postgres-init.sh
#!/bin/bash
set -e

DB_NAME="${db_name}"
DB_USER="${db_user}"
DB_PASSWORD="${db_password}"

# PostgreSQL 설치
apt-get update
apt-get install -y postgresql postgresql-contrib

# 버전 자동 감지
PG_VERSION=$(ls /etc/postgresql/ | head -n 1)

# 외부 접근 허용 설정
echo "listen_addresses = '*'" >> /etc/postgresql/$PG_VERSION/main/postgresql.conf
echo "host all all 10.1.0.0/16 md5" >> /etc/postgresql/$PG_VERSION/main/pg_hba.conf

# PostgreSQL 시작 및 활성화
systemctl enable postgresql
systemctl start postgresql

# DB 준비될 때까지 대기
sleep 10

# DB 생성
sudo -u postgres psql <<EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\c $DB_NAME
GRANT ALL ON SCHEMA public TO $DB_USER;
EOF

echo "PostgreSQL setup completed!"