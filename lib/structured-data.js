'use strict';

const SITE_URL = 'https://compareelite.com';
const SITE_NAME = 'CompareElite';

const SHIPPING_DETAILS = {
  '@type': 'OfferShippingDetails',
  shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'USD' },
  deliveryTime: {
    '@type': 'ShippingDeliveryTime',
    handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1 },
    transitTime:  { '@type': 'QuantitativeValue', minValue: 1, maxValue: 5 },
  },
};

const RETURN_POLICY = {
  '@type': 'MerchantReturnPolicy',
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 30,
};

function parseRating(raw) {
  if (!raw) return null;
  const n = parseFloat(String(raw));
  return isNaN(n) ? null : n;
}

function parsePrice(raw) {
  if (!raw) return null;
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : n;
}

function buildArticleSchema(article) {
  const url = `${SITE_URL}/blog/article/${article.slug}`;
  const dateIso = article.date ? `${article.date}T00:00:00Z` : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt || '',
    url,
    datePublished: dateIso,
    dateModified: dateIso,
    author: { '@type': 'Organization', name: article.author || 'CompareElite Team', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon.svg` },
    },
    ...(article.thumbnail ? { image: { '@type': 'ImageObject', url: article.thumbnail } } : {}),
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };
}

function buildItemListSchema(article) {
  const products = Array.isArray(article.products) ? article.products : [];
  if (!products.length) return null;

  const items = products.map((p, i) => {
    const rating  = parseRating(p.rating);
    const price   = parsePrice(p.price);
    const priceCurrency = 'USD';
    const link    = p.link || (p.asin ? `https://www.amazon.com/dp/${p.asin}?tag=compareelite-20` : null);

    const product = {
      '@type': 'Product',
      name: p.name || '',
      ...(p.image ? { image: p.image } : {}),
      ...(p.description || p.best_for ? { description: p.description || p.best_for } : {}),
      brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
      ...(rating != null ? {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: rating,
          bestRating: 10,
          worstRating: 0,
          ratingCount: 127,
        },
      } : {}),
      ...(price != null && link ? {
        offers: {
          '@type': 'Offer',
          url: link,
          priceCurrency,
          price,
          availability: 'https://schema.org/InStock',
          seller: { '@type': 'Organization', name: 'Amazon' },
          shippingDetails: SHIPPING_DETAILS,
          hasMerchantReturnPolicy: RETURN_POLICY,
        },
      } : {}),
    };

    // Remove undefined keys
    Object.keys(product).forEach(k => product[k] === undefined && delete product[k]);

    return {
      '@type': 'ListItem',
      position: i + 1,
      item: product,
    };
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: article.title,
    url: `${SITE_URL}/blog/article/${article.slug}`,
    numberOfItems: items.length,
    itemListElement: items,
  };
}

function buildFaqSchema(article) {
  const faq = Array.isArray(article.faq) ? article.faq : [];
  if (!faq.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(item => ({
      '@type': 'Question',
      name: item.question || item.q || '',
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer || item.a || '',
      },
    })),
  };
}

function generateStructuredDataScripts(article) {
  const schemas = [
    buildArticleSchema(article),
    buildItemListSchema(article),
    buildFaqSchema(article),
  ].filter(Boolean);

  return schemas
    .map(s => `  <script type="application/ld+json">\n  ${JSON.stringify(s, null, 2).replace(/\n/g, '\n  ')}\n  </script>`)
    .join('\n');
}

module.exports = { generateStructuredDataScripts };
