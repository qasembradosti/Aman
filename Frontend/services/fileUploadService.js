import api from './apiService';

class FileUploadService {
  // Upload single image
  async uploadImage(file) {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri || file.path,
      type: file.type || 'image/jpeg',
      name: file.name || `image_${Date.now()}.jpg`
    });

    try {
      const response = await api.post('/api/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Image upload failed');
    }
  }

  // Upload multiple images
  async uploadImages(files) {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append('files', {
        uri: file.uri || file.path,
        type: file.type || 'image/jpeg',
        name: file.name || `image_${Date.now()}_${index}.jpg`
      });
    });

    try {
      const response = await api.post('/api/upload/images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Images upload failed');
    }
  }

  // Upload document
  async uploadDocument(file) {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri || file.path,
      type: file.type || 'application/pdf',
      name: file.name || `document_${Date.now()}.pdf`
    });

    try {
      const response = await api.post('/api/upload/document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Document upload failed');
    }
  }

  // Upload avatar
  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri || file.path,
      type: file.type || 'image/jpeg',
      name: file.name || `avatar_${Date.now()}.jpg`
    });

    try {
      const response = await api.post('/api/upload/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Avatar upload failed');
    }
  }
}

export default new FileUploadService();
