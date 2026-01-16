// Font configuration for different languages
export const getFontFamily = (locale) => {
  switch (locale) {
    case 'ku': // Kurdish
      return {
        regular: 'Kurdish-Regular',
      };
    case 'ar': // Arabic - you can add custom Arabic font too
      return {
        regular: 'Kurdish-Regular', // Uses same Kurdish font for Arabic
      };
    case 'en':
    default:
      return {
        regular: undefined, // undefined will use system font
      };
  }
};

// Helper to get text style with proper font
export const getTextStyle = (locale, style = {}) => {
  const fonts = getFontFamily(locale);

  return {
    ...style,
    fontFamily: fonts.regular,
  };
};
