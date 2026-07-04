#!/bin/bash
# Runs automatically on first container start (docker-entrypoint-initdb.d).
# The postgres image already creates $POSTGRES_DB (nft) for us; this adds
# the second database used for local dev's indexa stand-in.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE ethereum OWNER "$POSTGRES_USER";
EOSQL
