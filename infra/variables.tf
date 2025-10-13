variable "access_key" {
    description = "ncloud access key"
    type = string
    sensitive = true
}

variable "secret_key" {
    description = "ncloud access secret key"
    type = string
    sensitive = true
}

variable "region" {
  description = "ncloud region"
  type = string
  sensitive = false
}

