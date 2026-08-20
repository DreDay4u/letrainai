const organizationData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "LeTrainAI",
  url: "https://letrainai.com",
  description:
    "AI consulting for businesses that take AI seriously. We build custom AI automation systems, AI-enhanced websites, and workflow optimization.",
  email: "hello@letrainai.com",
  sameAs: [
    "https://linkedin.com",
    "https://x.com",
  ],
};

const websiteData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "LeTrainAI",
  url: "https://letrainai.com",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://letrainai.com/blog?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

export function OrganizationJsonLd() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteData) }}
      />
    </>
  );
}
