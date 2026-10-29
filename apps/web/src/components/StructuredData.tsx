import React from "react";

export function StructuredData() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openocr.io";

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${baseUrl}#organization`,
    name: "OpenOCR",
    url: baseUrl,
    logo: `${baseUrl}/favicon.ico`,
    sameAs: [
      "https://github.com/openocr",
      "https://x.com/openocr",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "support@openocr.io",
      url: `${baseUrl}/support`,
    },
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${baseUrl}#software`,
    name: "OpenOCR Document Extraction Platform",
    applicationCategory: "DeveloperApplication, BusinessApplication",
    operatingSystem: "Linux, Windows, macOS, Docker",
    url: baseUrl,
    offers: [
      {
        "@type": "Offer",
        name: "Developer Plan",
        price: "49.00",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
      {
        "@type": "Offer",
        name: "Enterprise Self-Hosted",
        price: "499.00",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
    ],
    author: {
      "@type": "Organization",
      "@id": `${baseUrl}#organization`,
    },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseUrl}#website`,
    url: baseUrl,
    name: "OpenOCR",
    publisher: {
      "@type": "Organization",
      "@id": `${baseUrl}#organization`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  );
}
