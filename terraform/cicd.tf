# Everything GitHub Actions needs: an ECR repo to push to, an OIDC
# provider to authenticate against, and a role scoped to this repo's
# main branch. The workflow reads the role ARN from the AWS_ROLE_ARN
# repository variable — no long-lived keys anywhere.

resource "aws_ecr_repository" "chatapp" {
  name                 = "chatapp"
  image_tag_mutability = "MUTABLE" # `latest` gets re-pointed on every push
  force_delete         = true      # lab: allow destroy while images exist

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "chatapp" {
  repository = aws_ecr_repository.chatapp.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep only the 10 most recent images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = {
        type = "expire"
      }
    }]
  })
}

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  # AWS validates GitHub's cert chain itself these days; the thumbprint
  # is required by the API but no longer security-critical.
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

data "aws_iam_policy_document" "ci_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # Only workflow runs on main of this repo — PRs and forks can't assume.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:ref:refs/heads/main"]
    }
  }
}

resource "aws_iam_role" "chatapp_ci" {
  name               = "chatapp-ci"
  assume_role_policy = data.aws_iam_policy_document.ci_trust.json
}

data "aws_iam_policy_document" "ci_permissions" {
  statement {
    sid       = "EcrAuth"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid = "EcrPushPull"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      "ecr:PutImage",
    ]
    resources = [aws_ecr_repository.chatapp.arn]
  }

  # kubectl auth goes through the EKS access entry; the role itself
  # only needs to resolve the cluster endpoint for update-kubeconfig.
  statement {
    sid       = "EksDescribe"
    actions   = ["eks:DescribeCluster"]
    resources = [module.eks.cluster_arn]
  }
}

resource "aws_iam_role_policy" "chatapp_ci" {
  name   = "chatapp-ci"
  role   = aws_iam_role.chatapp_ci.id
  policy = data.aws_iam_policy_document.ci_permissions.json
}
