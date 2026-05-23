import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Dialog from './Dialog';
import { Text } from './Text';
import { useTheme } from '../../utils/ThemeContext';

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonColor,
  onConfirm,
  onCancel,
}) {
  const { theme } = useTheme();
  const resolvedConfirmButtonColor = confirmButtonColor || theme.colors.primary;

  return (
    <Dialog
      visible={visible}
      onClose={onCancel}
      title={title}
      presentation="center"
      footer={
        <View style={styles.footerRow}>
          <TouchableOpacity onPress={onCancel} style={[styles.btn, { borderColor: theme.colors.border }]}>
            <Text style={{ color: theme.colors.text }}>{cancelText}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onConfirm} style={[styles.btn, { backgroundColor: resolvedConfirmButtonColor }]}>
            <Text style={{ color: '#fff' }}>{confirmText}</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <Text style={{ color: theme.colors.text }}>{message}</Text>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  footerRow: { flexDirection: 'row', gap: 8 },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
