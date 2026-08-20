#!/usr/bin/env bash
# Phase 4 smoke test server launcher — loads env vars silently from
# /home/andre/LeTrainAI/.env.local (values never printed), starts built
# Astro server on 127.0.0.1:3104.
set -a
source /home/andre/LeTrainAI/.env.local
set +a
export PORT=3104
export HOST=127.0.0.1
cd /home/andre/letrainai-p4
exec node dist/server/entry.mjs
