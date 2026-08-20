#!/usr/bin/env bash
# Fetch smoke-test row ids from Supabase (prints ids only, never env values).
set -a; source /home/andre/LeTrainAI/.env.local; set +a
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/assessment_results?session_id=like.smoke-p4-*&select=id,session_id,status,created_at" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
echo
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/analytics_events?event_name=eq.assessment_complete&session_id=like.smoke-p4-*&select=id,session_id,event_name" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
echo
