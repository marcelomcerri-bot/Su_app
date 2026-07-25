import React from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { computeAlertLevel } from '@/lib/alerts';
import { AlertBadge } from '@/components/AlertBadge';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

function StatCard({
  label, value, color, icon,
}: { label: string; value: number; color: string; icon: keyof typeof Ionicons.glyphMap }) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '1A' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const { user, logout } = useAuth();
  const { patients, stats, isLoading, refresh } = useData();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const alertPatients = patients
    .filter(p => p.patientStatus === 'ativo')
    .map(p => ({ ...p, alertLevel: computeAlertLevel(p) }))
    .filter(p => p.alertLevel !== 'none')
    .sort((a, b) => (a.alertLevel === 'red' ? -1 : 1));

  const topPad = Platform.OS === 'web' ? 67 : 0;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad, paddingBottom: insets.bottom + 100 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.sidebar }]}>
        <View>
          <Text style={styles.greeting}>Olá, {user?.username}</Text>
          <Text style={styles.headerSub}>Monitoramento de Tabagistas</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn} hitSlop={8}>
          <Ionicons name="log-out-outline" size={22} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Stats grid */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>RESUMO</Text>
        <View style={styles.statsGrid}>
          <StatCard label="Ativos" value={stats.totalActive} color={colors.primary} icon="people" />
          <StatCard label="Críticos" value={stats.redAlert} color={colors.destructive} icon="warning" />
          <StatCard label="Atrasados" value={stats.yellowAlert} color={colors.warning} icon="time" />
          <StatCard label="Regulares" value={stats.noAlert} color={colors.success} icon="checkmark-circle" />
        </View>

        {/* Alerts list */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginTop: 20 }]}>
          ALERTAS ATIVOS
        </Text>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : alertPatients.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
            <Ionicons name="checkmark-circle" size={32} color={colors.success} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nenhum alerta pendente</Text>
          </View>
        ) : (
          alertPatients.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[styles.alertRow, { backgroundColor: colors.card, borderRadius: colors.radius }]}
              onPress={() => router.push(`/paciente/${p.id}`)}
              activeOpacity={0.7}
            >
              <AlertBadge level={p.alertLevel} size="md" />
              <View style={styles.alertInfo}>
                <Text style={[styles.alertName, { color: colors.foreground }]} numberOfLines={1}>
                  {p.identification}
                </Text>
                <Text style={[styles.alertMeta, { color: colors.mutedForeground }]}>
                  {p.teamName} · {p.microarea}
                </Text>
              </View>
              <AlertBadge level={p.alertLevel} showLabel size="sm" />
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 20, paddingTop: 24,
  },
  greeting: { fontSize: 18, fontWeight: '700', color: '#fff', fontFamily: 'Inter_700Bold' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2, fontFamily: 'Inter_400Regular' },
  logoutBtn: { padding: 4 },
  content: { padding: 16 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.8,
    marginBottom: 10, fontFamily: 'Inter_700Bold',
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '47%', padding: 16, gap: 6,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 28, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  alertRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  alertInfo: { flex: 1 },
  alertName: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  alertMeta: { fontSize: 12, marginTop: 2, fontFamily: 'Inter_400Regular' },
  empty: { alignItems: 'center', padding: 32, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
});
