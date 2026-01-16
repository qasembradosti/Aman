import React from "react";
import { Modal, View, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../utils/ThemeContext";
import { Text } from "./Text";

export default function Dialog({
  visible,
  onClose,
  title,
  children,
  footer,
  presentation = "bottom",
}) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const isCenter = presentation === "center";

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isCenter ? "fade" : "slide"}
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.overlay, isCenter && styles.overlayCenter]}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.container,
            !isCenter ? styles.bottomSheet : styles.centerCard,
            !isCenter ? { paddingBottom: insets.bottom + 16 } : null,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {!isCenter && (
            <View style={styles.handleWrap}>
              <View
                style={[
                  styles.handle,
                  { backgroundColor: isDark ? "#555" : "#ddd" },
                ]}
              />
            </View>
          )}

          {title ? (
            <View
              style={[
                styles.header,
                { borderBottomColor: theme.colors.border },
              ]}
            >
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {title}
              </Text>
            </View>
          ) : null}

          <View style={styles.content}>{children}</View>

          {footer ? (
            <View
              style={[styles.footer, { borderTopColor: theme.colors.border }]}
            >
              {footer}
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  overlayCenter: {
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: -2 },
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  bottomSheet: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  centerCard: {
    margin: 24,
    borderRadius: 16,
    alignSelf: "center",
    justifyContent: "center",
    width: "90%",
    maxWidth: 420,
  },
  handleWrap: { alignItems: "center", paddingVertical: 8 },
  handle: { width: 44, height: 4, borderRadius: 2 },
  header: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
  },
  content: { paddingHorizontal: 16, paddingVertical: 12 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 12,
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
});
