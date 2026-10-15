const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const db = require('./db');
const { requireAuth } = require('./auth');

const router = express.Router();

// See server/db.js for DATA_DIR — keeps uploaded images on the same persistent
// disk as the database in production, while defaulting to the repo locally.
const uploadsDir = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, '..', 'assets', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 6 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

function rowToItem(row) {
  return { ...row, category: JSON.parse(row.category), images: JSON.parse(row.images) };
}

// Admin sends categories as free-text, comma-separated (e.g. "Men's, Streetwear, Formal Wear").
// Clean, dedupe (case-insensitively) and store as a JSON array of labels.
function parseCategoryLabels(raw) {
  if (!raw) return [];
  const seen = new Set();
  const labels = [];
  for (const part of raw.split(',')) {
    const label = part.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }
  return labels;
}

async function saveImages(files) {
  const saved = [];
  for (const file of files) {
    const filename = `${crypto.randomUUID()}.webp`;
    const outPath = path.join(uploadsDir, filename);
    await sharp(file.buffer)
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toFile(outPath);
    saved.push(`assets/uploads/${filename}`);
  }
  return saved;
}

function deleteImageFiles(images) {
  for (const imagePath of images) {
    if (!imagePath.startsWith('assets/uploads/')) continue; // never delete seeded catalog images
    const absPath = path.join(__dirname, '..', imagePath);
    fs.unlink(absPath, () => {});
  }
}

// GET /api/items — public
router.get('/items', (req, res) => {
  const rows = db.prepare('SELECT * FROM items ORDER BY created_at ASC').all();
  res.json(rows.map(rowToItem));
});

// POST /api/admin/items — protected
router.post('/admin/items', requireAuth, upload.array('images', 6), async (req, res) => {
  try {
    const { title, badge, category, description, fit, fabric, availability } = req.body;
    const categoryLabels = parseCategoryLabels(category);
    if (!title || categoryLabels.length === 0) {
      return res.status(400).json({ error: 'Title and at least one category are required' });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'At least one image is required' });
    }

    const images = await saveImages(req.files);
    const id = `sz-${crypto.randomUUID()}`;

    db.prepare(`
      INSERT INTO items (id, title, badge, category, description, fit, fabric, availability, images)
      VALUES (@id, @title, @badge, @category, @description, @fit, @fabric, @availability, @images)
    `).run({
      id,
      title,
      badge: badge || '',
      category: JSON.stringify(categoryLabels),
      description: description || '',
      fit: fit || '',
      fabric: fabric || '',
      availability: availability || 'In-Store Showcase — Villianur Showroom',
      images: JSON.stringify(images),
    });

    const row = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    res.status(201).json(rowToItem(row));
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create item' });
  }
});

// PUT /api/admin/items/:id — protected
router.put('/admin/items/:id', requireAuth, upload.array('images', 6), async (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Item not found' });

    const { title, badge, category, description, fit, fabric, availability } = req.body;
    const categoryLabels = category !== undefined ? parseCategoryLabels(category) : null;
    if (categoryLabels !== null && categoryLabels.length === 0) {
      return res.status(400).json({ error: 'At least one category is required' });
    }

    let images = JSON.parse(existing.images);

    // Remove any images the owner explicitly marked for deletion
    if (req.body.removeImages) {
      const toRemove = JSON.parse(req.body.removeImages);
      if (toRemove.length > 0) {
        deleteImageFiles(toRemove);
        images = images.filter((img) => !toRemove.includes(img));
      }
    }

    // New uploads are added alongside whatever images remain, not a full replace
    if (req.files && req.files.length > 0) {
      if (images.length + req.files.length > 6) {
        return res.status(400).json({ error: 'An item can have at most 6 photos' });
      }
      const newImages = await saveImages(req.files);
      images = images.concat(newImages);
    }

    if (images.length === 0) {
      return res.status(400).json({ error: 'An item must have at least one photo' });
    }

    db.prepare(`
      UPDATE items SET
        title = @title, badge = @badge, category = @category, description = @description,
        fit = @fit, fabric = @fabric, availability = @availability, images = @images
      WHERE id = @id
    `).run({
      id: req.params.id,
      title: title ?? existing.title,
      badge: badge ?? existing.badge,
      category: categoryLabels !== null ? JSON.stringify(categoryLabels) : existing.category,
      description: description ?? existing.description,
      fit: fit ?? existing.fit,
      fabric: fabric ?? existing.fabric,
      availability: availability ?? existing.availability,
      images: JSON.stringify(images),
    });

    const row = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
    res.json(rowToItem(row));
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update item' });
  }
});

// DELETE /api/admin/items/:id — protected
router.delete('/admin/items/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  deleteImageFiles(JSON.parse(existing.images));
  db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

module.exports = router;
module.exports.uploadsDir = uploadsDir;
