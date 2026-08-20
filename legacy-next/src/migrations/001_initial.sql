CREATE TABLE assessment_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    session_id TEXT NOT NULL,
    industry TEXT,
    company_size TEXT,
    responses JSONB NOT NULL,
    recommendation JSONB NOT NULL,
    email TEXT,
    ip_address INET,
    status TEXT DEFAULT 'completed'
);

CREATE TABLE contact_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    industry TEXT,
    company_size TEXT,
    service_interest TEXT,
    message TEXT,
    status TEXT DEFAULT 'new'
);

CREATE TABLE analytics_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    session_id TEXT,
    event_name TEXT NOT NULL,
    page_url TEXT,
    cta_id TEXT,
    metadata JSONB
);

CREATE INDEX idx_assessment_session ON assessment_results(session_id);
CREATE INDEX idx_leads_email ON contact_leads(lower(email));
CREATE INDEX idx_leads_status ON contact_leads(status);
CREATE INDEX idx_events_session ON analytics_events(session_id);
CREATE INDEX idx_events_name ON analytics_events(event_name);

ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_insert" ON assessment_results FOR INSERT TO anon WITH CHECK (true);

ALTER TABLE contact_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_insert" ON contact_leads FOR INSERT TO anon WITH CHECK (true);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_insert" ON analytics_events FOR INSERT TO anon WITH CHECK (true);
