/* ==========================================================================
   STYLE ZONE — Interactive Showcase Script (Non-Ecommerce Store Portfolio)
   ========================================================================== */

(function () {
  'use strict';

  // Showcase Catalog Data — loaded from the backend (owner-managed via /admin.html)
  let SHOWCASE_ITEMS = [];

  const STORAGE_KEY = 'stylezone-saved-looks';

  // Toast helper
  const toastEl = document.getElementById('sz-toast');
  let toastTimer = null;
  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('is-visible');
    }, 2600);
  }

  // 1. Sticky Header Scroll State
  const siteHeader = document.getElementById('site-header');
  window.addEventListener(
    'scroll',
    () => {
      if (window.scrollY > 10) {
        siteHeader?.classList.add('is-scrolled');
      } else {
        siteHeader?.classList.remove('is-scrolled');
      }
    },
    { passive: true }
  );

  // 2. Mandatory Fallback for <dialog closedby="any"> on browsers without native closedBy support
  document.querySelectorAll('dialog.sz-dialog').forEach((dialog) => {
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (isDialogContent) return;
        dialog.close();
      });
    }
  });

  // Close buttons inside dialogs
  document.addEventListener('click', (e) => {
    const closeBtn = e.target.closest('[data-close-dialog]');
    if (closeBtn) {
      const targetId = closeBtn.getAttribute('data-close-dialog');
      const dlg = document.getElementById(targetId);
      if (dlg && dlg.open) dlg.close();
    }
  });

  // 3. Multi-Image Card Slideshows (Hover preview + Arrow buttons)
  // Wired up fresh after every render, since cards are now built from fetched data.
  function initSlideshows() {
    document.querySelectorAll('[data-slideshow]').forEach((gallery) => {
      const slides = Array.from(gallery.querySelectorAll('.card-gallery__slide'));
      if (slides.length <= 1) return;
      let currentIndex = 0;

      function showSlide(index) {
        currentIndex = (index + slides.length) % slides.length;
        slides.forEach((s, idx) => {
          s.classList.toggle('is-active', idx === currentIndex);
        });
      }

      const prevBtn = gallery.querySelector('[data-slide-prev]');
      const nextBtn = gallery.querySelector('[data-slide-next]');

      prevBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        showSlide(currentIndex - 1);
      });

      nextBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        showSlide(currentIndex + 1);
      });

      // Subtle second-image preview on pointer enter (matches CREWZT card-gallery behavior)
      gallery.addEventListener('pointerenter', () => {
        if (currentIndex === 0 && slides.length > 1) {
          showSlide(1);
        }
      });

      gallery.addEventListener('pointerleave', () => {
        showSlide(0);
      });
    });
  }

  // 4. Category Filtering (with View Transitions API support when available)
  // Filter pills are generated dynamically from whatever categories exist in the
  // catalog (see initFilterPills below), so admin-added categories like "Streetwear"
  // or "Formal Wear" just appear as filters automatically.
  function applyFilter(category) {
    document.querySelectorAll('.filter-pill').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.filter === category);
    });

    const updateDOM = () => {
      document.querySelectorAll('.showcase-card').forEach((card) => {
        const cats = (card.dataset.category || '').split(' ');
        const match = category === 'all' || cats.includes(category);
        card.hidden = !match;
      });
    };

    if (document.startViewTransition) {
      document.startViewTransition(updateDOM);
    } else {
      updateDOM();
    }
  }

  function initFilterPills() {
    document.querySelectorAll('.filter-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyFilter(btn.dataset.filter);
      });
    });
  }

  document.querySelectorAll('[data-filter-trigger]').forEach((link) => {
    link.addEventListener('click', () => {
      const cat = link.getAttribute('data-filter-trigger');
      if (cat) applyFilter(cat);
    });
  });

  // 5. Why STYLE ZONE 3D Perspective Tilt Effect (Exact replica of CREWZT WhyCrewzt custom element)
  const tiltIntensity = 10;
  document.querySelectorAll('[data-tilt-card]').forEach((card) => {
    const cardInner = card.querySelector('.why-card-inner');
    if (!cardInner) return;

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -tiltIntensity;
      const rotateY = ((x - centerX) / centerX) * tiltIntensity;

      cardInner.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    card.addEventListener('mouseleave', () => {
      cardInner.style.transform =
        'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
  });

  // 6. Scroll Reveal Observer (Exact replica of CREWZT ScrollAnimate)
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll('.scroll-reveal').forEach((el) => {
    revealObserver.observe(el);
  });

  // 7. Saved Lookbook / Wishlist State (Replaces Ecommerce Cart with Lookbook Bookmarking)
  function getSavedIds() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveIds(ids) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {}
  }

  function syncWishlistUI() {
    const savedIds = getSavedIds();
    const countBubble = document.getElementById('saved-count-bubble');
    if (countBubble) {
      countBubble.textContent = String(savedIds.length);
      countBubble.hidden = savedIds.length === 0;
    }

    document.querySelectorAll('[data-wishlist-id]').forEach((btn) => {
      const id = btn.getAttribute('data-wishlist-id');
      const active = savedIds.includes(id);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.setAttribute(
        'aria-label',
        active ? 'Remove from Saved Lookbook' : 'Save to Lookbook'
      );
    });

    renderSavedDrawer();
  }

  function toggleSavedLook(id) {
    let savedIds = getSavedIds();
    const exists = savedIds.includes(id);
    if (exists) {
      savedIds = savedIds.filter((item) => item !== id);
      showToast('Removed from Saved Lookbook');
    } else {
      savedIds.push(id);
      showToast('Saved to your Style Zone Lookbook');
    }
    saveIds(savedIds);
    syncWishlistUI();
  }

  document.addEventListener('click', (e) => {
    const wishBtn = e.target.closest('[data-wishlist-id]');
    if (wishBtn) {
      e.stopPropagation();
      const id = wishBtn.getAttribute('data-wishlist-id');
      toggleSavedLook(id);
    }
  });

  function renderSavedDrawer() {
    const container = document.getElementById('saved-drawer-content');
    if (!container) return;
    const savedIds = getSavedIds();

    if (savedIds.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 48px 16px;">
          <p style="font-size:1rem; font-weight:600; margin:0 0 8px;">Your Saved Lookbook is empty</p>
          <p style="font-size:0.8125rem; color:rgba(0,0,0,0.6); margin:0 0 24px;">
            Bookmark your favorite Style Zone pieces while browsing to show our team when you visit our Villianur showroom.
          </p>
          <a href="#showcase" class="btn-primary" data-close-dialog="saved-drawer" style="width:100%;">
            Explore Showcase
          </a>
        </div>
      `;
      return;
    }

    const itemsHtml = savedIds
      .map((id) => SHOWCASE_ITEMS.find((item) => item.id === id))
      .filter(Boolean)
      .map(
        (item) => `
        <div style="display:flex; gap:14px; align-items:center; padding-bottom:16px; margin-bottom:16px; border-bottom:1px solid #efefef;">
          <img src="${item.images[0]}" alt="${item.title}" style="width:68px; height:88px; object-fit:cover; border-radius:6px; background:#f4f4f4;">
          <div style="flex:1;">
            <p style="font-size:0.7rem; font-weight:600; text-transform:uppercase; color:rgba(0,0,0,0.55); margin:0 0 4px;">${item.badge}</p>
            <h4 style="font-size:0.875rem; font-weight:600; margin:0 0 6px; cursor:pointer;" data-open-look="${item.id}">${item.title}</h4>
            <button type="button" data-wishlist-id="${item.id}" style="background:none; border:none; padding:0; font-size:0.75rem; text-decoration:underline; color:rgba(0,0,0,0.6);">Remove</button>
          </div>
        </div>
      `
      )
      .join('');

    container.innerHTML = `
      <div>
        <p style="font-size:0.8125rem; color:rgba(0,0,0,0.65); margin:0 0 20px;">
          You have bookmarked <strong>${savedIds.length}</strong> look(s). Visit our store at Raak College Road, Villianur or call us to inquire about sizes.
        </p>
        ${itemsHtml}
        <div style="display:grid; gap:10px; margin-top:24px;">
          <a href="tel:+919952753389" class="btn-primary">Call Showroom (099527 53389)</a>
          <a href="https://www.google.com/maps/search/?api=1&query=Style+Zone+Kid%27s+%26+Men%27s+Clothing+Villianur+Puducherry+605110" target="_blank" rel="noopener noreferrer" class="btn-secondary">Get Store Directions</a>
        </div>
      </div>
    `;
  }

  // 8. Lookbook Detail Modal (Opens when clicking any card image, title, or "View Look" button)
  const lookModal = document.getElementById('look-modal');
  const lookModalContent = document.getElementById('look-modal-content');

  function openLookModal(id) {
    const item = SHOWCASE_ITEMS.find((i) => i.id === id);
    if (!item || !lookModal || !lookModalContent) return;

    const savedIds = getSavedIds();
    const isSaved = savedIds.includes(item.id);

    const thumbsHtml = item.images
      .map(
        (imgSrc, idx) => `
        <button type="button" class="look-detail-thumb ${idx === 0 ? 'is-active' : ''}" data-detail-thumb="${imgSrc}">
          <img src="${imgSrc}" alt="${item.title} view ${idx + 1}">
        </button>
      `
      )
      .join('');

    lookModalContent.innerHTML = `
      <div class="look-detail-grid">
        <div class="look-detail-gallery">
          <img src="${item.images[0]}" alt="${item.title}" id="look-detail-main-image" class="look-detail-main-img">
          <div class="look-detail-thumbs">
            ${thumbsHtml}
          </div>
        </div>
        <div class="look-detail-info">
          <span class="look-detail-badge">${item.badge}</span>
          <h3 class="look-detail-title">${item.title}</h3>
          <p class="look-detail-desc">${item.description}</p>

          <div class="look-detail-specs">
            <div class="look-detail-spec-row">
              <span class="look-detail-spec-label">Silhouette / Fit</span>
              <span class="look-detail-spec-val">${item.fit}</span>
            </div>
            <div class="look-detail-spec-row">
              <span class="look-detail-spec-label">Material</span>
              <span class="look-detail-spec-val">${item.fabric}</span>
            </div>
            <div class="look-detail-spec-row">
              <span class="look-detail-spec-label">Showcase Status</span>
              <span class="look-detail-spec-val">${item.availability}</span>
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
            <button type="button" class="btn-primary" data-wishlist-id="${item.id}" aria-pressed="${isSaved ? 'true' : 'false'}">
              ${isSaved ? 'Saved in Lookbook ✓' : 'Bookmark Look'}
            </button>
            <a href="tel:+919952753389" class="btn-secondary">
              Inquire In-Store
            </a>
          </div>
          <p style="font-size:0.75rem; color:rgba(0,0,0,0.55); margin:16px 0 0; text-align:center;">
            Available at Style Zone: Raak College Road, Plot No. 1 &amp; 2, Villianur, Puducherry 605110
          </p>
        </div>
      </div>
    `;

    // Close other dialogs if open
    const searchModal = document.getElementById('search-modal');
    const savedDrawer = document.getElementById('saved-drawer');
    if (searchModal?.open) searchModal.close();
    if (savedDrawer?.open) savedDrawer.close();

    if (!lookModal.open) {
      lookModal.showModal();
    }
  }

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-open-look]');
    if (trigger) {
      const id = trigger.getAttribute('data-open-look');
      openLookModal(id);
      return;
    }

    const thumbBtn = e.target.closest('[data-detail-thumb]');
    if (thumbBtn) {
      const src = thumbBtn.getAttribute('data-detail-thumb');
      const mainImg = document.getElementById('look-detail-main-image');
      if (mainImg && src) {
        mainImg.src = src;
      }
      document.querySelectorAll('.look-detail-thumb').forEach((t) => {
        t.classList.toggle('is-active', t === thumbBtn);
      });
    }
  });

  // 9. Search Modal & Live Filtering
  const searchModal = document.getElementById('search-modal');
  const searchTrigger = document.getElementById('search-trigger');
  const searchInput = document.getElementById('showcase-search-input');
  const searchResults = document.getElementById('search-results');

  function renderSearchResults(query = '') {
    if (!searchResults) return;
    const q = query.trim().toLowerCase();
    const matches = SHOWCASE_ITEMS.filter(
      (item) =>
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.badge.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    );

    if (matches.length === 0) {
      searchResults.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:rgba(0,0,0,0.6);">No matching styles found. Try "White", "Black", "Oversized", or "Graphic".</p>`;
      return;
    }

    searchResults.innerHTML = matches
      .map(
        (item) => `
        <div class="search-result-item" data-open-look="${item.id}">
          <img src="${item.images[0]}" alt="${item.title}" loading="lazy">
          <span>${item.title}</span>
        </div>
      `
      )
      .join('');
  }

  searchTrigger?.addEventListener('click', () => {
    renderSearchResults(searchInput?.value || '');
    searchModal?.showModal();
    setTimeout(() => searchInput?.focus(), 50);
  });

  searchInput?.addEventListener('input', (e) => {
    renderSearchResults(e.target.value);
  });

  // 10. Drawer Triggers (Saved Lookbook & Mobile Menu)
  const savedDrawerTrigger = document.getElementById('saved-drawer-trigger');
  const savedDrawer = document.getElementById('saved-drawer');
  savedDrawerTrigger?.addEventListener('click', () => {
    renderSavedDrawer();
    savedDrawer?.showModal();
  });

  const mobileMenuTrigger = document.getElementById('mobile-menu-trigger');
  const mobileMenuDrawer = document.getElementById('mobile-menu-drawer');
  mobileMenuTrigger?.addEventListener('click', () => {
    mobileMenuDrawer?.showModal();
  });

  // 11. Newsletter / Updates Form
  const newsletterForm = document.getElementById('newsletter-form');
  newsletterForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('newsletter-email');
    if (input && input.value) {
      showToast('Thank you! You are subscribed to Style Zone updates.');
      input.value = '';
    }
  });

  // 12. Showcase Grid Rendering — builds cards from fetched catalog data
  function slugifyCategory(label) {
    return label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  const HEART_ICON_SVG =
    '<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
  const ARROW_ICON_SVG =
    '<svg viewBox="0 0 20 20" fill="none"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.25 10h11.5m0 0-4-4m4 4-4 4"/></svg>';
  const QUICK_VIEW_ICON_SVG =
    '<svg viewBox="0 0 20 20" fill="none"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.5 10s3-5.5 7.5-5.5S17.5 10 17.5 10s-3 5.5-7.5 5.5S2.5 10 2.5 10Z"/><circle cx="10" cy="10" r="2.25" stroke="currentColor" stroke-width="1.5"/></svg>';

  function renderShowcaseCard(item, index) {
    const slidesHtml = item.images
      .map(
        (src, idx) => `
          <div class="card-gallery__slide ${idx === 0 ? 'is-active' : ''}">
            <img src="${src}" alt="${item.title}" class="card-gallery__image" loading="${idx === 0 ? 'eager' : 'lazy'}">
          </div>
        `
      )
      .join('');

    const delay = (index % 4) * 0.08;

    return `
      <article class="showcase-card scroll-reveal" style="transition-delay: ${delay}s" data-id="${item.id}" data-category="${item.category.map(slugifyCategory).join(' ')}">
        <div class="card-gallery" data-slideshow>
          <button type="button" class="wishlist-btn" data-wishlist-id="${item.id}" aria-label="Bookmark look" aria-pressed="false">
            ${HEART_ICON_SVG}
          </button>

          <div class="card-gallery__arrows">
            <button type="button" class="slideshow-arrow slideshow-arrow--prev" data-slide-prev aria-label="Previous image">${ARROW_ICON_SVG}</button>
            <button type="button" class="slideshow-arrow slideshow-arrow--next" data-slide-next aria-label="Next image">${ARROW_ICON_SVG}</button>
          </div>

          <div class="card-gallery__slides" data-open-look="${item.id}">
            ${slidesHtml}
          </div>

          <button type="button" class="quick-view-btn" data-open-look="${item.id}">
            ${QUICK_VIEW_ICON_SVG}
            View Look
          </button>
        </div>

        <div class="showcase-card__info">
          <h4 class="showcase-card__title" data-open-look="${item.id}">${item.title}</h4>
          <p class="showcase-card__meta">${item.badge} &bull; In-Store Showcase</p>
        </div>
      </article>
    `;
  }

  function renderShowcaseGrid() {
    const grid = document.getElementById('showcase-grid');
    if (!grid) return;
    grid.innerHTML = SHOWCASE_ITEMS.map(renderShowcaseCard).join('');
    grid.querySelectorAll('.scroll-reveal').forEach((el) => revealObserver.observe(el));
  }

  function renderFilterPills() {
    const container = document.getElementById('showcase-filters');
    if (!container) return;

    const seen = new Map(); // slug -> display label (first-seen casing wins)
    SHOWCASE_ITEMS.forEach((item) => {
      item.category.forEach((label) => {
        const slug = slugifyCategory(label);
        if (slug && !seen.has(slug)) seen.set(slug, label);
      });
    });

    const pillsHtml = Array.from(seen.entries())
      .map(([slug, label]) => `<button type="button" class="filter-pill" data-filter="${slug}">${label}</button>`)
      .join('');

    container.innerHTML = `<button type="button" class="filter-pill is-active" data-filter="all">All Looks</button>${pillsHtml}`;
  }

  async function loadShowcase() {
    const grid = document.getElementById('showcase-grid');
    try {
      const res = await fetch('/api/items');
      if (!res.ok) throw new Error('Failed to load catalog');
      SHOWCASE_ITEMS = await res.json();
    } catch (err) {
      if (grid) {
        grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:rgba(0,0,0,0.6); padding:48px 0;">Unable to load the showcase right now. Please refresh the page.</p>`;
      }
      return;
    }

    renderShowcaseGrid();
    renderFilterPills();
    initSlideshows();
    initFilterPills();
    syncWishlistUI();
  }

  // Initialize state
  loadShowcase();
})();
