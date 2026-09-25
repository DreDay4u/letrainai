# Funnel measurement queries — letrainai.com

Copy-paste SQL against the self-hosted Supabase Postgres (`analytics_events`,
`assessment_results`). No dashboards, no new infra — run in the Supabase SQL
editor or `psql`.

Schema facts these queries rely on:

- `analytics_events(event_name, session_id, page_url, cta_id, metadata jsonb, created_at)`
  — strict catalogue; UTM values live inside `metadata` (`utm_source`, `utm_medium`, `utm_campaign`).
- `assessment_results(session_id, email, status 'started'|'completed', payment_status 'unpaid'|'paid', paid_tier 'report'|'session', paid_at, created_at)`

## Acquisition — who is arriving and from where

```sql
-- Daily unique visitors (sessions) and views
select created_at::date as day,
       count(distinct session_id) as unique_sessions,
       count(*) filter (where event_name = 'landing_view') as views
from analytics_events
group by 1 order by 1 desc limit 30;
```

```sql
-- Top acquisition sources (UTM), last 30 days
select metadata->>'utm_source' as source,
       metadata->>'utm_medium' as medium,
       metadata->>'utm_campaign' as campaign,
       count(distinct session_id) as sessions
from analytics_events
where event_name = 'landing_view'
  and created_at > now() - interval '30 days'
group by 1, 2, 3
order by sessions desc limit 20;
```

## Activation — assessment funnel (the metric that matters first)

```sql
-- Funnel stage counts + step conversion, last 30 days
with stages as (
  select 'visited site' as stage, count(distinct session_id) as sessions from analytics_events
  where event_name = 'landing_view' and created_at > now() - interval '30 days'
  union all
  select 'started wizard', count(distinct session_id) from analytics_events
  where event_name = 'assessment_start' and created_at > now() - interval '30 days'
  union all
  select 'gave email', count(distinct session_id) from analytics_events
  where event_name = 'email_captured_start' and created_at > now() - interval '30 days'
  union all
  select 'submitted answers', count(distinct session_id) from analytics_events
  where event_name = 'assessment_submit' and created_at > now() - interval '30 days'
  union all
  select 'got results', count(distinct session_id) from analytics_events
  where event_name = 'assessment_generated' and created_at > now() - interval '30 days'
)
select stage, sessions,
       round(100.0 * sessions / first_value(sessions) over (order by
         case stage when 'visited site' then 1 when 'started wizard' then 2
         when 'gave email' then 3 when 'submitted answers' then 4 else 5 end)) as pct_of_entry
from stages order by 1;
```

Biggest drop-off between consecutive stages = your next fix. (Wizard → submit
drop usually means question friction; submit → generated drop means API/timeout
problems.)

```sql
-- Errors during generation
select date_trunc('day', created_at) as day, count(*)
from analytics_events where event_name = 'assessment_failed'
group by 1 order by 1 desc limit 14;
```

## Conversion — paywall → Stripe → paid

```sql
-- Paywall exposure, checkout clicks, failures by tier
select event_name, metadata->>'tier' as tier, count(*) as n
from analytics_events
where event_name in ('paywall_view', 'checkout_start', 'checkout_failed')
  and created_at > now() - interval '30 days'
group by 1, 2 order by 1, 2;
```

```sql
-- Actual paid conversions and revenue mix (truth lives in assessment_results)
select paid_tier,
       count(*) filter (where payment_status = 'paid') as paid,
       count(*) as completed_assessments,
       round(100.0 * count(*) filter (where payment_status = 'paid') / nullif(count(*), 0), 1) as paid_pct
from assessment_results
where status = 'completed'
group by 1;
```

```sql
-- Paid revenue by week ($149 report / $499 session)
select date_trunc('week', paid_at) as week,
       count(*) filter (where paid_tier = 'report') * 149 as report_usd,
       count(*) filter (where paid_tier = 'session') * 499 as session_usd
from assessment_results
where payment_status = 'paid'
group by 1 order by 1 desc limit 12;
```

## Retention signals — do people come back to their report?

```sql
-- Saved-artifact intent (new events) + report-page returns
select event_name, count(distinct session_id) as sessions
from analytics_events
where event_name in ('report_link_copy', 'report_share')
group by 1;
```

```sql
-- Repeat visits to report pages (returning users)
select count(*) as repeat_report_views,
       count(distinct session_id) as sessions_returning
from (
  select session_id, created_at::date as d, count(*) as views
  from analytics_events
  where page_url like '/report/%'
  group by 1, 2
  having count(*) > 1
) r;
```

## Surface engagement — do the new transparency pages work?

```sql
-- Sample-report and pricing views (leading indicators of checkout_start)
select event_name, count(distinct session_id) as sessions
from analytics_events
where event_name in ('sample_report_view', 'pricing_view')
  and created_at > now() - interval '30 days'
group by 1;
```

## Operator note

These queries measure acquisition → activation → conversion → retention with
zero new infrastructure. The funnel leaks found on 2026-08-28 (3 starts → 2
completes → 0 stored) are the baseline; re-run the activation query weekly and
compare step conversion, not absolute counts, until traffic justifies trends.
