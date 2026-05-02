import React from 'react';
import { Text as RNText } from 'react-native';
import { useLanguage } from '../../utils/LanguageContext';

// Custom Text that respects language fonts but never crashes when provider is missing
export const Text = ({ style, children, ...props }) => {
  const { fontFamily } = useLanguage();
  const fontFamilyName = fontFamily?.regular;

  const textStyle = [
    fontFamilyName ? { fontFamily: fontFamilyName } : null,
    style,
  ];

  return (
    <RNText style={textStyle} {...props}>
      {children}
    </RNText>
  );
};

export default Text;
