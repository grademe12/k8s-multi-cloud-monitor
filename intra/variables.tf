variable "aws_region" {
  description = "aws region of this project"
  type = string
  default = "ap-northeast-2"
}

variable "db_name" {
  type = string
  sensitive = true
}

variable "db_password" {
  type = string
  sensitive = true
}

variable "db_user" {
  type = string
  sensitive = true
}