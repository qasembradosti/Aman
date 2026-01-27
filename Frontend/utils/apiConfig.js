export const getApiBaseUrl = () => {
  if (__DEV__) {
    // Development environment
    return 'http://10.225.64.168:3000';
  } else {
    // Production environment
    return 'https://backend.aman-store.com';
  }
};

export default getApiBaseUrl
