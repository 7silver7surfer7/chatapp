output "cluster_name" {
  description = "EKS cluster name — set as the EKS_CLUSTER_NAME repo variable"
  value       = module.eks.cluster_name
}

output "ci_role_arn" {
  description = "GitHub Actions role — set as the AWS_ROLE_ARN repo variable"
  value       = aws_iam_role.chatapp_ci.arn
}

output "ecr_repository_url" {
  description = "Where CI pushes images"
  value       = aws_ecr_repository.chatapp.repository_url
}

output "configure_kubectl" {
  description = "Run this to point kubectl at the cluster"
  value       = "aws eks update-kubeconfig --name ${module.eks.cluster_name} --region ${var.region}"
}
