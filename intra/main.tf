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