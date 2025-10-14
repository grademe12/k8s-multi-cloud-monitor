#define main providers

terraform {
  required_providers {
    ncloud = {
      source = "NaverCloudPlatform/ncloud"
      version = "4.0.4"
    }
  }
  required_version = ">= 0.13"

  backend "s3" {
    endpoint = "kr.object.ncloudstorage.com"
    region = "ap-northeast-2"
    bucket = "woosupar-multi-cloud"
    key = "develop/terraform.tfstate"

    profile = "ncloud"

    skip_credentials_validation = true
    skip_metadata_api_check = true
    force_path_style = true
  }
}

// Configure the ncloud provider
provider "ncloud" {
  access_key  = var.access_key
  secret_key  = var.secret_key
  region      = var.region
  support_vpc = true
}