resource "aws_instance" "bastion" {
  ami                    = "ami-040c33c6a51fd5d96"  # Ubuntu 22.04 (서울 리전)
  instance_type          = "t2.micro"
  subnet_id              = aws_subnet.mcm_public.id
  vpc_security_group_ids = [aws_security_group.bastion.id]
  key_name               = aws_key_pair.main.key_name

  tags = {
    Name = "bastion"
  }
}

resource "aws_instance" "k3s_master" {
  ami                    = "ami-040c33c6a51fd5d96"
  instance_type          = "t3.medium"
  subnet_id              = aws_subnet.mcm_private.id
  vpc_security_group_ids = [aws_security_group.k8s.id]
  key_name               = aws_key_pair.main.key_name
  private_ip             = "10.1.2.10"
  iam_instance_profile = aws_iam_instance_profile.k8s_node.name

  user_data = <<-EOF
    #!/bin/bash

    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
    sudo apt-get install -y unzip
    unzip -q awscliv2.zip
    sudo ./aws/install
    rm -rf aws awscliv2.zip

    curl -sfL https://get.k3s.io | sh -s - server \
      --write-kubeconfig-mode 644 \
      --disable traefik \
      --node-name k3s-master

    systemctl enable k3s
    systemctl start k3s
    sleep 10

    # 토큰 SSM에 저장
    TOKEN=$(cat /var/lib/rancher/k3s/server/node-token)
    aws ssm put-parameter \
      --name /k8s/join-token \
      --value "$TOKEN" \
      --type SecureString \
      --overwrite \
      --region ap-northeast-2
    EOF
  user_data_replace_on_change = true

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  tags = {
    Name = "k3s-master"
    Role = "master"
  }
}

resource "aws_instance" "k3s_worker" {
  count                  = 2
  ami                    = "ami-040c33c6a51fd5d96"
  instance_type          = "t3.small"
  subnet_id              = aws_subnet.mcm_private.id
  vpc_security_group_ids = [aws_security_group.k8s.id]
  key_name               = aws_key_pair.main.key_name
  iam_instance_profile = aws_iam_instance_profile.k8s_node.name

  user_data = <<-EOF
    #!/bin/bash

    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
    sudo apt-get install -y unzip
    unzip -q awscliv2.zip
    sudo ./aws/install
    rm -rf aws awscliv2.zip

    export MASTER_IP="10.1.2.10"
    # 마스터 준비 대기
    echo "Waiting for master..."
    until nc -z $MASTER_IP 6443; do
      sleep 10
    done

    sleep 30

    # SSM에서 토큰 가져오기
    TOKEN=$(aws ssm get-parameter \
      --name /k8s/join-token \
      --with-decryption \
      --query Parameter.Value \
      --output text \
      --region ap-northeast-2)

    curl -sfL https://get.k3s.io | K3S_URL=https://$MASTER_IP:6443 K3S_TOKEN=$TOKEN sh -
    EOF
  user_data_replace_on_change = true

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  tags = {
    Name = "k3s-worker-${count.index + 1}"
    Role = "worker"
  }

  depends_on = [aws_instance.k3s_master]
}

# terraform/aws/main.tf
resource "aws_instance" "postgresql" {
  ami                    = "ami-040c33c6a51fd5d96"
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.mcm_private.id
  vpc_security_group_ids = [aws_security_group.db.id]
  key_name               = aws_key_pair.main.key_name
  private_ip             = "10.1.2.100"

  user_data = <<-EOF
  #!/bin/bash

  DB_NAME="${var.db_name}"
  DB_USER="${var.db_user}"
  DB_PASSWORD="${var.db_password}"

  apt-get update
  apt-get install -y postgresql postgresql-contrib

  PG_VERSION=$(ls /etc/postgresql/ | head -n 1)
  echo "listen_addresses = '*'" >> /etc/postgresql/$PG_VERSION/main/postgresql.conf
  echo "host all all 10.0.0.0/16 md5" >> /etc/postgresql/$PG_VERSION/main/pg_hba.conf

  systemctl enable postgresql
  systemctl start postgresql
  sleep 10

  sudo -u postgres psql <<EOSQL
  CREATE DATABASE $DB_NAME;
  CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
  GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
  \c $DB_NAME
  GRANT ALL ON SCHEMA public TO $DB_USER;
  EOSQL
  EOF
  user_data_replace_on_change = true

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  tags = {
    Name = "postgresql"
  }
}