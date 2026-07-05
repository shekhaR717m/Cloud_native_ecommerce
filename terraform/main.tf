terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.60" }
  }
  backend "s3" {
    bucket = "ecom-tfstate-mayankshez"
    key    = "prod/terraform.tfstate"
    region = "ap-south-1"
  }
}

provider "aws" { region = var.region }

module "vpc" {
  source = "./modules/vpc"
  name   = "ecom"
  cidr   = "10.0.0.0/16"
}

module "eks" {
  source       = "./modules/eks"
  cluster_name = "ecom-prod"
  vpc_id       = module.vpc.vpc_id
  subnet_ids   = module.vpc.private_subnet_ids
  node_groups = {
    general = { instance_types = ["t3.large"], min = 2, max = 10, desired = 3 }
    payment = { instance_types = ["t3.large"], min = 2, max = 4, desired = 2, taints = [{ key = "workload", value = "payment", effect = "NO_SCHEDULE" }] }
  }
}

module "ecr" {
  source = "./modules/ecr"
  repos  = ["user", "product", "order", "payment", "notification"]
}
