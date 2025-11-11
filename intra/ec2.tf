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

  user_data = file("/home/woosupar/k-paas/intra/scripts/k3s-master-init.sh")

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

  user_data = templatefile("/home/woosupar/k-paas/intra/scripts/k3s-worker-init.sh", {
    master_ip = aws_instance.k3s_master.private_ip
  })

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

  # templatefile로 변수 전달
  user_data = templatefile("/home/woosupar/k-paas/intra/scripts/postgres-init.sh", {
    db_name     = var.db_name
    db_user     = var.db_user
    db_password = var.db_password
  })

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  tags = {
    Name = "postgresql"
  }
}