export const getApiBaseUrl = () => {
  if (__DEV__) {
    // Development environment
    return 'http://10.118.93.168:3000';
  } else {
    // Production environment
    return 'http://10.118.93.168:3000';
  }
};

export default getApiBaseUrl
