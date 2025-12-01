resource "aws_vpc" "mcm_vpc" {
  cidr_block = "10.1.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support = true

  tags = {
    Name = "mcm-vpc"
  }
}

resource "aws_internet_gateway" "mcm_gateway" {
  vpc_id = aws_vpc.mcm_vpc.id

  tags = {
    Name = "mcm-igw"
  }
}

resource "aws_subnet" "mcm_public" {
  vpc_id = aws_vpc.mcm_vpc.id
  cidr_block = "10.1.1.0/24"
  availability_zone = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name = "mcm-public-subnet"
  }
}

resource "aws_subnet" "mcm_private" {
  vpc_id = aws_vpc.mcm_vpc.id
  cidr_block = "10.1.2.0/24"
  availability_zone = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name = "mcm-private-subnet"
  }
}

resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id = aws_subnet.mcm_public.id

  tags = {
    Name = "mcm-nat"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.mcm_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.mcm_gateway.id
  }

  tags = {
    Name = "mcm-public-route-table"
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.mcm_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = {
    Name = "mcm-private-route-table"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id = aws_subnet.mcm_public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  subnet_id = aws_subnet.mcm_private.id
  route_table_id = aws_route_table.private.id
}
