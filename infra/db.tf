#define ncloud postgredb

# resource "ncloud_access_control_group" "db_acg" {
#   name = "${var.project_name}-db-acg"
#   description = "PostgreSQL Access"
#   vpc_no = ncloud_vpc.ncloud_vpc.id
# }

# resource "ncloud_access_control_group_rule" "db_inbound" {
#   access_control_group_no = ncloud_access_control_group.db_acg.id

#   inbound {
#     protocol = "TCP"
#     ip_block = "0.0.0.0/0"
#     port_range = "5432"
#     description = "PostgreSQL ALL"
#   }
# }

resource "ncloud_postgresql" "db" {
  service_name       = "${var.project_name}-db"
  server_name_prefix = "postgre"
  user_name          = var.db_username
  user_password      = var.db_password
  vpc_no             = ncloud_vpc.ncloud_vpc.id
  subnet_no          = ncloud_subnet.private_subnet1.id
  database_name      = "k_paas"
  client_cidr        = "0.0.0.0/0"
  ha                 = false
  backup             = false
}

output "db_port" {
  description = "Ncloud postgredb port"
  value       = ncloud_postgresql.db.port
}