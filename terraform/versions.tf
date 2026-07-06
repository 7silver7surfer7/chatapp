terraform {
  required_version = ">= 1.10"

  backend "s3" {
    bucket       = "terraform-backend-dannyel2"
    key          = "prd/use1/chatapp/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true # S3-native locking, no DynamoDB table needed
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Organization = "brightpath"
      Environment  = "prd"
      Application  = "chatapp"
      ManagedBy    = "terraform"
    }
  }
}
