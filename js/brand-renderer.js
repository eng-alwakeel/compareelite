/**
 * Brand Hub Renderer — CompareElite
 * Renders brand articles from brands/{brand}/{slug}.json
 * Reads slug from URL path: /brand/{slug}
 */

(function () {
  'use strict';

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return [...(ctx || document).querySelectorAll(sel)]; }

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getSlugFromPath() {
    const parts = window.location.pathname.replace(/\/$/, '').split('/');
    return parts[parts.length - 1] || null;
  }

  async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    return res.json();
  }

  // ── Entry Point ──────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', async () => {
    const slug = getSlugFromPath();
    if (!slug || slug === 'brand') { showError('No article slug in URL.'); return; }

    try {
      const index = await fetchJSON('/brands/index.json');
      const entry = (index.articles || []).find(a => a.slug === slug);
      if (!entry) { showError(`Article "${slug}" not found in brands index.`); return; }

      const article = await fetchJSON('/' + entry.path);
      renderBrandArticle(article);
    } catch (err) {
      console.error(err);
      showError(`Failed to load article: ${err.message}`);
    }
  });

  function showError(msg) {
    const main = qs('#brand-page-main') || document.body;
    main.innerHTML = `<div class="container" style="padding:4rem 1.5rem;text-align:center;">
      <h2 style="color:var(--text-primary);margin-bottom:1rem;">Article not found</h2>
      <p style="color:var(--text-secondary);">${escHtml(msg)}</p>
      <a href="/" class="btn btn-primary" style="margin-top:1.5rem;display:inline-block;">← Back to Home</a>
    </div>`;
  }

  // ── Main Render ──────────────────────────────────────────────────────────────

  function renderBrandArticle(data) {
    updateMeta(data);
    renderHero(data);
    renderBrandAbout(data);
    renderQuickPicks(data);
    renderComparisonTable(data);
    renderProducts(data);
    renderBuyingGuide(data);
    renderBrandHighlights(data);
    renderMethodology(data);
    renderTrustSection(data);
    renderFaq(data);
    renderRelated(data);
    initScrollTop();
    injectSchemaOrg(data);
    initAccordions();
    hideSkeleton();
  }

  // ── Meta / SEO ───────────────────────────────────────────────────────────────

  function updateMeta(data) {
    const a = data.article || {};
    const brand = data.brand || {};
    const title = `${a.title || 'Brand Article'} | CompareElite`;
    document.title = title;

    function setMeta(sel, val) {
      const m = qs(sel);
      if (m && val) m.setAttribute('content', val);
    }
    function setId(id, val) {
      const m = document.getElementById(id);
      if (m && val) m.setAttribute('content', val);
    }

    setId('meta-desc', a.excerpt || '');
    setId('og-title', title);
    setId('og-desc', a.excerpt || '');
    setId('og-image', a.thumbnail || '');
    setId('og-url', `https://compareelite.com/brand/${a.slug}`);
    setId('tw-title', title);
    setId('tw-desc', a.excerpt || '');
    setId('tw-image', a.thumbnail || '');
    setId('canonical-url', `https://compareelite.com/brand/${a.slug}`);

    // Breadcrumb title
    const bc = document.getElementById('breadcrumb-title');
    if (bc) bc.textContent = a.title || 'Brand Article';

    // Page title element
    const pt = document.getElementById('brand-page-title-text');
    if (pt) pt.textContent = a.title || '';
  }

  // ── Hero ─────────────────────────────────────────────────────────────────────

  function renderHero(data) {
    const wrap = document.getElementById('brand-hero-section');
    if (!wrap) return;
    const brand = data.brand || {};
    const a = data.article || {};
    const hero = data.hero || {};

    wrap.innerHTML = `
      <div class="container">
        <div class="brand-meta">
          <div class="brand-logo-wrap">
            <img src="${escHtml(brand.logo || '')}" alt="${escHtml(brand.name || '')} logo" onerror="this.style.display='none'">
          </div>
          <div class="brand-name-tag">
            <span class="brand-name">${escHtml(brand.name || '')}</span>
            <span class="brand-tagline">${escHtml(brand.tagline || '')}</span>
          </div>
          <span class="hero-read-time">${escHtml(a.read_time || '10 min read')}</span>
        </div>
        <h1 class="hero-headline">${escHtml(hero.headline || a.title || '')}</h1>
        <p class="hero-intro">${escHtml(hero.intro || '')}</p>
        ${renderHighlights(hero.key_highlights || [])}
      </div>
    `;
  }

  function renderHighlights(chips) {
    if (!chips.length) return '';
    const items = chips.map(c => `
      <div class="highlight-chip">
        <span class="highlight-icon">${escHtml(c.icon || '')}</span>
        <span class="highlight-label">${escHtml(c.label || '')}</span>
        <span class="highlight-value">${escHtml(c.value || '')}</span>
      </div>
    `).join('');
    return `<div class="hero-highlights">${items}</div>`;
  }

  // ── Brand About ──────────────────────────────────────────────────────────────

  function renderBrandAbout(data) {
    const wrap = document.getElementById('brand-about-section');
    if (!wrap) return;
    const brand = data.brand || {};
    wrap.innerHTML = `
      <div class="container">
        <div class="brand-about-inner">
          <div class="brand-about-logo">
            <img src="${escHtml(brand.logo || '')}" alt="${escHtml(brand.name || '')} logo" onerror="this.style.display='none'">
          </div>
          <div class="brand-about-content">
            <h2>About ${escHtml(brand.name || '')}</h2>
            <p>${escHtml(brand.description || '')}</p>
            <div class="brand-meta-chips">
              ${brand.founded ? `<span class="brand-chip">📅 Founded ${escHtml(String(brand.founded))}</span>` : ''}
              ${brand.country ? `<span class="brand-chip">🌍 ${escHtml(brand.country)}</span>` : ''}
              ${brand.official_url ? `<span class="brand-chip"><a href="${escHtml(brand.official_url)}" target="_blank" rel="noopener nofollow" style="color:inherit;text-decoration:none;">🔗 Official Site</a></span>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ── Quick Picks ──────────────────────────────────────────────────────────────

  function renderQuickPicks(data) {
    const wrap = document.getElementById('quick-picks-section');
    if (!wrap) return;
    const picks = data.quick_picks || {};
    const products = data.products || [];

    const labelMap = {
      best_overall: { label: 'Best Overall', cls: 'qp-overall' },
      best_value: { label: 'Best Value', cls: 'qp-value' },
      best_camera: { label: 'Best Camera', cls: 'qp-camera' },
      best_battery: { label: 'Best Battery', cls: 'qp-battery' },
      best_for_pros: { label: 'Best for Pros', cls: 'qp-pros' },
    };

    const badges = Object.entries(picks).map(([key, id]) => {
      const meta = labelMap[key] || { label: key.replace(/_/g, ' '), cls: 'qp-overall' };
      const product = products.find(p => p.id === id);
      if (!product) return '';
      return `
        <a class="quick-pick-badge" href="#product-${escHtml(id)}" aria-label="${escHtml(meta.label)}: ${escHtml(product.name)}">
          <span class="quick-pick-label ${escHtml(meta.cls)}">${escHtml(meta.label)}</span>
          <span class="quick-pick-name">${escHtml(product.name)}</span>
        </a>
      `;
    }).join('');

    wrap.innerHTML = `
      <div class="container">
        <p class="quick-picks-title">Quick Picks</p>
        <div class="quick-picks-grid">${badges}</div>
      </div>
    `;
  }

  // ── Comparison Table ─────────────────────────────────────────────────────────

  function renderComparisonTable(data) {
    const wrap = document.getElementById('comparison-table-section');
    if (!wrap) return;
    const ct = data.comparison_table || {};
    if (!ct.headers || !ct.rows) return;

    const thead = `<tr>${ct.headers.map((h, i) => `<th${i === 0 ? '' : ''}>${escHtml(h)}</th>`).join('')}</tr>`;
    const tbody = ct.rows.map(row =>
      `<tr>${row.map((cell, i) => i === 0 ? `<td>${escHtml(cell)}</td>` : `<td>${escHtml(cell)}</td>`).join('')}</tr>`
    ).join('');

    wrap.innerHTML = `
      <div class="container">
        <p class="section-label">Side by Side</p>
        <h2 class="section-headline">Full Comparison Table</h2>
        <p class="section-sub">Scroll right on mobile to see all columns.</p>
        <div class="table-scroll">
          <table class="comparison-table" aria-label="Product comparison">
            <thead>${thead}</thead>
            <tbody>${tbody}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ── Products ─────────────────────────────────────────────────────────────────

  function renderProducts(data) {
    const wrap = document.getElementById('products-section');
    if (!wrap) return;
    const products = data.products || [];

    wrap.innerHTML = `
      <div class="container">
        <p class="section-label">Our Rankings</p>
        <h2 class="section-headline">Best ${escHtml((data.brand || {}).name || '')} Products in 2026</h2>
        <p class="section-sub">Ranked by our team after 120+ hours of real-world testing.</p>
        <div id="products-list"></div>
      </div>
    `;

    const list = document.getElementById('products-list');
    products.forEach((product, idx) => {
      list.appendChild(buildProductCard(product, idx));
    });
  }

  function buildProductCard(p, idx) {
    const card = el('div', 'product-card');
    card.id = `product-${escHtml(p.id || idx)}`;

    const badgeClass = getBadgeClass(p.best_for || '');
    const stars = ratingToStars(p.rating || '');
    const specs = (p.key_specs || []).slice(0, 8);

    card.innerHTML = `
      <div class="product-card-inner">
        <div class="product-gallery" id="gallery-${idx}">
          ${buildGallery(p.images || [], p.name || '', idx)}
          ${p.video_url ? `<div class="video-embed" style="margin:0 1rem 1rem;border-radius:10px;overflow:hidden;"><iframe src="${escHtml(p.video_url)}" allowfullscreen loading="lazy" title="${escHtml(p.name)} video"></iframe></div>` : ''}
        </div>
        <div class="product-info">
          <div>
            <div class="product-header">
              <div class="product-badges">
                <span class="rank-badge">#${idx + 1}</span>
                <span class="best-for-badge ${badgeClass}">${escHtml(p.best_for || '')}</span>
              </div>
              <div class="product-rating">
                <span class="rating-score">${escHtml(p.rating || '')}</span>
                <span class="rating-stars" aria-label="${escHtml(p.rating || '')} stars">${stars}</span>
              </div>
            </div>
            <h2 class="product-name" style="margin-top:0.875rem;">${escHtml(p.name || '')}</h2>
            <p class="product-tagline">${escHtml(p.tagline || '')}</p>
            <p class="product-price">${escHtml(p.price || '')}</p>
          </div>

          <div class="specs-grid">
            ${specs.map(s => `
              <span class="spec-label">${escHtml(s.label || '')}</span>
              <span class="spec-value">${escHtml(s.value || '')}</span>
            `).join('')}
          </div>

          <div class="why-section">
            <h4>Why We Picked It</h4>
            <p>${escHtml(p.why_we_picked_it || '')}</p>
          </div>

          <div class="pros-cons">
            <div class="pros-box">
              <div class="pros-cons-label">Pros</div>
              <ul class="pros-list">${(p.pros || []).map(x => `<li>${escHtml(x)}</li>`).join('')}</ul>
            </div>
            <div class="cons-box">
              <div class="pros-cons-label">Cons</div>
              <ul class="cons-list">${(p.cons || []).map(x => `<li>${escHtml(x)}</li>`).join('')}</ul>
            </div>
          </div>

          ${(p.color_options || []).length ? `
            <div class="color-options">
              <span class="color-options-label">Colors:</span>
              ${p.color_options.map(c => `<span class="color-pill">${escHtml(c)}</span>`).join('')}
            </div>
          ` : ''}

          <div class="buy-section">
            <a href="${escHtml(p.amazon_link || '#')}" class="btn-buy" target="_blank" rel="noopener nofollow sponsored" aria-label="Buy ${escHtml(p.name || '')} on Amazon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
              Check Price on Amazon
            </a>
            <p class="verdict-mini">${escHtml(p.verdict || '')}</p>
          </div>
        </div>
      </div>
    `;

    // Attach gallery interactions after inserting into DOM
    requestAnimationFrame(() => initGallery(card, p.images || [], idx));

    return card;
  }

  function buildGallery(images, name, idx) {
    if (!images.length) return '';
    const main = `<img class="gallery-main" id="gallery-main-${idx}" src="${escHtml(images[0])}" alt="${escHtml(name)}" loading="${idx === 0 ? 'eager' : 'lazy'}">`;
    const thumbs = images.map((img, ti) => `
      <img class="gallery-thumb${ti === 0 ? ' active' : ''}"
           data-idx="${ti}"
           data-gallery="${idx}"
           src="${escHtml(img)}"
           alt="${escHtml(name)} view ${ti + 1}"
           loading="lazy">
    `).join('');
    return `${main}<div class="gallery-thumbs">${thumbs}</div>`;
  }

  function initGallery(card, images, galleryIdx) {
    if (images.length <= 1) return;
    const mainImg = card.querySelector(`#gallery-main-${galleryIdx}`);
    const thumbs = card.querySelectorAll(`.gallery-thumb[data-gallery="${galleryIdx}"]`);
    if (!mainImg || !thumbs.length) return;

    thumbs.forEach(thumb => {
      thumb.addEventListener('click', () => {
        const ti = parseInt(thumb.dataset.idx, 10);
        mainImg.style.opacity = '0.6';
        setTimeout(() => {
          mainImg.src = images[ti];
          mainImg.style.opacity = '1';
        }, 150);
        thumbs.forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });
    });
  }

  function getBadgeClass(bestFor) {
    const map = {
      'best overall': 'badge-best-overall',
      'best value': 'badge-best-value',
      'best battery': 'badge-best-battery',
      'best camera': 'badge-best-camera',
      'best for pros': 'badge-best-pros',
      'best discount': 'badge-best-discount',
    };
    return map[(bestFor || '').toLowerCase()] || 'badge-default';
  }

  function ratingToStars(rating) {
    const m = String(rating).match(/^(\d+(?:\.\d+)?)\//);
    if (!m) return '';
    const score = parseFloat(m[1]);
    const stars = Math.round(score / 2);
    return '★'.repeat(stars) + '☆'.repeat(Math.max(0, 5 - stars));
  }

  // ── Buying Guide ─────────────────────────────────────────────────────────────

  function renderBuyingGuide(data) {
    const wrap = document.getElementById('buying-guide-section');
    if (!wrap) return;
    const guide = data.buying_guide || [];

    const items = guide.map((item, i) => `
      <div class="accordion-item">
        <button class="accordion-trigger" aria-expanded="false" aria-controls="guide-body-${i}">
          <h3>${escHtml(item.title || '')}</h3>
          <span class="accordion-icon" aria-hidden="true">+</span>
        </button>
        <div class="accordion-body" id="guide-body-${i}" role="region">
          <div class="accordion-body-inner">${escHtml(item.body || '')}</div>
        </div>
      </div>
    `).join('');

    wrap.innerHTML = `
      <div class="container">
        <p class="section-label">Buyer's Guide</p>
        <h2 class="section-headline">Everything You Need to Know Before Buying</h2>
        <p class="section-sub">Expert answers to the questions that actually matter.</p>
        <div class="accordion-list">${items}</div>
      </div>
    `;
  }

  // ── Brand Highlights ─────────────────────────────────────────────────────────

  function renderBrandHighlights(data) {
    const wrap = document.getElementById('brand-highlights-section');
    if (!wrap) return;
    const highlights = data.brand_highlights || [];
    const brandName = (data.brand || {}).name || '';

    const cards = highlights.map(h => `
      <div class="highlight-card">
        <div class="highlight-card-icon">${escHtml(h.icon || '')}</div>
        <div class="highlight-card-title">${escHtml(h.title || '')}</div>
        <p class="highlight-card-body">${escHtml(h.body || '')}</p>
      </div>
    `).join('');

    wrap.innerHTML = `
      <div class="container">
        <p class="section-label">Why ${escHtml(brandName)}</p>
        <h2 class="section-headline">What Makes ${escHtml(brandName)} Stand Out</h2>
        <div class="highlights-grid" style="margin-top:2rem;">${cards}</div>
      </div>
    `;
  }

  // ── Methodology ──────────────────────────────────────────────────────────────

  function renderMethodology(data) {
    const wrap = document.getElementById('methodology-section');
    if (!wrap) return;
    const m = data.methodology || {};

    const criteria = (m.test_criteria || []).map(c => `<li>${escHtml(c)}</li>`).join('');

    wrap.innerHTML = `
      <div class="container">
        <p class="section-label">Our Process</p>
        <h2 class="section-headline">${escHtml(m.title || 'How We Tested')}</h2>
        <div class="methodology-layout" style="margin-top:1.5rem;">
          <div class="methodology-body">${escHtml(m.body || '')}</div>
          <div class="methodology-aside">
            <div class="methodology-hours">
              <span class="hours-number">${escHtml(String(m.hours_tested || 0))}</span>
              <span class="hours-label">Hours Tested</span>
            </div>
            ${criteria ? `<ul class="criteria-list">${criteria}</ul>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  // ── Trust Section ─────────────────────────────────────────────────────────────

  function renderTrustSection(data) {
    const wrap = document.getElementById('trust-section');
    if (!wrap) return;
    const t = data.trust_section || {};

    const creds = (t.credentials || []).map(c => `<li>${escHtml(c)}</li>`).join('');

    wrap.innerHTML = `
      <div class="container">
        <p class="section-label">Editorial Independence</p>
        <h2 class="section-headline">${escHtml(t.title || 'Why Trust Us')}</h2>
        <div class="trust-layout" style="margin-top:1.5rem;">
          <div class="trust-body">${escHtml(t.body || '')}</div>
          ${creds ? `<ul class="credentials-list">${creds}</ul>` : ''}
        </div>
      </div>
    `;
  }

  // ── FAQ ───────────────────────────────────────────────────────────────────────

  function renderFaq(data) {
    const wrap = document.getElementById('faq-section');
    if (!wrap) return;
    const faqs = data.faq || [];

    const items = faqs.map((item, i) => `
      <div class="accordion-item">
        <button class="accordion-trigger" aria-expanded="false" aria-controls="faq-body-${i}">
          <h3>${escHtml(item.q || '')}</h3>
          <span class="accordion-icon" aria-hidden="true">+</span>
        </button>
        <div class="accordion-body" id="faq-body-${i}" role="region">
          <div class="accordion-body-inner">${escHtml(item.a || '')}</div>
        </div>
      </div>
    `).join('');

    wrap.innerHTML = `
      <div class="container">
        <p class="section-label">Common Questions</p>
        <h2 class="section-headline">Frequently Asked Questions</h2>
        <div class="accordion-list" style="margin-top:1.5rem;">${items}</div>
      </div>
    `;
  }

  // ── Related Articles ──────────────────────────────────────────────────────────

  async function renderRelated(data) {
    const wrap = document.getElementById('related-section');
    if (!wrap) return;
    const slugs = [...(data.related_general_articles || []), ...(data.related_brand_articles || [])];
    if (!slugs.length) { wrap.style.display = 'none'; return; }

    let related = [];
    try {
      const results = await Promise.allSettled(
        slugs.map(s => fetchJSON(`/articles/${s}.json`).then(d => ({ ...d, _slug: s, _type: 'general' })).catch(() =>
          fetchJSON(`/brands/index.json`).then(idx => {
            const e = (idx.articles || []).find(a => a.slug === s);
            return e ? { title: e.title, thumbnail: e.thumbnail, _slug: s, _type: 'brand' } : null;
          })
        ))
      );
      related = results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value)
        .slice(0, 4);
    } catch (_) { /* silent */ }

    if (!related.length) { wrap.style.display = 'none'; return; }

    const cards = related.map(a => {
      const url = a._type === 'brand'
        ? `/brand/${escHtml(a._slug)}`
        : `/blog/article?slug=${escHtml(a._slug)}`;
      return `
        <a class="related-card" href="${url}">
          ${a.thumbnail ? `<img src="${escHtml(a.thumbnail)}" alt="${escHtml(a.title || '')}" loading="lazy">` : ''}
          <div class="related-card-body">
            <div class="related-card-badge">${a._type === 'brand' ? 'Brand Guide' : 'Buying Guide'}</div>
            <div class="related-card-title">${escHtml(a.title || a._slug)}</div>
          </div>
        </a>
      `;
    }).join('');

    wrap.innerHTML = `
      <div class="container">
        <p class="section-label">Keep Reading</p>
        <h2 class="section-headline">Related Guides</h2>
        <div class="related-grid" style="margin-top:1.5rem;">${cards}</div>
      </div>
    `;
  }

  // ── Schema.org ────────────────────────────────────────────────────────────────

  function injectSchemaOrg(data) {
    if (!data.schema_org) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data.schema_org, null, 2);
    document.head.appendChild(script);
  }

  // ── Accordions ────────────────────────────────────────────────────────────────

  function initAccordions() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('.accordion-trigger');
      if (!btn) return;
      const bodyId = btn.getAttribute('aria-controls');
      const body = bodyId ? document.getElementById(bodyId) : null;
      const isOpen = btn.getAttribute('aria-expanded') === 'true';

      // Close all in same list
      const list = btn.closest('.accordion-list');
      if (list) {
        list.querySelectorAll('.accordion-trigger').forEach(b => {
          b.setAttribute('aria-expanded', 'false');
          const bId = b.getAttribute('aria-controls');
          const bBody = bId ? document.getElementById(bId) : null;
          if (bBody) bBody.classList.remove('open');
        });
      }

      if (!isOpen && body) {
        btn.setAttribute('aria-expanded', 'true');
        body.classList.add('open');
      }
    });
  }

  // ── Scroll Top ────────────────────────────────────────────────────────────────

  function initScrollTop() {
    const btn = document.getElementById('scroll-top-btn');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 500);
    }, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // ── Hide Skeleton ─────────────────────────────────────────────────────────────

  function hideSkeleton() {
    qsa('.brand-loading-skeleton').forEach(el => el.remove());
    qsa('.brand-content-section').forEach(el => el.style.display = '');
  }

})();
