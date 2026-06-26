import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { bloom } from '../../contract/tokens';
import { useAuth } from '../context/AuthContext';
import { createShare, revokeShare, type Share } from '../lib/shares';

interface Props {
  onBack: () => void;
}

// Where the doctor's /clinic page lives. Set EXPO_PUBLIC_CLINIC_BASE_URL in .env
// (and in Vercel) to your deployed web domain. On web we default to the current
// origin so the QR is always correct once deployed; the fallback below is only a
// placeholder for native dev builds before the domain is set.
const CLINIC_BASE_URL =
  process.env.EXPO_PUBLIC_CLINIC_BASE_URL ??
  (Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin
    : 'https://bloom-os-b2c.vercel.app');

function minutesLeft(expiresAtIso: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAtIso).getTime() - Date.now()) / 60000));
}

type State =
  | { kind: 'creating' }
  | { kind: 'ready'; share: Share }
  | { kind: 'revoked' }
  | { kind: 'error'; message: string };

export default function ShareScreen({ onBack }: Props) {
  const { session } = useAuth();
  const [state, setState] = useState<State>({ kind: 'creating' });
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);
  const [, setTick] = useState(0); // forces the countdown to re-render

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const share = await createShare(session!.user.id);
        if (!cancelled) setState({ kind: 'ready', share });
      } catch (e: any) {
        if (!cancelled) setState({ kind: 'error', message: e.message ?? 'Could not create a share link.' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Tick every 30s so the "expires in N min" label stays current.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  async function copy(value: string, which: 'link' | 'code') {
    await Clipboard.setStringAsync(value);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  }

  async function handleRevoke() {
    if (state.kind !== 'ready') return;
    try {
      await revokeShare(state.share.id);
      setState({ kind: 'revoked' });
    } catch (e: any) {
      setState({ kind: 'error', message: e.message ?? 'Could not revoke the link.' });
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Share with a doctor</Text>
        <View style={{ width: 64 }} />
      </View>

      {state.kind === 'creating' && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={bloom.primary} />
          <Text style={styles.loadingText}>Creating a secure link…</Text>
        </View>
      )}

      {state.kind === 'error' && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{state.message}</Text>
          <Pressable onPress={onBack} style={styles.linkBtn}>
            <Text style={styles.linkBtnText}>← Go back</Text>
          </Pressable>
        </View>
      )}

      {state.kind === 'revoked' && (
        <View style={styles.centered}>
          <Text style={styles.revokedEmoji}>🔒</Text>
          <Text style={styles.revokedTitle}>Link revoked</Text>
          <Text style={styles.revokedBody}>
            This share link no longer works. You can create a new one any time.
          </Text>
          <Pressable onPress={onBack} style={styles.linkBtn}>
            <Text style={styles.linkBtnText}>← Done</Text>
          </Pressable>
        </View>
      )}

      {state.kind === 'ready' && (
        <ShareReady
          share={state.share}
          copied={copied}
          onCopyLink={() => copy(`${CLINIC_BASE_URL}/clinic?token=${state.share.token}`, 'link')}
          onCopyCode={() => copy(state.share.token, 'code')}
          onRevoke={handleRevoke}
        />
      )}
    </View>
  );
}

function ShareReady({
  share,
  copied,
  onCopyLink,
  onCopyCode,
  onRevoke,
}: {
  share: Share;
  copied: 'link' | 'code' | null;
  onCopyLink: () => void;
  onCopyCode: () => void;
  onRevoke: () => void;
}) {
  const shareUrl = `${CLINIC_BASE_URL}/clinic?token=${share.token}`;
  const mins = minutesLeft(share.expires_at);

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={styles.lead}>
        Show this QR to your doctor, or share the code. They’ll see your record on their screen — no
        login needed.
      </Text>

      <View style={styles.qrCard}>
        <QRCode value={shareUrl} size={220} color={bloom.ink} backgroundColor={bloom.surface} />
        <View style={styles.expiryPill}>
          <Text style={styles.expiryText}>
            {mins > 0 ? `Expires in ${mins} min` : 'Expired'}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Short code</Text>
      <View style={styles.codeRow}>
        <Text style={styles.codeText} selectable numberOfLines={1}>
          {share.token}
        </Text>
        <Pressable style={styles.copyBtn} onPress={onCopyCode}>
          <Text style={styles.copyBtnText}>{copied === 'code' ? 'Copied!' : 'Copy'}</Text>
        </Pressable>
      </View>

      <Pressable style={styles.copyLinkBtn} onPress={onCopyLink}>
        <Text style={styles.copyLinkText}>{copied === 'link' ? 'Link copied!' : 'Copy link'}</Text>
      </Pressable>

      <Pressable style={styles.revokeBtn} onPress={onRevoke}>
        <Text style={styles.revokeText}>Revoke this link</Text>
      </Pressable>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerIcon}>ℹ️</Text>
        <Text style={styles.disclaimerText}>
          Anyone with this link or code can view your record until it expires or you revoke it.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: bloom.bg },
  header: {
    backgroundColor: bloom.surface,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#1A2B4A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  backBtn: { padding: 8, minWidth: 64 },
  backText: { color: bloom.primary, fontSize: 15, fontWeight: '500' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: bloom.ink },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 16, fontSize: 15, color: bloom.muted },
  errorText: { color: bloom.danger, textAlign: 'center', marginBottom: 16, fontSize: 15 },
  linkBtn: { paddingVertical: 8 },
  linkBtnText: { color: bloom.primary, fontSize: 15, fontWeight: '500' },
  revokedEmoji: { fontSize: 44, marginBottom: 12 },
  revokedTitle: { fontSize: 18, fontWeight: '700', color: bloom.ink, marginBottom: 8 },
  revokedBody: { fontSize: 14, color: bloom.muted, textAlign: 'center', lineHeight: 21, marginBottom: 20 },

  scroll: { padding: 20, paddingBottom: 60, alignItems: 'center' },
  lead: {
    fontSize: 15,
    color: bloom.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  qrCard: {
    backgroundColor: bloom.surface,
    borderRadius: bloom.radius,
    padding: 24,
    alignItems: 'center',
    marginBottom: 22,
    shadowColor: '#1A2B4A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  expiryPill: {
    marginTop: 18,
    backgroundColor: bloom.accent,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  expiryText: { color: bloom.primaryInk, fontSize: 13, fontWeight: '700' },
  sectionLabel: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '700',
    color: bloom.primaryInk,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: bloom.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5EFEA',
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    marginBottom: 12,
  },
  codeText: { flex: 1, fontSize: 14, color: bloom.ink, fontWeight: '600' },
  copyBtn: {
    backgroundColor: bloom.accent,
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  copyBtnText: { color: bloom.primaryInk, fontSize: 13, fontWeight: '700' },
  copyLinkBtn: {
    alignSelf: 'stretch',
    backgroundColor: bloom.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  copyLinkText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  revokeBtn: { alignSelf: 'stretch', paddingVertical: 12, alignItems: 'center', marginBottom: 16 },
  revokeText: { color: bloom.danger, fontSize: 14, fontWeight: '600' },
  disclaimer: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'flex-start',
  },
  disclaimerIcon: { fontSize: 15, marginRight: 8, marginTop: 1 },
  disclaimerText: { flex: 1, fontSize: 12.5, color: '#92400E', lineHeight: 18, fontWeight: '500' },
});
