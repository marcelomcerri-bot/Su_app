import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import type { AlertLevel } from '@/lib/alerts';

interface Props {
  level: AlertLevel;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export function AlertBadge({ level, size = 'md', showLabel = false }: Props) {
  const colors = useColors();
  const dotSize = size === 'sm' ? 10 : 13;

  const dotColor =
    level === 'red' ? colors.destructive
    : level === 'yellow' ? colors.warning
    : colors.success;

  const label =
    level === 'red' ? 'Crítico'
    : level === 'yellow' ? 'Atrasado'
    : 'Regular';

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: dotColor }]} />
      {showLabel && (
        <Text style={[styles.label, { color: dotColor }]}>{label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: {},
  label: { fontSize: 12, fontWeight: '600' },
});
