#!/usr/bin/env bash
# Phase 4 smoke part 3 (fresh rate-limit window): prove cache idempotency
# with the already-persisted session — repost must NOT create a new DB row
# and must return the same AI result.
set -e
BASE=http://127.0.0.1:3104
sleep 2
echo "=== repost same session smoke-p4-13846 (expect 200, fast, same score) ==="
curl -s -o /tmp/p4-cache.json -w "status: %{http_code} time: %{time_total}s\n" -X POST $BASE/api/assessment \
  -H "Content-Type: application/json" \
  -d '{"session_id":"smoke-p4-13846","answers":{"industry":"Professional Services","company_size":"6-20","time_sinks":["data_entry","reporting"],"current_tools":["email","spreadsheets"],"biggest_challenge":"efficiency"},"turnstile_token":""}'
python3 -c "import json; d=json.load(open('/tmp/p4-cache.json')); print('score:', d.get('opportunity_score'), '| savings:', d.get('estimated_savings'), '| recs:', len(d.get('recommendations',[])))"
echo "=== row count for that session (must still be 1) ==="
bash /home/andre/letrainai-p4/scripts/smoke-rows.sh | head -2
