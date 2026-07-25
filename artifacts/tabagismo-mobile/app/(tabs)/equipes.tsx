import React, { useState } from 'react';
import {
  Alert, FlatList, Modal, Platform, RefreshControl,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { DBTeam } from '@/lib/database';

export default function EquipesScreen() {
  const colors = useColors();
  const { isAdmin } = useAuth();
  const { teams, isLoading, refresh, addTeam, editTeam, deleteTeam } = useData();
  const insets = useSafeAreaInsets();

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<DBTeam | null>(null);
  const [teamName, setTeamName] = useState('');
  const [saving, setSaving] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : 0;

  function openAdd() {
    setEditing(null);
    setTeamName('');
    setModalVisible(true);
  }

  function openEdit(team: DBTeam) {
    setEditing(team);
    setTeamName(team.name);
    setModalVisible(true);
  }

  async function handleSave() {
    if (!teamName.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await editTeam(editing.id, teamName.trim());
      } else {
        await addTeam(teamName.trim());
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalVisible(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(team: DBTeam) {
    if (team.patientCount > 0) {
      const otherTeams = teams.filter(t => t.id !== team.id);
      if (otherTeams.length === 0) {
        Alert.alert('Atenção', 'Não é possível excluir a única equipe com pacientes.');
        return;
      }
      Alert.alert(
        'Transferir Pacientes',
        `A equipe "${team.name}" tem ${team.patientCount} paciente(s). Selecione a equipe destino antes de excluir.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          ...otherTeams.map(t => ({
            text: t.name,
            onPress: async () => {
              await deleteTeam(team.id, t.id);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          })),
        ]
      );
    } else {
      Alert.alert('Excluir Equipe', `Excluir "${team.name}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive',
          onPress: async () => {
            await deleteTeam(team.id);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <FlatList
        data={teams}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="business-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nenhuma equipe cadastrada</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
            <View style={[styles.teamIcon, { backgroundColor: colors.accent }]}>
              <Ionicons name="people" size={20} color={colors.primary} />
            </View>
            <View style={styles.teamInfo}>
              <Text style={[styles.teamName, { color: colors.foreground }]}>{item.name}</Text>
              <Text style={[styles.teamMeta, { color: colors.mutedForeground }]}>
                {item.patientCount} paciente{item.patientCount !== 1 ? 's' : ''}
              </Text>
            </View>
            {isAdmin && (
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => openEdit(item)} hitSlop={8}>
                  <Ionicons name="pencil-outline" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />

      {isAdmin && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 80 }]}
          onPress={openAdd}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderRadius: colors.radius + 4 }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editing ? 'Editar Equipe' : 'Nova Equipe'}
            </Text>
            <TextInput
              style={[styles.modalInput, {
                color: colors.foreground, borderColor: colors.border,
                backgroundColor: colors.background, borderRadius: colors.radius,
              }]}
              placeholder="Nome da equipe"
              placeholderTextColor={colors.mutedForeground}
              value={teamName}
              onChangeText={setTeamName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.muted, borderRadius: colors.radius }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.mutedForeground }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                onPress={handleSave}
                disabled={saving || !teamName.trim()}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  teamIcon: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  teamMeta: { fontSize: 12, marginTop: 2, fontFamily: 'Inter_400Regular' },
  actions: { flexDirection: 'row', gap: 14 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 60 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  fab: {
    position: 'absolute', right: 20,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, elevation: 8,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { margin: 16, padding: 24, gap: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  modalInput: { height: 46, borderWidth: 1, paddingHorizontal: 12, fontSize: 15, fontFamily: 'Inter_400Regular' },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});
