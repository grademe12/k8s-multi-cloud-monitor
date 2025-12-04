# iam.tf
# SSM 접근 IAM Role
resource "aws_iam_role" "k8s_node" {
  name = "k8s-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "ssm_access" {
  name = "ssm-access"
  role = aws_iam_role.k8s_node.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:PutParameter",
          "ssm:GetParameter"
        ]
        Resource = "arn:aws:ssm:ap-northeast-2:*:parameter/k3s/*"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "k8s_node" {
  name = "k8s-node-profile"
  role = aws_iam_role.k8s_node.name
}