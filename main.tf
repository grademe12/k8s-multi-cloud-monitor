provider "kubernetes" {
  config_path = "/home/woosupar/.kube/config"
}

resource "kubernetes_namespace" "monitor" {
  metadata {
    name = "monitor"
  }
}