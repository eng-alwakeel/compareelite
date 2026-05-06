/**
 * Generate JSON-LD structured data for SEO
 * Implements Schema.org standards for better search engine understanding
 */

const SITE_URL = 'https://compareelite.com';
const ORGANIZATION_NAME = 'CompareElite';
const AFFILIATE_TAG = 'compareelite-20';

/**
 * Generate Organization schema
 */
function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: ORGANIZATION_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
    description: 'Unbiased buying guides and product comparisons across Tech, Home, Fitness, and Auto.',
    sameAs: [
      'https://twitter.com/CompareElite',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      email: 'support@compareelite.com',
    },
  };
}

/**
 * Generate BreadcrumbList schema
 */
function generateBreadcrumbSchema(articleTitle, articleSlug, category) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Buying Guides',
        item: `${SITE_URL}/blog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: category || 'Guide',
        item: `${SITE_URL}/blog#${category || 'guides'}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: articleTitle,
        item: `${SITE_URL}/blog/article/${articleSlug}`,
      },
    ],
  };
}

/**
 * Generate Article schema
 */
function generateArticleSchema(article) {
  const url = `${SITE_URL}/blog/article/${article.slug}`;
  const datePublished = article.publishedAt || article.date || new Date().toISOString().split('T')[0];
  const dateModified = article.updatedAt || datePublished;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt || `Expert ${article.title} buying guide and product comparison.`,
    image: article.thumbnail || `${SITE_URL}/og-image.jpg`,
    author: {
      '@type': 'Organization',
      name: ORGANIZATION_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: ORGANIZATION_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/icon.svg`,
      },
    },
    datePublished: `${datePublished}T00:00:00Z`,
    dateModified: `${dateModified}T00:00:00Z`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    articleSection: article.category || 'Buying Guides',
    keywords: [
      article.title,
      article.category,
      'buying guide',
      'product comparison',
      '2026',
      'best products',
    ].filter(Boolean).join(', '),
  };
}

/**
 * Generate Product schema for a single product
 */
function generateProductSchema(product, rank) {
  if (!product || !product.asin) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title || product.name,
    description: product.description || `${product.title || product.name} - Top-rated product`,
    image: product.imageUrl || product.image,
    url: product.affiliateLink || `https://amazon.com/dp/${product.asin}?tag=${AFFILIATE_TAG}`,
    sku: product.asin,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'Amazon',
    },
  };

  // Add aggregateRating if rating is available
  if (product.rating) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      bestRating: 5,
      worstRating: 1,
    };
  }

  // Add offers if price is available
  if (product.price) {
    const priceValue = typeof product.price === 'string'
      ? parseFloat(product.price.replace(/[^0-9.]/g, ''))
      : product.price;

    schema.offers = {
      '@type': 'Offer',
      price: priceValue,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: product.affiliateLink || `https://amazon.com/dp/${product.asin}?tag=${AFFILIATE_TAG}`,
    };
  }

  // Add position if rank is provided
  if (rank) {
    schema.position = rank;
  }

  return schema;
}

/**
 * Generate ItemList schema for all products in an article
 */
function generateProductListSchema(article) {
  if (!article.products || !Array.isArray(article.products) || article.products.length === 0) {
    return null;
  }

  const items = article.products
    .filter(p => p && p.asin)
    .map((product, index) => {
      const rank = product.rank || (index + 1);
      return {
        '@type': 'ListItem',
        position: rank,
        item: generateProductSchema(product, rank),
      };
    });

  if (items.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: article.title,
    description: article.excerpt || `Top products for ${article.title}`,
    numberOfItems: items.length,
    itemListElement: items,
  };
}

/**
 * Generate FAQ schema from article FAQs
 */
function generateFAQSchema(article) {
  if (!article.faq || !Array.isArray(article.faq) || article.faq.length === 0) {
    return null;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: article.faq.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

/**
 * Generate all structured data for an article page
 */
function generateAllStructuredData(article) {
  const schemas = [];

  // 1. Organization (appears on every page)
  schemas.push(generateOrganizationSchema());

  // 2. Breadcrumb
  schemas.push(generateBreadcrumbSchema(
    article.title,
    article.slug,
    article.category
  ));

  // 3. Article
  schemas.push(generateArticleSchema(article));

  // 4. Product list (if products exist)
  const productList = generateProductListSchema(article);
  if (productList) {
    schemas.push(productList);
  }

  // 5. FAQ (if FAQs exist)
  const faq = generateFAQSchema(article);
  if (faq) {
    schemas.push(faq);
  }

  return schemas;
}

/**
 * Generate JSON-LD script tags for insertion into HTML
 */
function generateStructuredDataScripts(article) {
  const schemas = generateAllStructuredData(article);

  return schemas
    .map(schema => {
      const json = JSON.stringify(schema, null, 2);
      return `  <script type="application/ld+json">\n${json}\n  </script>`;
    })
    .join('\n');
}

module.exports = {
  generateOrganizationSchema,
  generateBreadcrumbSchema,
  generateArticleSchema,
  generateProductSchema,
  generateProductListSchema,
  generateFAQSchema,
  generateAllStructuredData,
  generateStructuredDataScripts,
};
