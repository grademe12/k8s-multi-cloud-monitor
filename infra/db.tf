#define ncloud postgredb

resource "ncloud_postgresql" "db" {
  service_name = "${var.project_name}-db"
  server_name_prefix = "postgre"
  user_name = var.db_username
  user_password = var.db_password
  vpc_no = ncloud_vpc.ncloud_vpc.id
  subnet_no = ncloud_subnet.private_subnet1.id
  database_name = "k_paas"
  client_cidr = "10.0.0.0/16"
  ha = false
  backup = false
}

output "db_port" {
  description = "Ncloud postgredb port"
  value = ncloud_postgresql.db.port
}