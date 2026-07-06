terraform {
  required_version = ">= 1.10"

  # Local state (terraform.tfstate in this directory, gitignored).
  # Deliberate tradeoff: no bucket dependency, but the file on this
  # machine is the only record of what exists in AWS — don't lose it
  # while resources are running.

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
