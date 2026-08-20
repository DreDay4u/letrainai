#!/usr/bin/env bash
# Phase 4 smoke part 2: cache idempotency (same session repost) + rate limit 429.
BASE=http://127.0.0.1:3104
echo "=== same-session repost (expect 200 from cache, instant) ==="
curl -s -o /tmp/p4-cache.json -w "status: %{http_code} time: %{time_total}s\n" -X POST $BASE/api/assessment \
  -H "Content-Type: application/json" \
  -d '{"session_id":"smoke-p4-13846","answers":{"industry":"Professional Services","company_size":"6-20","time_sinks":["data_entry","reporting"],"current_tools":["email","spreadsheets"],"biggest_challenge":"efficiency"},"turnstile_token":""}'
python3 -c "import json; d=json.load(open('/tmp/p4-cache.json')); print('score:', d.get('opportunity_score'), '| savings:', d.get('estimated_savings'))"
echo "=== 4th request same IP (expect 429) ==="
curl -s -w "\nstatus: %{http_code}\n" -X POST $BASE/api/assessment -H "Content-Type: application/json" \
  -d '{"session_id":"x-rate-limit-probe","answers":{"industry":"x","company_size":"1-5","time_sinks":["other"],"current_tools":["none"],"biggest_challenge":"cost"},"turnstile_token":""}'
