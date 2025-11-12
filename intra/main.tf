terraform {
  required_providers {
    aws = {
        source = "hashicorp/aws"
        version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "mcm-tfstate"
    key = "intra/terraform.tfstate"
    region = "ap-northeast-2"
    profile = "woosupar"
  }
}

provider "aws" {
  region = var.aws_region
  profile = "woosupar"
}

resource "null_resource" "copy_key_to_bastion" {
  # 인스턴스가 바뀔 때마다 무조건 재실행
  triggers = {
    instance_id = aws_instance.bastion.id
  }

  provisioner "file" {
    source      = "~/.ssh/id_ed25519"
    destination = "/home/ubuntu/.ssh/id_ed25519"
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file("~/.ssh/id_ed25519")
      host        = aws_instance.bastion.public_ip
    }
  }

  provisioner "remote-exec" {
    inline = ["chmod 600 ~/.ssh/id_ed25519"]
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file("~/.ssh/id_ed25519")
      host        = aws_instance.bastion.public_ip
    }
  }
}