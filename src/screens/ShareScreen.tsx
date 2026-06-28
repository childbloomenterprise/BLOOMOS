import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { bloom } from '../../contract/tokens';
import { Card, FadeIn, GradientPanel, MetricTile, QRBlock, StatusPill, ToastBanner } from '../components/Bloom';
import { useAuth } from '../context/AuthContext';
import {
  approveShare,
  createShare,
  denyShare,
  fetchShare,
  listShareViews,
  revokeShare,
  subscribeToShare,
  type Share,
  type ShareView,
} from '../lib/shares';

interface Props {
  onBack: () => void;
}

const CLINIC_BASE_URL =
  process.env.EXPO_PUBLIC_CLINIC_BASE_URL ??
  (Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin
    : 'https://bloom-os-b2c.vercel.app');

function minutesLeft(expiresAtIso: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAtIso).getTime() - Date.now()) / 60000));
}

function formatViewTime(value: string): string {
  return new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

type State =
  | { kind: 'creating' }
  | { kind: 'ready'; share: Share }
  | { kind: 'revoked' }
  | { kind: 'error'; message: string };

export default function ShareScreen({ onBack }: Props) {
  const { session } = useAuth();
  const [state, setState] = useState<State>({ kind: 'creating' });
  const [views, setViews] = useState<ShareView[]>([]);
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const share = await createShare(session!.user.id);
        const allViews = await listShareViews().catch(() => []);

        if (!cancelled) {
          setViews(allViews.filter((view) => view.share_id === share.id || view.token === share.token));
          setState({ kind: 'ready', share });
        }
      } catch (e: any) {
        if (!cancelled) setState({ kind: 'error', message: e.message ?? 'Could not create a share link.' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Live: when the doctor's phone scans, clinic-record flips the share to
  // 'requested' and we hear it here within ~1s — that drives the Accept/Deny popup.
  // Realtime is primary; a slow poll is a backstop in case the websocket is blocked,
  // so the request still surfaces. The poll stops once the share is resolved.
  const readyShareId = state.kind === 'ready' ? state.share.id : null;
  useEffect(() => {
    if (!readyShareId) return;

    const applyUpdate = (updated: Share) =>
      setState((prev) =>
        prev.kind === 'ready' && prev.share.id === updated.id
          ? { kind: 'ready', share: { ...prev.share, ...updated } }
          : prev,
      );

    const unsubscribe = subscribeToShare(readyShareId, applyUpdate);

    const pollId = setInterval(async () => {
      try {
        const fresh = await fetchShare(readyShareId);
        if (!fresh) return;
        applyUpdate(fresh);
        if (fresh.status === 'approved' || fresh.status === 'denied') {
          clearInterval(pollId);
        }
      } catch {
        // transient — let the next tick / Realtime catch it
      }
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(pollId);
    };
  }, [readyShareId]);

  async function copy(value: string, which: 'link' | 'code') {
    await Clipboard.setStringAsync(value);
    setCopied(which);
    setTimeout(() => setCopied(null), 1600);
  }

  async function handleApprove() {
    if (state.kind !== 'ready') return;
    const share = state.share;
    // Optimistic — Realtime will echo our own update right back, idempotently.
    setState({ kind: 'ready', share: { ...share, status: 'approved', approved_at: new Date().toISOString() } });
    try {
      await approveShare(share.id);
    } catch (e: any) {
      setState({ kind: 'error', message: e.message ?? 'Could not approve the request.' });
    }
  }

  async function handleDeny() {
    if (state.kind !== 'ready') return;
    const share = state.share;
    setState({ kind: 'ready', share: { ...share, status: 'denied' } });
    try {
      await denyShare(share.id);
    } catch (e: any) {
      setState({ kind: 'error', message: e.message ?? 'Could not decline the request.' });
    }
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
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Share with a doctor</Text>
        <View style={{ width: 64 }} />
      </View>

      {state.kind === 'creating' ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={bloom.primary} />
          <Text style={styles.loadingText}>Creating a secure link...</Text>
        </View>
      ) : null}

      {state.kind === 'error' ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{state.message}</Text>
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.linkBtn}>
            <Text style={styles.linkBtnText}>Go back</Text>
          </Pressable>
        </View>
      ) : null}

      {state.kind === 'revoked' ? (
        <View style={styles.centered}>
          <Text style={styles.revokedTitle}>Link revoked</Text>
          <Text style={styles.revokedBody}>
            This share link no longer works. You can create a new one any time.
          </Text>
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.linkBtn}>
            <Text style={styles.linkBtnText}>Done</Text>
          </Pressable>
        </View>
      ) : null}

      {state.kind === 'ready' ? (
        <FadeIn>
          <ShareReady
            share={state.share}
            views={views}
            copied={copied}
            onCopyLink={() => copy(`${CLINIC_BASE_URL}/clinic?token=${state.share.token}`, 'link')}
            onCopyCode={() => copy(state.share.token, 'code')}
            onRevoke={handleRevoke}
          />
        </FadeIn>
      ) : null}

      {state.kind === 'ready' ? (
        <RequestModal
          visible={state.share.status === 'requested'}
          requesterLabel={state.share.requester_label}
          onApprove={handleApprove}
          onDeny={handleDeny}
        />
      ) : null}
    </View>
  );
}

// The live consent prompt on the owner's laptop. Appears the instant a device
// scans the QR (status -> 'requested'); nothing leaves the server until Accept.
function RequestModal({
  visible,
  requesterLabel,
  onApprove,
  onDeny,
}: {
  visible: boolean;
  requesterLabel: string | null;
  onApprove: () => void;
  onDeny: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDeny}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <StatusPill label="Access request" tone="dark" />
          <Text style={styles.modalTitle}>A device wants to view your record</Text>
          <Text style={styles.modalBody}>
            {requesterLabel ?? 'A device'} just scanned your QR code. They will only see your
            read-only record after you accept.
          </Text>
          <Pressable accessibilityRole="button" style={styles.modalApprove} onPress={onApprove}>
            <Text style={styles.modalApproveText}>Accept &amp; share</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.modalDeny} onPress={onDeny}>
            <Text style={styles.modalDenyText}>Deny</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ShareReady({
  share,
  views,
  copied,
  onCopyLink,
  onCopyCode,
  onRevoke,
}: {
  share: Share;
  views: ShareView[];
  copied: 'link' | 'code' | null;
  onCopyLink: () => void;
  onCopyCode: () => void;
  onRevoke: () => void;
}) {
  const shareUrl = `${CLINIC_BASE_URL}/clinic?token=${share.token}`;
  const mins = minutesLeft(share.expires_at);
  const latestView = views[0];
  const viewHistoryLine = latestView
    ? `Viewed ${views.length} ${views.length === 1 ? 'time' : 'times'} - ${formatViewTime(latestView.accessed_at)}`
    : 'Viewed 0 times yet - waiting for doctor';

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {copied ? (
        <ToastBanner message={copied === 'link' ? 'Clinic link copied.' : 'Share code copied.'} />
      ) : null}

      <Text style={styles.lead}>
        Show this QR to your doctor, or share the code. They will see your record on their screen -
        no login needed.
      </Text>

      <GradientPanel style={styles.handoffPanel}>
        <StatusPill label="Clinic handoff" tone="dark" />
        <Text style={styles.handoffTitle}>Secure view ready for the doctor.</Text>
        <Text style={styles.handoffBody}>
          One read-only link opens the clinical summary, facts, allergies, reports, signed files,
          and viewer history. You can revoke it any time.
        </Text>
        <View style={styles.handoffMetrics}>
          <MetricTile label="Expires" value={mins > 0 ? `${mins}m` : 'Now'} caption="short-lived access" tone="dark" />
          <MetricTile label="Views" value={views.length} caption="tracked for trust" tone="dark" />
        </View>
      </GradientPanel>

      <QRBlock value={shareUrl} expiresLabel={mins > 0 ? `Expires in ${mins} min` : 'Expired'} />

      <ShareStatusBanner status={share.status} />

      <Card style={styles.viewHistory}>
        <Text style={styles.viewHistoryText}>{viewHistoryLine}</Text>
      </Card>

      <Text style={styles.sectionLabel}>Short code</Text>
      <View style={styles.codeRow}>
        <Text style={styles.codeText} selectable numberOfLines={1}>
          {share.token}
        </Text>
        <Pressable accessibilityRole="button" style={styles.copyBtn} onPress={onCopyCode}>
          <Text style={styles.copyBtnText}>{copied === 'code' ? 'Copied' : 'Copy'}</Text>
        </Pressable>
      </View>

      <Pressable accessibilityRole="button" style={styles.copyLinkBtn} onPress={onCopyLink}>
        <Text style={styles.copyLinkText}>{copied === 'link' ? 'Link copied' : 'Copy link'}</Text>
      </Pressable>

      <Pressable accessibilityRole="button" style={styles.revokeBtn} onPress={onRevoke}>
        <Text style={styles.revokeText}>Revoke this link</Text>
      </Pressable>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          Anyone with this link or code can view your record until it expires or you revoke it.
        </Text>
      </View>
    </ScrollView>
  );
}

// Reflects the consent state on the owner's screen, in step with the live updates.
function ShareStatusBanner({ status }: { status: Share['status'] }) {
  if (status === 'approved') {
    return (
      <View style={[styles.statusBanner, styles.statusBannerOk]}>
        <Text style={styles.statusBannerOkText}>
          Approved — the doctor can now see your record on their device.
        </Text>
      </View>
    );
  }

  if (status === 'denied') {
    return (
      <View style={[styles.statusBanner, styles.statusBannerDanger]}>
        <Text style={styles.statusBannerDangerText}>
          You denied the last request. Create a new link to allow access.
        </Text>
      </View>
    );
  }

  // pending or requested — still waiting on a scan / your decision.
  return (
    <View style={[styles.statusBanner, styles.statusBannerWait]}>
      <ActivityIndicator size="small" color={bloom.primary} />
      <Text style={styles.statusBannerWaitText}>
        Waiting for a doctor to scan this code. You will be asked to accept.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: bloom.bg },
  header: {
    backgroundColor: bloom.surface,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: bloom.space.lg,
    paddingHorizontal: bloom.space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...bloom.elevation.sm,
  },
  backBtn: { padding: bloom.space.sm, minWidth: 64, minHeight: 44, justifyContent: 'center' },
  backText: { color: bloom.primary, ...bloom.text.small, fontWeight: '900' },
  headerTitle: { ...bloom.text.h2, color: bloom.ink },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: bloom.space.xxl },
  loadingText: { marginTop: bloom.space.lg, ...bloom.text.body, color: bloom.muted, fontWeight: '700' },
  errorText: { color: bloom.danger, textAlign: 'center', marginBottom: bloom.space.lg, ...bloom.text.body },
  linkBtn: { paddingVertical: bloom.space.sm, minHeight: 44, justifyContent: 'center' },
  linkBtnText: { color: bloom.primary, ...bloom.text.small, fontWeight: '900' },
  revokedTitle: { ...bloom.text.h1, color: bloom.ink, marginBottom: bloom.space.sm },
  revokedBody: { ...bloom.text.body, color: bloom.muted, textAlign: 'center', marginBottom: bloom.space.xl },
  scroll: { padding: bloom.space.xl, paddingBottom: 60, alignItems: 'center' },
  lead: {
    ...bloom.text.body,
    color: bloom.muted,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: bloom.space.xl,
  },
  handoffPanel: {
    alignSelf: 'stretch',
    padding: bloom.space.xl,
    marginBottom: bloom.space.xl,
    gap: bloom.space.lg,
  },
  handoffTitle: { color: '#ffffff', ...bloom.text.h1 },
  handoffBody: { color: '#d8f6eb', ...bloom.text.body, fontWeight: '700' },
  handoffMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: bloom.space.md },
  viewHistory: {
    alignSelf: 'stretch',
    backgroundColor: bloom.mintSoft,
    borderRadius: bloom.radii.md,
    borderWidth: 1,
    borderColor: bloom.mint,
    padding: bloom.space.md,
    marginBottom: bloom.space.lg,
  },
  viewHistoryText: { color: bloom.primaryInk, ...bloom.text.small, fontWeight: '900', textAlign: 'center' },
  sectionLabel: {
    alignSelf: 'flex-start',
    ...bloom.text.eyebrow,
    color: bloom.primaryInk,
    textTransform: 'uppercase',
    marginBottom: bloom.space.sm,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: bloom.surface,
    borderRadius: bloom.radii.md,
    borderWidth: 1,
    borderColor: bloom.hair,
    paddingLeft: bloom.space.lg,
    paddingRight: bloom.space.sm,
    paddingVertical: bloom.space.sm,
    marginBottom: bloom.space.md,
    ...bloom.elevation.sm,
  },
  codeText: { flex: 1, ...bloom.text.small, color: bloom.ink, fontWeight: '800' },
  copyBtn: {
    backgroundColor: bloom.accent,
    borderRadius: bloom.radii.sm,
    paddingHorizontal: bloom.space.lg,
    paddingVertical: bloom.space.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  copyBtnText: { color: bloom.primaryInk, ...bloom.text.small, fontWeight: '900' },
  copyLinkBtn: {
    alignSelf: 'stretch',
    backgroundColor: bloom.primary,
    borderRadius: bloom.radii.md,
    paddingVertical: bloom.space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: bloom.space.md,
    minHeight: 50,
    ...bloom.elevation.sm,
  },
  copyLinkText: { color: '#fff', ...bloom.text.title },
  revokeBtn: { alignSelf: 'stretch', paddingVertical: bloom.space.md, alignItems: 'center', marginBottom: bloom.space.lg, minHeight: 44 },
  revokeText: { color: bloom.danger, ...bloom.text.small, fontWeight: '900' },
  disclaimer: {
    alignSelf: 'stretch',
    backgroundColor: '#fff7ed',
    borderRadius: bloom.radii.md,
    padding: bloom.space.lg,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  disclaimerText: { ...bloom.text.small, color: '#92400e', fontWeight: '700' },
  statusBanner: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: bloom.space.sm,
    borderRadius: bloom.radii.md,
    borderWidth: 1,
    padding: bloom.space.md,
    marginBottom: bloom.space.lg,
  },
  statusBannerWait: { backgroundColor: bloom.mintSoft, borderColor: bloom.mint },
  statusBannerWaitText: { flexShrink: 1, color: bloom.primaryInk, ...bloom.text.small, fontWeight: '800' },
  statusBannerOk: { backgroundColor: bloom.mintSoft, borderColor: bloom.primary },
  statusBannerOkText: { color: bloom.primaryInk, ...bloom.text.small, fontWeight: '900', textAlign: 'center' },
  statusBannerDanger: { backgroundColor: bloom.dangerSoft, borderColor: bloom.danger },
  statusBannerDangerText: { color: bloom.danger, ...bloom.text.small, fontWeight: '900', textAlign: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 26, 20, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: bloom.space.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: bloom.surface,
    borderRadius: bloom.radii.card,
    padding: bloom.space.xl,
    gap: bloom.space.md,
    ...bloom.elevation.sm,
  },
  modalTitle: { ...bloom.text.h1, color: bloom.ink, marginTop: bloom.space.xs },
  modalBody: { ...bloom.text.body, color: bloom.muted, fontWeight: '600', marginBottom: bloom.space.sm },
  modalApprove: {
    backgroundColor: bloom.primary,
    borderRadius: bloom.radii.md,
    paddingVertical: bloom.space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    ...bloom.elevation.sm,
  },
  modalApproveText: { color: '#fff', ...bloom.text.title },
  modalDeny: { paddingVertical: bloom.space.md, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  modalDenyText: { color: bloom.danger, ...bloom.text.small, fontWeight: '900' },
});
