variable "project_name" {
  description = "project_name"
  type        = string
  default     = "k8s-monitor"
}

variable "access_key" {
  description = "ncloud access key"
  type        = string
  sensitive   = true
}

variable "secret_key" {
  description = "ncloud access secret key"
  type        = string
  sensitive   = true
}

variable "region" {
  description = "ncloud region"
  type        = string
  sensitive   = false
}

variable "zone" {
  description = "ncloud az"
  type        = string
  default     = "KR-1"
}

variable "db_username" {
  description = "Ncloud postgreDB user name"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Ncloud postgreDB user password"
  type        = string
  sensitive   = true
}