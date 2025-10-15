terraform {
  required_providers {
    ncloud = {
      source = "NaverCloudPlatform/ncloud"
      version = "4.0.4"
    }
  }
  backend "s3" {
    shared_credentials_files = [ "~/.aws/credentials" ]
    profile = "default"
    endpoints = {
      s3 = "https://kr.object.ncloudstorage.com"
    }

    bucket = "woosupar-tfstate"
    region = "KR"
    key = "develop/terraform.tfstate"

    skip_credentials_validation = true
    skip_metadata_api_check = true
    skip_requesting_account_id = true
    skip_region_validation = true
    skip_s3_checksum = true
  }
}

provider "ncloud" {
  access_key  = var.access_key
  secret_key  = var.secret_key
  region      = var.region
  support_vpc = true
}