import React, { forwardRef } from 'react';
import { TextInput } from 'react-native';
import { useLanguage } from '../../utils/LanguageContext';
import { useTheme } from '../../utils/ThemeContext';

const Input = forwardRef(({ style, placeholderTextColor, textAlign, ...props }, ref) => {
  const { fontFamily, isRTL } = useLanguage();
  const { theme } = useTheme();
  const fontFamilyName = fontFamily?.regular;

  return (
    <TextInput
      ref={ref}
      style={[
        fontFamilyName ? { fontFamily: fontFamilyName } : null,
        { textAlign: textAlign ?? (isRTL ? 'right' : 'left') },
        style,
      ]}
      placeholderTextColor={placeholderTextColor ?? theme.colors.textSecondary}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export default Input;
