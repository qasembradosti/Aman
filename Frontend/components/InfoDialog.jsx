import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Dialog from './ui/Dialog';
import { Text } from './ui/Text';
import { useTheme } from '../utils/ThemeContext';

export default function InfoDialog({ visible, title, message, okText = 'OK', onClose }) {
  const { theme } = useTheme();

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={title}
      presentation="center"
      footer={
        <View style={styles.footerRow}>
          <TouchableOpacity onPress={onClose} style={[styles.btn, { backgroundColor: theme.colors.primary }]}>
            <Text style={{ color: '#fff' }}>{okText}</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <Text style={{ color: theme.colors.text }}>{message}</Text>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  footerRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
});
