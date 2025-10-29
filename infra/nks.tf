#define naver kubernetes service

resource "ncloud_login_key" "key" {
  key_name = "${var.project_name}-login-key2"
}

resource "ncloud_nks_cluster" "cluster" {
  name                 = "${var.project_name}-cluster"
  cluster_type         = "SVR.VNKS.STAND.C002.M008.NET.SSD.B050.G002"
  login_key_name       = ncloud_login_key.key.key_name
  vpc_no               = ncloud_vpc.ncloud_vpc.id
  subnet_no_list       = [ncloud_subnet.private_subnet1.id]
  public_network       = false
  lb_private_subnet_no = ncloud_subnet.lb_private_subnet.id
  lb_public_subnet_no  = ncloud_subnet.lb_subnet.id
  zone                 = "KR-1"
  auth_type            = "API"

  access_entries {
    entry = "nrn:PUB:Account::3604371:Customer/static"

    policies {
      type  = "NKSClusterAdminPolicy"
      scope = "cluster"
    }
  }
}

resource "ncloud_nks_node_pool" "pool" {
  cluster_uuid   = ncloud_nks_cluster.cluster.uuid
  node_pool_name = "worker"
  subnet_no_list = [ncloud_subnet.private_subnet1.id]
  product_code   = "SVR.VSVR.STAND.C002.M008.NET.SSD.B050.G002"
  node_count     = 2
}

output "cluster_endpoint" {
  value     = ncloud_nks_cluster.cluster.endpoint
  sensitive = true
}