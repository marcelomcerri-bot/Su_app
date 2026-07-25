import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet,
  Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { getPatient, type DBPatient, type Diagnosis, type PatientStatus, type Sex, type SmokingStatus } from '@/lib/database';
import { computeAlertLevel, alertLabel } from '@/lib/alerts';
import { AlertBadge } from '@/components/AlertBadge';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={sStyles.section}>
      <Text style={[sStyles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
      <View style={[sStyles.sectionCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
        {children}
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[sStyles.row, { borderBottomColor: colors.border }]}>
      <Text style={[sStyles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[sStyles.rowValue, { color: colors.foreground }]}>{value || '—'}</Text>
    </View>
  );
}

type RadioOption<T extends string> = { value: T; label: string };

function RadioGroup<T extends string>({
  options, value, onChange,
}: { options: RadioOption<T>[]; value: T; onChange: (v: T) => void }) {
  const colors = useColors();
  return (
    <View style={eStyles.radioGroup}>
      {options.map(o => (
        <TouchableOpacity
          key={o.value}
          style={[
            eStyles.radioBtn,
            {
              borderColor: value === o.value ? colors.primary : colors.border,
              backgroundColor: value === o.value ? colors.accent : colors.background,
              borderRadius: colors.radius - 2,
            },
          ]}
          onPress={() => onChange(o.value)}
        >
          <Text style={[eStyles.radioLabel, { color: value === o.value ? colors.primary : colors.mutedForeground }]}>
            {o.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function PatientDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const { teams, editPatient, deletePatient } = useData();
  const router = useRouter();

  const [patient, setPatient] = useState<DBPatient | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state (mirrors patient fields)
  const [identification, setIdentification] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<Sex>('masculino');
  const [teamId, setTeamId] = useState(0);
  const [microarea, setMicroarea] = useState('');
  const [smokingStatus, setSmokingStatus] = useState<SmokingStatus>('ativo');
  const [hasOralLesion, setHasOralLesion] = useState(false);
  const [lesionType, setLesionType] = useState('');
  const [diagnosis, setDiagnosis] = useState<Diagnosis>('nenhum');
  const [lastEvalDate, setLastEvalDate] = useState('');
  const [notes, setNotes] = useState('');
  const [patientStatus, setPatientStatus] = useState<PatientStatus>('ativo');

  useEffect(() => {
    void load();
  }, [id]);

  async function load() {
    setLoading(true);
    const p = await getPatient(Number(id));
    setPatient(p);
    if (p) populateForm(p);
    setLoading(false);
  }

  function populateForm(p: DBPatient) {
    setIdentification(p.identification);
    setAge(String(p.age));
    setSex(p.sex);
    setTeamId(p.teamId);
    setMicroarea(p.microarea);
    setSmokingStatus(p.smokingStatus);
    setHasOralLesion(!!p.hasOralLesion);
    setLesionType(p.lesionType ?? '');
    setDiagnosis(p.diagnosis);
    setLastEvalDate(p.lastEvaluationDate ?? '');
    setNotes(p.notes ?? '');
    setPatientStatus(p.patientStatus);
  }

  async function handleSave() {
    if (!identification.trim() || !age || !microarea.trim()) {
      Alert.alert('Atenção', 'Preencha identificação, idade e microárea.');
      return;
    }
    setSaving(true);
    try {
      await editPatient(Number(id), {
        identification: identification.trim(),
        age: Number(age),
        sex, teamId, microarea: microarea.trim(), smokingStatus,
        hasOralLesion, lesionType: lesionType.trim() || null,
        diagnosis, lastEvaluationDate: lastEvalDate.trim() || null,
        notes: notes.trim() || null, patientStatus,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await load();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    Alert.alert('Excluir Paciente', 'Tem certeza? Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          await deletePatient(Number(id));
          router.back();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.mutedForeground }}>Paciente não encontrado</Text>
      </View>
    );
  }

  const alertLevel = computeAlertLevel(patient);

  if (!editing) {
    // ── VIEW MODE ──
    const sexLabel = { masculino: 'Masculino', feminino: 'Feminino' }[patient.sex];
    const smokingLabel = { ativo: 'Tabagista Ativo', 'ex-tabagista': 'Ex-Tabagista' }[patient.smokingStatus];
    const diagnosisLabel = { nenhum: 'Nenhum', em_investigacao: 'Em Investigação', confirmado: 'Confirmado' }[patient.diagnosis];
    const statusLabel = { ativo: 'Ativo', inativo: 'Inativo' }[patient.patientStatus];

    return (
      <ScrollView style={[sStyles.root, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Alert banner */}
        <View style={[sStyles.banner, { backgroundColor: alertLevel === 'red' ? colors.destructive : alertLevel === 'yellow' ? colors.warning : colors.success }]}>
          <AlertBadge level={alertLevel} size="md" />
          <Text style={sStyles.bannerText}>{alertLabel(alertLevel)}</Text>
          <View style={sStyles.spacer} />
          {isAdmin && (
            <TouchableOpacity onPress={handleDelete} hitSlop={8}>
              <Ionicons name="trash-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[sStyles.editBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            onPress={() => setEditing(true)}
          >
            <Ionicons name="pencil" size={16} color="#fff" />
            <Text style={sStyles.editBtnText}>Editar</Text>
          </TouchableOpacity>
        </View>

        <Section title="IDENTIFICAÇÃO">
          <Row label="Identificação" value={patient.identification} />
          <Row label="Idade" value={`${patient.age} anos`} />
          <Row label="Sexo" value={sexLabel} />
          <Row label="Equipe" value={patient.teamName} />
          <Row label="Microárea" value={patient.microarea} />
          <Row label="Status" value={statusLabel} />
        </Section>

        <Section title="SITUAÇÃO CLÍNICA">
          <Row label="Situação" value={smokingLabel} />
          <Row label="Lesão Bucal" value={patient.hasOralLesion ? 'Sim' : 'Não'} />
          {patient.hasOralLesion ? <Row label="Tipo da Lesão" value={patient.lesionType ?? '—'} /> : null}
          <Row label="Diagnóstico" value={diagnosisLabel} />
        </Section>

        <Section title="AVALIAÇÃO">
          <Row label="Cadastro" value={patient.registrationDate} />
          <Row label="Última Avaliação" value={patient.lastEvaluationDate ?? '—'} />
          {patient.notes ? <Row label="Observações" value={patient.notes} /> : null}
        </Section>
      </ScrollView>
    );
  }

  // ── EDIT MODE ──
  const teamOptions = teams.map(t => ({ value: t.id, label: t.name }));

  return (
    <KeyboardAwareScrollViewCompat
      style={[eStyles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 60 }}
      bottomOffset={20}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={[eStyles.topBar, { backgroundColor: colors.sidebar }]}>
        <TouchableOpacity onPress={() => { setEditing(false); populateForm(patient); }} hitSlop={8}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={eStyles.topTitle}>Editar Paciente</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={8}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="checkmark" size={24} color="#fff" />}
        </TouchableOpacity>
      </View>

      <View style={{ padding: 16, gap: 14 }}>
        <Field label="Identificação">
          <TextInput style={[eStyles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, borderRadius: colors.radius }]}
            value={identification} onChangeText={setIdentification} placeholder="Ex.: JDS/1985/MA" placeholderTextColor={colors.mutedForeground} />
        </Field>

        <Field label="Idade">
          <TextInput style={[eStyles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, borderRadius: colors.radius }]}
            value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="Ex.: 55" placeholderTextColor={colors.mutedForeground} />
        </Field>

        <Field label="Sexo">
          <RadioGroup options={[{ value: 'masculino' as Sex, label: 'Masculino' }, { value: 'feminino' as Sex, label: 'Feminino' }]} value={sex} onChange={setSex} />
        </Field>

        <Field label="Equipe">
          <View style={eStyles.teamPicker}>
            {teamOptions.map(t => (
              <TouchableOpacity key={t.value} style={[eStyles.radioBtn, { borderColor: teamId === t.value ? colors.primary : colors.border, backgroundColor: teamId === t.value ? colors.accent : colors.background, borderRadius: colors.radius - 2 }]} onPress={() => setTeamId(t.value)}>
                <Text style={[eStyles.radioLabel, { color: teamId === t.value ? colors.primary : colors.mutedForeground }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="Microárea">
          <TextInput style={[eStyles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, borderRadius: colors.radius }]}
            value={microarea} onChangeText={setMicroarea} placeholder="Ex.: MA-01" placeholderTextColor={colors.mutedForeground} />
        </Field>

        <Field label="Situação">
          <RadioGroup options={[{ value: 'ativo' as SmokingStatus, label: 'Tabagista Ativo' }, { value: 'ex-tabagista' as SmokingStatus, label: 'Ex-Tabagista' }]} value={smokingStatus} onChange={setSmokingStatus} />
        </Field>

        <Field label="Lesão Bucal">
          <View style={eStyles.switchRow}>
            <Switch value={hasOralLesion} onValueChange={setHasOralLesion} trackColor={{ true: colors.primary }} />
            <Text style={[eStyles.switchLabel, { color: colors.foreground }]}>{hasOralLesion ? 'Sim' : 'Não'}</Text>
          </View>
        </Field>

        {hasOralLesion && (
          <Field label="Tipo da Lesão">
            <TextInput style={[eStyles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, borderRadius: colors.radius }]}
              value={lesionType} onChangeText={setLesionType} placeholder="Descreva o tipo de lesão" placeholderTextColor={colors.mutedForeground} />
          </Field>
        )}

        <Field label="Diagnóstico">
          <RadioGroup
            options={[
              { value: 'nenhum' as Diagnosis, label: 'Nenhum' },
              { value: 'em_investigacao' as Diagnosis, label: 'Em Investigação' },
              { value: 'confirmado' as Diagnosis, label: 'Confirmado' },
            ]}
            value={diagnosis} onChange={setDiagnosis}
          />
        </Field>

        <Field label="Última Avaliação (AAAA-MM-DD)">
          <TextInput style={[eStyles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, borderRadius: colors.radius }]}
            value={lastEvalDate} onChangeText={setLastEvalDate} placeholder="Ex.: 2024-06-15" placeholderTextColor={colors.mutedForeground} />
        </Field>

        <Field label="Observações">
          <TextInput style={[eStyles.input, eStyles.textArea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, borderRadius: colors.radius }]}
            value={notes} onChangeText={setNotes} multiline numberOfLines={3} placeholder="Observações clínicas…" placeholderTextColor={colors.mutedForeground} />
        </Field>

        <Field label="Status do Paciente">
          <RadioGroup options={[{ value: 'ativo' as PatientStatus, label: 'Ativo' }, { value: 'inativo' as PatientStatus, label: 'Inativo' }]} value={patientStatus} onChange={setPatientStatus} />
        </Field>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={eStyles.field}>
      <Text style={[eStyles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {children}
    </View>
  );
}

const sStyles = StyleSheet.create({
  root: { flex: 1 },
  banner: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10,
  },
  bannerText: { fontSize: 14, fontWeight: '600', color: '#fff', fontFamily: 'Inter_600SemiBold' },
  spacer: { flex: 1 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnText: { color: '#fff', fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  section: { marginHorizontal: 16, marginTop: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6, fontFamily: 'Inter_700Bold' },
  sectionCard: { overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLabel: { fontSize: 13, flex: 1, fontFamily: 'Inter_400Regular' },
  rowValue: { fontSize: 13, fontWeight: '500', flex: 1.5, textAlign: 'right', fontFamily: 'Inter_500Medium' },
});

const eStyles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16 },
  topTitle: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '600', textAlign: 'center', fontFamily: 'Inter_600SemiBold' },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  input: { height: 46, borderWidth: 1, paddingHorizontal: 12, fontSize: 15, fontFamily: 'Inter_400Regular' },
  textArea: { height: 88, textAlignVertical: 'top', paddingTop: 10 },
  radioGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  radioBtn: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5 },
  radioLabel: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  teamPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchLabel: { fontSize: 15, fontFamily: 'Inter_400Regular' },
});
