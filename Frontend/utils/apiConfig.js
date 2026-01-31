export const getApiBaseUrl = () => {
  if (__DEV__) {
    // Development environment
    return 'https://backend.aman-store.com';
  } else {
    // Production environment
    return 'https://backend.aman-store.com';
  }
};

export default getApiBaseUrl
