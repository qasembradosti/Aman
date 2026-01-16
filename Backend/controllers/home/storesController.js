import Store from '../../models/store.js';

export const listStores = async (req, res) => {
  try {
    console.log('Fetching stores with filters:', req.query);
    const result = await Store.findAll(req.query);
    console.log('Stores fetched successfully:', result.data?.length, 'stores');
    res.json(result);
  } catch (err) {
    console.error('Error in listStores:', err);
    res.status(500).json({ message: 'Failed to list stores', error: err.message });
  }
};

export const getStore = async (req, res) => {
  try {
    const { id } = req.params;
    const store = await Store.findById(id);
    
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }
    
    res.json(store);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get store', error: err.message });
  }
};

export const createStore = async (req, res) => {
  try {
    console.log('=== CREATE STORE REQUEST ===');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('User:', req.user);
    
    const store = await Store.create(req.body);
    console.log('Store created successfully:', store);
    res.status(201).json(store);
  } catch (err) {
    console.error('Store creation error:', err);
    if (err.message === 'name is required') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Failed to create store', error: err.message });
  }
};

export const updateStore = async (req, res) => {
  try {
    const { id } = req.params;
    const store = await Store.update(id, req.body);
    
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }
    
    res.json(store);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update store', error: err.message });
  }
};

export const deleteStore = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Store.delete(id);
    
    if (!deleted) {
      return res.status(404).json({ message: 'Store not found' });
    }
    
    res.json({ success: true, message: 'Store deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete store', error: err.message });
  }
};
