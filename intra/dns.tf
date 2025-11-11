resource "aws_route53_zone" "private" {
  name = "k8s.internal"

  vpc {
    vpc_id = aws_vpc.mcm_vpc.id
  }
}

resource "aws_route53_record" "bastion" {
  zone_id = aws_route53_zone.private.zone_id
  name    = "bastion"
  type    = "A"
  ttl     = 300
  records = [aws_instance.bastion.private_ip]
}

resource "aws_route53_record" "k3s_master" {
  zone_id = aws_route53_zone.private.zone_id
  name    = "cluster"
  type    = "A"
  ttl     = 300
  records = [aws_instance.k3s_master.private_ip]
}

resource "aws_route53_record" "postgresql" {
  zone_id = aws_route53_zone.private.zone_id
  name    = "postgredb"
  type    = "A"
  ttl     = 300
  records = [aws_instance.postgresql.private_ip]
}