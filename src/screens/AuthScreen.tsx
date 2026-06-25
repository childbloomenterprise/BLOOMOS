// src/screens/AuthScreen.tsx
//
// The logged-out screen. One screen handles both Sign Up and Log In with a
// toggle, to keep Phase 0 simple. Email + password only.
//
// Email verification is ON, so after signing up the user must tap a link in
// their email before they can log in. We tell them that clearly.

import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

type Mode = 'login' | 'signup';

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // A friendly message shown under the form (either an error or a success note).
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(
    null
  );

  const isSignup = mode === 'signup';

  async function handleSubmit() {
    setMessage(null);

    // Basic guard so we don't send empty calls to the server.
    if (!email.trim() || !password) {
      setMessage({ text: 'Please enter your email and password.', isError: true });
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) {
          setMessage({ text: error.message, isError: true });
        } else if (data.session) {
          // This only happens if email verification is OFF. The AuthProvider
          // will notice the new session and switch to the Home screen.
          setMessage({ text: 'Account created — welcome!', isError: false });
        } else {
          // Email verification is ON (our setting): no session yet.
          setMessage({
            text:
              'Check your email to confirm your account. Tap the link, then come back and log in.',
            isError: false,
          });
          setMode('login');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          // Make the most common error friendlier.
          const friendly =
            error.message === 'Email not confirmed'
              ? 'Please confirm your email first — check your inbox for the link.'
              : error.message;
          setMessage({ text: friendly, isError: true });
        }
        // On success, AuthProvider switches us to the Home screen automatically.
      }
    } catch (e) {
      setMessage({
        text: 'Something went wrong. Check your internet connection and try again.',
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  }

  function toggleMode() {
    setMessage(null);
    setMode(isSignup ? 'login' : 'signup');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.brand}>Bloom OS</Text>
        <Text style={styles.subtitle}>Your health, owned by you.</Text>

        <Text style={styles.heading}>
          {isSignup ? 'Create your account' : 'Welcome back'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#9AA0A6"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#9AA0A6"
          secureTextEntry
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />

        {message && (
          <Text style={[styles.message, message.isError ? styles.error : styles.success]}>
            {message.text}
          </Text>
        )}

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{isSignup ? 'Sign Up' : 'Log In'}</Text>
          )}
        </Pressable>

        <Pressable onPress={toggleMode} disabled={loading} style={styles.switchRow}>
          <Text style={styles.switchText}>
            {isSignup
              ? 'Already have an account? Log in'
              : "New here? Create an account"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    // Soft shadow for a calm, trustworthy feel.
    shadowColor: '#1A2B4A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  brand: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1F6F54',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  error: { color: '#B91C1C' },
  success: { color: '#1F6F54' },
  button: {
    backgroundColor: '#1F6F54',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  switchRow: {
    marginTop: 18,
    alignItems: 'center',
  },
  switchText: {
    color: '#1F6F54',
    fontSize: 14,
    fontWeight: '500',
  },
});
