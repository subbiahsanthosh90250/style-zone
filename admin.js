(function () {
  'use strict';

  const loginScreen = document.getElementById('login-screen');
  const dashboard = document.getElementById('dashboard');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logout-btn');

  const itemForm = document.getElementById('item-form');
  const itemIdInput = document.getElementById('item-id');
  const formHeading = document.getElementById('form-heading');
  const formSubmitBtn = document.getElementById('form-submit-btn');
  const formCancelBtn = document.getElementById('form-cancel-btn');
  const formError = document.getElementById('form-error');
  const itemList = document.getElementById('item-list');
  const imagesInput = document.getElementById('item-images');
  const imagesHint = document.getElementById('images-hint');
  const imagePreviewRow = document.getElementById('image-preview-row');
  const existingImagesBlock = document.getElementById('existing-images-block');
  const existingImagesRow = document.getElementById('existing-images-row');

  let catalog = [];
  let remainingExistingImages = [];
  let removedExistingImages = [];
  let pendingNewFiles = [];

  function showDashboard(show) {
    loginScreen.hidden = show;
    dashboard.hidden = !show;
  }

  async function checkSession() {
    const res = await fetch('/api/admin/session');
    const data = await res.json();
    showDashboard(data.authenticated);
    if (data.authenticated) loadCatalog();
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.hidden = true;
    const password = document.getElementById('login-password').value;

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      loginError.textContent = data.error || 'Login failed';
      loginError.hidden = false;
      return;
    }

    document.getElementById('login-password').value = '';
    showDashboard(true);
    loadCatalog();
  });

  logoutBtn.addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    showDashboard(false);
  });

  async function loadCatalog() {
    const res = await fetch('/api/items');
    catalog = await res.json();
    renderItemList();
    renderCategoryDatalist();
  }

  function renderCategoryDatalist() {
    const datalist = document.getElementById('existing-categories');
    const seen = new Set();
    const options = [];
    catalog.forEach((item) => {
      item.category.forEach((label) => {
        const key = label.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        options.push(label);
      });
    });
    datalist.innerHTML = options.map((label) => `<option value="${label}"></option>`).join('');
  }

  function renderItemList() {
    if (catalog.length === 0) {
      itemList.innerHTML = '<p style="color:rgba(0,0,0,0.6); font-size:0.875rem;">No items yet. Add your first piece using the form.</p>';
      return;
    }

    itemList.innerHTML = catalog
      .map(
        (item) => `
        <div class="item-row">
          <img src="/${item.images[0]}" alt="${item.title}">
          <div class="item-row__info">
            <p class="item-row__title">${item.title}</p>
            <p class="item-row__meta">${item.badge || ''} &bull; ${item.category.join(', ')}</p>
          </div>
          <div class="item-row__actions">
            <button type="button" data-edit="${item.id}">Edit</button>
            <button type="button" class="danger" data-delete="${item.id}">Delete</button>
          </div>
        </div>
      `
      )
      .join('');
  }

  itemList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) {
      startEdit(editBtn.getAttribute('data-edit'));
      return;
    }
    const deleteBtn = e.target.closest('[data-delete]');
    if (deleteBtn) {
      deleteItem(deleteBtn.getAttribute('data-delete'));
    }
  });

  function startEdit(id) {
    const item = catalog.find((i) => i.id === id);
    if (!item) return;

    itemIdInput.value = item.id;
    itemForm.title.value = item.title;
    itemForm.badge.value = item.badge || '';
    itemForm.description.value = item.description || '';
    itemForm.fit.value = item.fit || '';
    itemForm.fabric.value = item.fabric || '';
    itemForm.availability.value = item.availability || '';

    itemForm.category.value = (item.category || []).join(', ');

    imagesInput.value = '';
    pendingNewFiles = [];
    imagePreviewRow.innerHTML = '';
    remainingExistingImages = [...item.images];
    removedExistingImages = [];
    existingImagesBlock.hidden = false;
    renderExistingImages();

    formHeading.textContent = 'Edit Item';
    formSubmitBtn.textContent = 'Save Changes';
    formCancelBtn.hidden = false;
    formError.hidden = true;
    itemForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderExistingImages() {
    existingImagesRow.innerHTML = remainingExistingImages
      .map(
        (src) => `
        <button type="button" class="removable-thumb" data-remove-existing="${src}" title="Remove this photo">
          <img src="/${src}" alt="">
          <span class="removable-thumb__x">&times;</span>
        </button>
      `
      )
      .join('');
  }

  existingImagesRow.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-existing]');
    if (!btn) return;
    const src = btn.getAttribute('data-remove-existing');
    remainingExistingImages = remainingExistingImages.filter((img) => img !== src);
    removedExistingImages.push(src);
    renderExistingImages();
  });

  function resetForm() {
    itemForm.reset();
    itemIdInput.value = '';
    itemForm.availability.value = 'In-Store Showcase — Villianur Showroom';
    pendingNewFiles = [];
    imagePreviewRow.innerHTML = '';
    existingImagesRow.innerHTML = '';
    existingImagesBlock.hidden = true;
    remainingExistingImages = [];
    removedExistingImages = [];
    formHeading.textContent = 'Add New Item';
    formSubmitBtn.textContent = 'Add Item';
    formCancelBtn.hidden = true;
    formError.hidden = true;
  }

  formCancelBtn.addEventListener('click', resetForm);

  function renderNewImagePreviews() {
    imagePreviewRow.innerHTML = pendingNewFiles
      .map(
        (file, idx) => `
        <button type="button" class="removable-thumb" data-remove-pending="${idx}" title="Remove this photo">
          <img src="${URL.createObjectURL(file)}" alt="">
          <span class="removable-thumb__x">&times;</span>
        </button>
      `
      )
      .join('');
  }

  // Each "Choose files" click ADDS to the pending list rather than replacing it —
  // the native picker's multi-select (Cmd/Shift-click) isn't reliable for every user,
  // so clicking "Choose files" repeatedly, one photo at a time, works just as well.
  imagesInput.addEventListener('change', () => {
    const newFiles = Array.from(imagesInput.files || []);
    pendingNewFiles = pendingNewFiles.concat(newFiles);
    imagesInput.value = '';
    renderNewImagePreviews();
  });

  imagePreviewRow.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-pending]');
    if (!btn) return;
    const idx = Number(btn.getAttribute('data-remove-pending'));
    pendingNewFiles.splice(idx, 1);
    renderNewImagePreviews();
  });

  itemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.hidden = true;

    const categories = itemForm.category.value.split(',').map((c) => c.trim()).filter(Boolean);
    if (categories.length === 0) {
      formError.textContent = 'Enter at least one category.';
      formError.hidden = false;
      return;
    }

    const id = itemIdInput.value;
    const formData = new FormData();
    formData.set('title', itemForm.title.value);
    formData.set('badge', itemForm.badge.value);
    formData.set('category', categories.join(', '));
    formData.set('description', itemForm.description.value);
    formData.set('fit', itemForm.fit.value);
    formData.set('fabric', itemForm.fabric.value);
    formData.set('availability', itemForm.availability.value);
    const newFileCount = pendingNewFiles.length;
    pendingNewFiles.forEach((file) => formData.append('images', file));
    if (id) {
      formData.set('removeImages', JSON.stringify(removedExistingImages));
    }

    const totalPhotos = id ? remainingExistingImages.length + newFileCount : newFileCount;
    if (totalPhotos === 0) {
      formError.textContent = 'At least one photo is required.';
      formError.hidden = false;
      return;
    }
    if (totalPhotos > 6) {
      formError.textContent = 'An item can have at most 6 photos.';
      formError.hidden = false;
      return;
    }

    formSubmitBtn.disabled = true;
    try {
      const res = await fetch(id ? `/api/admin/items/${id}` : '/api/admin/items', {
        method: id ? 'PUT' : 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      resetForm();
      await loadCatalog();
    } catch (err) {
      formError.textContent = err.message;
      formError.hidden = false;
    } finally {
      formSubmitBtn.disabled = false;
    }
  });

  async function deleteItem(id) {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    const res = await fetch(`/api/admin/items/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadCatalog();
    }
  }

  checkSession();
})();
