export const getApiBaseUrl = () => {
  if (__DEV__) {
    // Development environment
    return 'http://172.23.80.168:3000';
  } else {
    // Production environment
    return 'https://backend.aman-store.com';
  }
};

export default getApiBaseUrl
