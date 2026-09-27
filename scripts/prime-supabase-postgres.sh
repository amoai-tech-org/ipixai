#!/usr/bin/env bash
# Make the Postgres image required by pinned Supabase CLI 2.116.0 available
# before `supabase start`. Prefer ECR, then fall back to authenticated GHCR
# and tag the mirror with the exact ECR name the CLI requests.
set -euo pipefail

version="17.6.1.165"
ecr_image="public.ecr.aws/supabase/postgres:${version}"
ghcr_image="ghcr.io/supabase/postgres:${version}"

if docker image inspect "$ecr_image" >/dev/null 2>&1; then
  echo "postgres ${version} already cached"
  exit 0
fi

if docker pull "$ecr_image"; then
  exit 0
fi

echo "ECR postgres pull failed; falling back to authenticated GHCR mirror"
docker pull "$ghcr_image"
docker tag "$ghcr_image" "$ecr_image"
