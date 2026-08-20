#!/usr/bin/env bash
# Phase 4 live smoke — POST valid 5-answer payload (real DeepSeek call),
# then invalid payload. Prints status + response only (no secrets).
set -e
BASE=http://127.0.0.1:3104

echo "=== 1. VALID payload (unique session id) ==="
VALID='{"session_id":"smoke-p4-'$RANDOM'","answers":{"industry":"Professional Services","company_size":"6-20","time_sinks":["data_entry","reporting"],"current_tools":["email","spreadsheets"],"biggest_challenge":"efficiency"},"turnstile_token":""}'
RESP=$(curl -s -w "\n%{http_code}" -X POST $BASE/api/assessment -H "Content-Type: application/json" -d "$VALID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
echo "status: $CODE"
echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps({'opportunity_score': d.get('opportunity_score'), 'estimated_savings': d.get('estimated_savings'), 'recommendation_count': len(d.get('recommendations',[])), 'rec0_fields': sorted(d['recommendations'][0].keys()) if d.get('recommendations') else None, 'next_steps_len': len(d.get('next_steps','')), 'disclaimer_len': len(d.get('disclaimer',''))}, indent=1))"

echo "=== 2. INVALID payload (bad enum) ==="
INVALID='{"session_id":"smoke-p4-invalid","answers":{"industry":"Retail","company_size":"gigantic","time_sinks":["data_entry"],"current_tools":["email"],"biggest_challenge":"efficiency"},"turnstile_token":""}'
curl -s -w "\nstatus: %{http_code}\n" -X POST $BASE/api/assessment -H "Content-Type: application/json" -d "$INVALID"

echo "=== 3. EMAIL endpoint invalid (expect 400) ==="
curl -s -w "\nstatus: %{http_code}\n" -X POST $BASE/api/assessment/email -H "Content-Type: application/json" -d '{"session_id":"smoke-p4-x","email":"not-an-email"}'
