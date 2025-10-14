#define network resource

resource "ncloud_vpc" "ncloud_vpc" {
  name = "ncloud_vpc"
  ipv4_cidr_block = "10.0.0.0/16"
}

resource "ncloud_nat_gateway" "nat" {
  vpc_no = ncloud_vpc.ncloud_vpc.id
  subnet_no = ncloud_subnet.nat_subnet.id
  zone = var.zone
  name = "nat"
}

resource "ncloud_route_table" "private_route_table" {
  vpc_no = ncloud_vpc.ncloud_vpc.id
  name = "private-route-table"
  supported_subnet_type = "PRIVATE"
}

resource "ncloud_route" "private_nat_route" {
  route_table_no = ncloud_route_table.private_route_table.id
  destination_cidr_block = "0.0.0.0/0"
  target_type = "NATGW"
  target_name = ncloud_nat_gateway.nat.name
  target_no = ncloud_nat_gateway.nat.id
}

resource "ncloud_route_table_association" "private_subnet1_asso" {
  route_table_no = ncloud_route_table.private_route_table.id
  subnet_no = ncloud_subnet.private_subnet1.id
}

resource "ncloud_route_table_association" "private_subnet2_asso" {
  route_table_no = ncloud_route_table.private_route_table.id
  subnet_no = ncloud_subnet.private_subnet2.id
}

resource "ncloud_network_acl" "nacl" {
  name = "nacl"
  vpc_no = ncloud_vpc.ncloud_vpc.id
}

resource "ncloud_subnet" "nat_subnet" {
  name = "nat_subnet"
  vpc_no = ncloud_vpc.ncloud_vpc.id
  subnet = "10.0.1.0/24"
  network_acl_no = ncloud_network_acl.nacl.id
  subnet_type = "PUBLIC"
  zone = var.zone
  usage_type = "NATGW"
}

resource "ncloud_subnet" "lb_subnet" {
  name = "lb_subnet"
  vpc_no = ncloud_vpc.ncloud_vpc.id
  subnet = "10.0.4.0/24"
  network_acl_no = ncloud_network_acl.nacl.id
  subnet_type = "PUBLIC"
  zone = var.zone
  usage_type = "LOADB"
}

resource "ncloud_subnet" "private_subnet1" {
    name = "private_subnet1"
    vpc_no = ncloud_vpc.ncloud_vpc.id
    subnet = "10.0.2.0/24"
    network_acl_no = ncloud_network_acl.nacl.id #임시
    subnet_type = "PRIVATE"
    zone = "KR-1"
    usage_type = "GEN"
}

resource "ncloud_subnet" "private_subnet2" {
    name = "private_subnet2"
    vpc_no = ncloud_vpc.ncloud_vpc.id
    subnet = "10.0.3.0/24"
    network_acl_no = ncloud_network_acl.nacl.id #임시
    subnet_type = "PRIVATE"
    zone = "KR-2"
    usage_type = "GEN"
}
