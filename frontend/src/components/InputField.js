import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

export default function InputField({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  icon,
  rightIcon,
  onRightIconPress,
  keyboardType,
  editable = true,
  onPress,
}) {
  const InputWrapper = onPress ? TouchableOpacity : View;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <InputWrapper
        style={styles.inputWrapper}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        {icon && (
          <Ionicons name={icon} size={18} color={colors.textMuted} style={styles.leftIcon} />
        )}
        {onPress ? (
          <Text style={[styles.input, !value && styles.placeholder]}>
            {value || placeholder}
          </Text>
        ) : (
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            editable={editable}
          />
        )}
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} disabled={!onRightIconPress}>
            <Ionicons name={rightIcon} size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </InputWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    padding: 0,
  },
  placeholder: {
    color: colors.textMuted,
  },
});
