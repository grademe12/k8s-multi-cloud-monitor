#define naver kubernetes service

resource "ncloud_login_key" "key" {
  key_name = "${var.project_name}-key"
}

resource "ncloud_nks_cluster" "cluster" {
  name = "${var.project_name}-cluster"
  cluster_type = "SVR.VNKS.STAND.C002.M008.NET.SSD.B050.G002"
  login_key_name = ncloud_login_key.key.key_name
  vpc_no = ncloud_vpc.ncloud_vpc.id
  subnet_no_list = [
    ncloud_subnet.private_subnet1.id,
    ncloud_subnet.private_subnet2.id
  ]

  public_network = true
  lb_private_subnet_no = ncloud_subnet.lb_subnet.id
  zone = "KR-1"
}

resource "ncloud_nks_node_pool" "pool" {
  cluster_uuid = ncloud_nks_cluster.cluster.uuid
  node_pool_name = "worker"
  node_count = 1
}

output "cluster_endpoint" {
  value = ncloud_nks_cluster.cluster.endpoint
  sensitive = true
}

# resource "local_file" "kubeconfig" {
#   content = ncloud_nks_cluster.cluster.
#   filename = "${path.module}/kubeconfig.yaml"
#   file_permission = "0600"
# }

# output "kubeconfig_path" {
#   value = local_file.kubeconfig.filename
# }