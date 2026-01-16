import React, { forwardRef } from 'react';
import { TextInput } from 'react-native';
import { useLanguage } from '../../utils/LanguageContext';
import { useTheme } from '../../utils/ThemeContext';

const Input = forwardRef(({ style, placeholderTextColor, textAlign, ...props }, ref) => {
  let fontFamilyName;
  try {
    const { fontFamily, isRTL } = useLanguage();
    const { theme } = useTheme();
    fontFamilyName = fontFamily?.regular;

    return (
      <TextInput
        ref={ref}
        style={[fontFamilyName ? { fontFamily: fontFamilyName } : null, { textAlign: textAlign ?? (isRTL ? 'right' : 'left') }, style]}
        placeholderTextColor={placeholderTextColor ?? theme.colors.textSecondary}
        {...props}
      />
    );
  } catch (_e) {
    // Fallback without context
    return (
      <TextInput
        ref={ref}
        style={[style]}
        placeholderTextColor={placeholderTextColor}
        {...props}
      />
    );
  }
});

export default Input;
