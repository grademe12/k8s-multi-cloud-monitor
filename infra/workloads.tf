resource "null_resource" "name" {
  depends_on = [ ncloud_nks_cluster.cluster ]

  provisioner "local-exec" {
    command = "ncp-iam-authenticator update-kubeconfig --clusterUuid ${self.triggers.cluster_uuid} --region ${self.triggers.region}"

    environment = {
        CLUSTER_UUID = data.ncloud_nks_kube_config.kube_config.cluster_uuid
        REGION = "KR"
    }    
  }

  triggers = {
    cluster_uuid = data.ncloud_nks_kube_config.kube_config.cluster_uuid
    region = "KR"
  }
}