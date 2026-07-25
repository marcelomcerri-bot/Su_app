import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, StyleSheet, Switch,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useData } from '@/context/DataContext';
import type { Diagnosis, PatientStatus, Sex, SmokingStatus } from '@/lib/database';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {children}
    </View>
  );
}

function RadioGroup<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const colors = useColors();
  return (
    <View style={styles.radioGroup}>
      {options.map(o => (
        <TouchableOpacity
          key={o.value}
          style={[styles.radioBtn, {
            borderColor: value === o.value ? colors.primary : colors.border,
            backgroundColor: value === o.value ? colors.accent : colors.background,
            borderRadius: colors.radius - 2,
          }]}
          onPress={() => onChange(o.value)}
        >
          <Text style={[styles.radioLabel, { color: value === o.value ? colors.primary : colors.mutedForeground }]}>
            {o.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function NovoPacienteScreen() {
  const colors = useColors();
  const { teams, addPatient } = useData();
  const router = useRouter();

  const today = new Date().toISOString().split('T')[0];

  const [identification, setIdentification] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<Sex>('masculino');
  const [teamId, setTeamId] = useState(teams[0]?.id ?? 0);
  const [microarea, setMicroarea] = useState('');
  const [smokingStatus, setSmokingStatus] = useState<SmokingStatus>('ativo');
  const [hasOralLesion, setHasOralLesion] = useState(false);
  const [lesionType, setLesionType] = useState('');
  const [diagnosis, setDiagnosis] = useState<Diagnosis>('nenhum');
  const [lastEvalDate, setLastEvalDate] = useState('');
  const [registrationDate, setRegistrationDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [patientStatus, setPatientStatus] = useState<PatientStatus>('ativo');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!identification.trim() || !age || !microarea.trim() || !teamId || !registrationDate) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      await addPatient({
        identification: identification.trim(),
        age: Number(age),
        sex, teamId, microarea: microarea.trim(), smokingStatus,
        hasOralLesion, lesionType: lesionType.trim() || null,
        diagnosis, lastEvaluationDate: lastEvalDate.trim() || null,
        registrationDate, notes: notes.trim() || null, patientStatus,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 60 }}
      bottomOffset={20}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ padding: 16, gap: 14 }}>
        <Field label="Identificação *">
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius }]}
            value={identification} onChangeText={setIdentification}
            placeholder="Ex.: JDS/1985/MA" placeholderTextColor={colors.mutedForeground}
          />
        </Field>

        <Field label="Idade *">
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius }]}
            value={age} onChangeText={setAge} keyboardType="number-pad"
            placeholder="Ex.: 55" placeholderTextColor={colors.mutedForeground}
          />
        </Field>

        <Field label="Sexo *">
          <RadioGroup<Sex>
            options={[{ value: 'masculino', label: 'Masculino' }, { value: 'feminino', label: 'Feminino' }]}
            value={sex} onChange={setSex}
          />
        </Field>

        <Field label="Equipe *">
          {teams.length === 0
            ? <Text style={{ color: colors.destructive, fontSize: 13 }}>Nenhuma equipe cadastrada. Crie uma equipe primeiro.</Text>
            : (
              <View style={styles.radioGroup}>
                {teams.map(t => (
                  <TouchableOpacity key={t.id}
                    style={[styles.radioBtn, { borderColor: teamId === t.id ? colors.primary : colors.border, backgroundColor: teamId === t.id ? colors.accent : colors.card, borderRadius: colors.radius - 2 }]}
                    onPress={() => setTeamId(t.id)}
                  >
                    <Text style={[styles.radioLabel, { color: teamId === t.id ? colors.primary : colors.mutedForeground }]}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )
          }
        </Field>

        <Field label="Microárea *">
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius }]}
            value={microarea} onChangeText={setMicroarea}
            placeholder="Ex.: MA-01" placeholderTextColor={colors.mutedForeground}
          />
        </Field>

        <Field label="Situação *">
          <RadioGroup<SmokingStatus>
            options={[{ value: 'ativo', label: 'Tabagista Ativo' }, { value: 'ex-tabagista', label: 'Ex-Tabagista' }]}
            value={smokingStatus} onChange={setSmokingStatus}
          />
        </Field>

        <Field label="Lesão Bucal">
          <View style={styles.switchRow}>
            <Switch value={hasOralLesion} onValueChange={setHasOralLesion} trackColor={{ true: colors.primary }} />
            <Text style={[styles.switchLabel, { color: colors.foreground }]}>{hasOralLesion ? 'Sim' : 'Não'}</Text>
          </View>
        </Field>

        {hasOralLesion && (
          <Field label="Tipo da Lesão">
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius }]}
              value={lesionType} onChangeText={setLesionType}
              placeholder="Descreva o tipo de lesão" placeholderTextColor={colors.mutedForeground}
            />
          </Field>
        )}

        <Field label="Diagnóstico *">
          <RadioGroup<Diagnosis>
            options={[
              { value: 'nenhum', label: 'Nenhum' },
              { value: 'em_investigacao', label: 'Em Investigação' },
              { value: 'confirmado', label: 'Confirmado' },
            ]}
            value={diagnosis} onChange={setDiagnosis}
          />
        </Field>

        <Field label="Data de Cadastro (AAAA-MM-DD) *">
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius }]}
            value={registrationDate} onChangeText={setRegistrationDate}
            placeholder="Ex.: 2024-01-20" placeholderTextColor={colors.mutedForeground}
          />
        </Field>

        <Field label="Última Avaliação (AAAA-MM-DD)">
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius }]}
            value={lastEvalDate} onChangeText={setLastEvalDate}
            placeholder="Ex.: 2024-06-15" placeholderTextColor={colors.mutedForeground}
          />
        </Field>

        <Field label="Observações">
          <TextInput
            style={[styles.input, styles.textArea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius }]}
            value={notes} onChangeText={setNotes}
            multiline numberOfLines={3} placeholder="Observações clínicas…" placeholderTextColor={colors.mutedForeground}
          />
        </Field>

        <Field label="Status">
          <RadioGroup<PatientStatus>
            options={[{ value: 'ativo', label: 'Ativo' }, { value: 'inativo', label: 'Inativo' }]}
            value={patientStatus} onChange={setPatientStatus}
          />
        </Field>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave} disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Salvar Paciente</Text>
            </>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  input: { height: 46, borderWidth: 1, paddingHorizontal: 12, fontSize: 15, fontFamily: 'Inter_400Regular' },
  textArea: { height: 88, textAlignVertical: 'top', paddingTop: 10 },
  radioGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  radioBtn: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5 },
  radioLabel: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchLabel: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  saveBtn: { flexDirection: 'row', height: 52, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});
