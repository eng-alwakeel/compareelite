const {
  generateOrganizationSchema,
  generateBreadcrumbSchema,
  generateArticleSchema,
  generateProductSchema,
  generateProductListSchema,
  generateFAQSchema,
  generateAllStructuredData,
} = require('../lib/structured-data');

describe('Structured Data Library', () => {
  describe('generateOrganizationSchema', () => {
    it('should generate valid Organization schema', () => {
      const schema = generateOrganizationSchema();

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('Organization');
      expect(schema.name).toBe('CompareElite');
      expect(schema.url).toBe('https://compareelite.com');
      expect(schema.logo).toBe('https://compareelite.com/icon.svg');
      expect(schema.contactPoint).toHaveProperty('@type', 'ContactPoint');
    });
  });

  describe('generateBreadcrumbSchema', () => {
    it('should generate valid BreadcrumbList schema', () => {
      const schema = generateBreadcrumbSchema('Best Laptops', 'best-laptops-2026', 'Tech');

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('BreadcrumbList');
      expect(schema.itemListElement).toBeInstanceOf(Array);
      expect(schema.itemListElement).toHaveLength(4);
      expect(schema.itemListElement[0].position).toBe(1);
      expect(schema.itemListElement[3].name).toBe('Best Laptops');
    });
  });

  describe('generateArticleSchema', () => {
    it('should generate valid Article schema', () => {
      const article = {
        slug: 'best-laptops-2026',
        title: 'Best Laptops 2026',
        excerpt: 'Our comprehensive guide to the best laptops',
        category: 'Tech',
        publishedAt: '2026-05-01',
      };

      const schema = generateArticleSchema(article);

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('Article');
      expect(schema.headline).toBe('Best Laptops 2026');
      expect(schema.description).toBe('Our comprehensive guide to the best laptops');
      expect(schema.author['@type']).toBe('Organization');
      expect(schema.publisher['@type']).toBe('Organization');
      expect(schema.datePublished).toContain('2026-05-01');
    });
  });

  describe('generateProductSchema', () => {
    it('should generate valid Product schema with all fields', () => {
      const product = {
        asin: 'B08X1234AB',
        title: 'Amazing Laptop',
        description: 'Best laptop ever',
        imageUrl: 'https://m.media-amazon.com/images/I/test.jpg',
        affiliateLink: 'https://amazon.com/dp/B08X1234AB?tag=compareelite-20',
        rating: 4.5,
        price: '$999.99',
        brand: 'TestBrand',
      };

      const schema = generateProductSchema(product, 1);

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('Product');
      expect(schema.name).toBe('Amazing Laptop');
      expect(schema.sku).toBe('B08X1234AB');
      expect(schema.aggregateRating.ratingValue).toBe(4.5);
      expect(schema.offers.price).toBe(999.99);
      expect(schema.position).toBe(1);
    });

    it('should return null for product without ASIN', () => {
      const product = { title: 'No ASIN Product' };
      const schema = generateProductSchema(product);

      expect(schema).toBeNull();
    });
  });

  describe('generateProductListSchema', () => {
    it('should generate valid ItemList schema', () => {
      const article = {
        title: 'Best Laptops 2026',
        excerpt: 'Top laptop picks',
        products: [
          {
            asin: 'B08X1234AB',
            title: 'Laptop 1',
            rating: 4.5,
            price: '$999',
          },
          {
            asin: 'B08X5678CD',
            title: 'Laptop 2',
            rating: 4.3,
            price: '$799',
          },
        ],
      };

      const schema = generateProductListSchema(article);

      expect(schema['@type']).toBe('ItemList');
      expect(schema.numberOfItems).toBe(2);
      expect(schema.itemListElement).toHaveLength(2);
      expect(schema.itemListElement[0]['@type']).toBe('ListItem');
      expect(schema.itemListElement[0].position).toBe(1);
    });

    it('should return null for article without products', () => {
      const article = { title: 'No Products' };
      const schema = generateProductListSchema(article);

      expect(schema).toBeNull();
    });
  });

  describe('generateFAQSchema', () => {
    it('should generate valid FAQPage schema', () => {
      const article = {
        faq: [
          {
            question: 'What is the best laptop?',
            answer: 'The Dell XPS 15 is our top pick.',
          },
          {
            question: 'How much should I spend?',
            answer: 'Budget $800-1500 for a quality laptop.',
          },
        ],
      };

      const schema = generateFAQSchema(article);

      expect(schema['@type']).toBe('FAQPage');
      expect(schema.mainEntity).toHaveLength(2);
      expect(schema.mainEntity[0]['@type']).toBe('Question');
      expect(schema.mainEntity[0].acceptedAnswer['@type']).toBe('Answer');
    });

    it('should return null for article without FAQ', () => {
      const article = { title: 'No FAQ' };
      const schema = generateFAQSchema(article);

      expect(schema).toBeNull();
    });
  });

  describe('generateAllStructuredData', () => {
    it('should generate all schemas for a complete article', () => {
      const article = {
        slug: 'best-laptops-2026',
        title: 'Best Laptops 2026',
        excerpt: 'Comprehensive laptop buying guide',
        category: 'Tech',
        products: [
          {
            asin: 'B08X1234AB',
            title: 'Laptop 1',
            rating: 4.5,
          },
        ],
        faq: [
          {
            question: 'Test question?',
            answer: 'Test answer.',
          },
        ],
      };

      const schemas = generateAllStructuredData(article);

      expect(schemas).toBeInstanceOf(Array);
      expect(schemas.length).toBeGreaterThanOrEqual(3); // Organization, Breadcrumb, Article, ProductList, FAQ

      const types = schemas.map(s => s['@type']);
      expect(types).toContain('Organization');
      expect(types).toContain('BreadcrumbList');
      expect(types).toContain('Article');
      expect(types).toContain('ItemList');
      expect(types).toContain('FAQPage');
    });
  });
});
