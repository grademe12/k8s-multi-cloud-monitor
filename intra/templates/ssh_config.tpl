# intra/templates/ssh_config.tpl
Host bastion
  HostName ${bastion_ip}
  User ansible
  IdentityFile ../../keys/ansible_rsa

Host 10.1.2.*
  ProxyJump bastion
  User ansible
  IdentityFile ../../keys/ansible_rsa
  StrictHostKeyChecking no