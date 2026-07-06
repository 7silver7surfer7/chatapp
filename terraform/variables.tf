variable "region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "cluster_name" {
  description = "EKS cluster name (also used as the VPC name)"
  type        = string
  default     = "chatapp"
}

variable "kubernetes_version" {
  description = "EKS Kubernetes version"
  type        = string
  default     = "1.33"
}

variable "node_instance_type" {
  description = "Instance type for worker nodes (x86 — CI builds amd64 images)"
  type        = string
  default     = "t3.medium"
}

variable "node_count" {
  description = "Desired worker node count"
  type        = number
  default     = 2
}

variable "nat_gateway_per_az" {
  description = "One NAT gateway per AZ (HA) instead of a single shared one (budget)"
  type        = bool
  default     = false
}

variable "github_repo" {
  description = "GitHub repo (owner/name) allowed to assume the CI role"
  type        = string
  default     = "7silver7surfer7/chatapp"
}
