import type { FAQ } from "@/lib/faq";

// Renders a JSON-LD block. `<` is escaped so content can never close the script tag.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/**
 * `FAQPage` data for the same list the page renders: Google requires the two
 * to match, so both always read the same array.
 */
export function FaqPageJsonLd({ items }: { items: FAQ[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map(({ pregunta, respuesta }) => ({
          "@type": "Question",
          name: pregunta,
          acceptedAnswer: { "@type": "Answer", text: respuesta },
        })),
      }}
    />
  );
}
