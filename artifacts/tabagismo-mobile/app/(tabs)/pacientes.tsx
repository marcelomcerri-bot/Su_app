import React, { useMemo, useState } from 'react';
import {
  FlatList, Platform, RefreshControl, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useData } from '@/context/DataContext';
import { computeAlertLevel } from '@/lib/alerts';
import { AlertBadge } from '@/components/AlertBadge';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Filter = 'todos' | 'red' | 'yellow' | 'none';

export default function PacientesScreen() {
  const colors = useColors();
  const { patients, isLoading, refresh } = useData();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [showInactive, setShowInactive] = useState(false);

  const filtered = useMemo(() => {
    return patients
      .filter(p => showInactive || p.patientStatus === 'ativo')
      .filter(p => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          p.identification.toLowerCase().includes(q) ||
          p.microarea.toLowerCase().includes(q) ||
          p.teamName.toLowerCase().includes(q)
        );
      })
      .map(p => ({ ...p, alertLevel: computeAlertLevel(p) }))
      .filter(p => filter === 'todos' || p.alertLevel === filter)
      .sort((a, b) => {
        const order = { red: 0, yellow: 1, none: 2 };
        return order[a.alertLevel] - order[b.alertLevel];
      });
  }, [patients, search, filter, showInactive]);

  const topPad = Platform.OS === 'web' ? 67 : 0;

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'red', label: 'Críticos' },
    { key: 'yellow', label: 'Atrasados' },
    { key: 'none', label: 'Regulares' },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
          <Ionicons name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Buscar por nome, microárea…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filters */}
        <View style={styles.filters}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                styles.filterBtn,
                {
                  backgroundColor: filter === f.key ? colors.primary : colors.muted,
                  borderRadius: 20,
                },
              ]}
            >
              <Text style={[
                styles.filterLabel,
                { color: filter === f.key ? '#fff' : colors.mutedForeground },
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => setShowInactive(v => !v)}
            style={[
              styles.filterBtn,
              { backgroundColor: showInactive ? colors.foreground : colors.muted, borderRadius: 20 },
            ]}
          >
            <Text style={[styles.filterLabel, { color: showInactive ? '#fff' : colors.mutedForeground }]}>
              Inativos
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {search ? 'Nenhum resultado encontrado' : 'Nenhum paciente cadastrado'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, { backgroundColor: colors.card, borderRadius: colors.radius }]}
            onPress={() => router.push(`/paciente/${item.id}`)}
            activeOpacity={0.7}
          >
            <AlertBadge level={item.alertLevel} size="md" />
            <View style={styles.rowInfo}>
              <Text style={[styles.rowName, { color: colors.foreground }]} numberOfLines={1}>
                {item.identification}
              </Text>
              <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>
                {item.teamName} · {item.microarea} · {item.age} anos
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 80 }]}
        onPress={() => router.push('/paciente/novo')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, gap: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 40, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  filters: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 5 },
  filterLabel: { fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  row: {
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  rowMeta: { fontSize: 12, marginTop: 2, fontFamily: 'Inter_400Regular' },
  empty: { alignItems: 'center', gap: 10, paddingTop: 60 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  fab: {
    position: 'absolute', right: 20,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, elevation: 8,
  },
});
