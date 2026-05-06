# CompareElite Test Suite

Automated tests for validation scripts and structured data generation.

## Setup

Install dependencies:

```bash
npm install
```

## Running Tests

Run all tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

## Test Coverage

### Structured Data Tests (`structured-data.test.js`)

Tests for JSON-LD Schema.org structured data generation:

- ✅ Organization schema
- ✅ BreadcrumbList schema
- ✅ Article schema
- ✅ Product schema
- ✅ ItemList schema (product comparisons)
- ✅ FAQ schema
- ✅ Complete structured data generation

### Article Validation Tests (`article-validation.test.js`)

Tests for article schema validation:

- ✅ Required fields validation
- ✅ String field validation
- ✅ Category validation (Tech, Home Office, Smart Home, Home Fitness)
- ✅ Thumbnail validation (Amazon CDN, matches first product)
- ✅ Excerpt length validation (140-170 characters)
- ✅ Products array validation (minimum 6 products)
- ✅ Complete article validation

### Amazon Links Tests (`amazon-links.test.js`)

Tests for Amazon affiliate link validation:

- ✅ ASIN format validation (10 alphanumeric characters)
- ✅ ASIN extraction from URLs
- ✅ Affiliate tag validation (compareelite-20)
- ✅ Complete Amazon link validation
- ✅ Product link validation across articles
- ✅ ASIN extraction from article products

## CI/CD Integration

Tests are designed to run in GitHub Actions CI/CD pipeline:

```yaml
- name: Run tests
  run: npm test

- name: Check coverage
  run: npm run test:coverage
```

## Test Files

- `__tests__/structured-data.test.js` - Structured data generation
- `__tests__/article-validation.test.js` - Article schema validation  
- `__tests__/amazon-links.test.js` - Amazon link validation

## Configuration

Test configuration is in `jest.config.js` at the project root.

## Writing New Tests

Follow the existing test patterns:

1. Import the functions to test
2. Organize tests by functionality using `describe` blocks
3. Use descriptive test names with `it` blocks
4. Test both success and failure cases
5. Use appropriate Jest matchers (`toBe`, `toHaveLength`, etc.)

Example:

```javascript
describe('MyFunction', () => {
  it('should return true for valid input', () => {
    expect(myFunction('valid')).toBe(true);
  });

  it('should return false for invalid input', () => {
    expect(myFunction('invalid')).toBe(false);
  });
});
```
