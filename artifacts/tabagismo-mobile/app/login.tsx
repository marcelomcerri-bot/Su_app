import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function LoginScreen() {
  const colors = useColors();
  const { login } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!username.trim() || !password) {
      setError('Preencha usuário e senha.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const ok = await login(username.trim(), password);
      if (ok) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/');
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError('Usuário ou senha inválidos.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.sidebar }]}>
      {/* Brand panel */}
      <View style={styles.brand}>
        <View style={[styles.iconWrap, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Ionicons name="pulse" size={36} color="#fff" />
        </View>
        <Text style={styles.brandTitle}>Monitoramento{'\n'}Clínico de{'\n'}Tabagistas</Text>
        <Text style={styles.brandSub}>Atenção Primária à Saúde · SUS</Text>
      </View>

      {/* Form card */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.cardWrap}>
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: colors.radius + 6 }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Acesso ao Sistema</Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
            Insira suas credenciais para continuar
          </Text>

          {/* Username */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Profissional</Text>
            <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="person-outline" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Seu usuário"
                placeholderTextColor={colors.mutedForeground}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Senha</Text>
            <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Sua senha"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPwd}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPwd(v => !v)} hitSlop={8}>
                <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Entrar</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  brand: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
    gap: 12,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 26, fontWeight: '700', color: '#fff', lineHeight: 34,
    fontFamily: 'Inter_700Bold',
  },
  brandSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontFamily: 'Inter_400Regular' },
  cardWrap: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { padding: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16, elevation: 8 },
  cardTitle: { fontSize: 22, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 4 },
  cardSub: { fontSize: 13, marginBottom: 20, fontFamily: 'Inter_400Regular' },
  field: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, fontFamily: 'Inter_600SemiBold' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 46,
  },
  input: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular' },
  error: { fontSize: 13, marginBottom: 12, fontFamily: 'Inter_400Regular' },
  btn: { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});
