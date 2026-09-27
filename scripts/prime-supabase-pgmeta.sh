#!/usr/bin/env bash
# IPI-1358 · SB-CI-REGISTRY-001 — make the postgres-meta image that pinned
# Supabase CLI 2.116.0 requests available before `supabase gen types --db-url`.
#
# The CI job pins SUPABASE_INTERNAL_IMAGE_REGISTRY=public.ecr.aws, which also
# turns off the CLI's own ECR → GHCR → Docker Hub fallback
# (apps/cli-go/internal/utils/docker.go: HasRegistryOverride). So this script
# restores exactly one fallback for this one image:
#
#   cached → done · ECR pull → done · ECR fails → GHCR pull + tag · both fail → exit ≠ 0
#
# The GHCR image is the byte-identical upstream mirror (same index digest as
# docker.io/supabase/postgres-meta:v0.98.0), and it is the name CLI 2.116.0
# itself resolves for registry ghcr.io. It is NOT ghcr.io/supabase/cli/pgmeta,
# which is a separately built slim image with a different image ID.
set -euo pipefail

version="v0.98.0"
ecr_image="public.ecr.aws/supabase/postgres-meta:${version}"
ghcr_image="ghcr.io/supabase/postgres-meta:${version}"

if docker image inspect "$ecr_image" >/dev/null 2>&1; then
  echo "postgres-meta ${version} already cached"
  exit 0
fi

if docker pull "$ecr_image"; then
  exit 0
fi

echo "ECR postgres-meta pull failed; falling back to authenticated GHCR mirror"
docker pull "$ghcr_image"
docker tag "$ghcr_image" "$ecr_image"
