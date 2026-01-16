import Category from '../../models/category.js';

export const listCategories = async (req, res) => {
  try {
    const result = await Category.findAll(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to list categories', error: err.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (err) {
    if (err.message === 'name is required') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Failed to create category', error: err.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.update(id, req.body);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update category', error: err.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Category.delete(id);
    
    if (!deleted) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete category', error: err.message });
  }
};
