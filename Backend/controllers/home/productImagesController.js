import Product from '../../models/product.js';
import ProductImage from '../../models/productImage.js';
import path from 'path';
import { fileURLToPath } from 'url';

const getBaseUrl = (req) => {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = forwardedProto ? forwardedProto.split(',')[0].trim() : req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
};

const toImageUrl = (baseUrl, imagePath) => {
  if (!imagePath) return null;
  if (String(imagePath).startsWith('http')) return imagePath;
  if (String(imagePath).startsWith('/')) return `${baseUrl}${imagePath}`;
  return `${baseUrl}/images/products/${imagePath}`;
};

export const uploadProductImages = async (req, res) => {
  try {
    const { id } = req.params; // product id
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    const baseUrl = getBaseUrl(req);
    const persisted = [];
    const existing = await ProductImage.listByProduct(product.id);
    const hasMain = existing.some(img => img.is_main);
    for (const [idx, f] of req.files.entries()) {
      // If no main image exists yet, first of this batch becomes main
      const rec = await ProductImage.add(product.id, f.filename, { isMain: !hasMain && idx === 0 });
      const url = toImageUrl(baseUrl, rec.image_url);
      persisted.push({ id: rec.id, filename: rec.image_url, url, image_url: url, is_main: !!rec.is_main });
    }
    res.status(201).json({ images: persisted });
  } catch (err) {
    res.status(500).json({ message: 'Failed to upload images', error: err.message });
  }
};

export const listProductImages = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const baseUrl = getBaseUrl(req);
    const rows = await ProductImage.listByProduct(id);
    const images = rows.map(r => {
      const url = toImageUrl(baseUrl, r.image_url);
      return { id: r.id, filename: r.image_url, url, image_url: url, is_main: !!r.is_main };
    });
    res.json({ images });
  } catch (err) {
    res.status(500).json({ message: 'Failed to list images', error: err.message });
  }
};
