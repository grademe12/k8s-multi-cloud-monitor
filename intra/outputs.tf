output "bastion_public_ip" {
  value = aws_instance.bastion.public_ip
}

output "k3s_master_private_ip" {
  value = aws_instance.k3s_master.private_ip
}

output "postgresql_private_ip" {
  value = aws_instance.postgresql.private_ip
}

resource "local_file" "ansible_ssh_config" {
  content = templatefile("${path.module}/templates/ssh_config.tpl", {
    bastion_ip = aws_instance.bastion.public_ip
  })
  filename = "${path.module}/ansible/ssh_config"
}