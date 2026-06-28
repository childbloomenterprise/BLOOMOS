import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthScreen from './src/screens/AuthScreen';
import ClinicScreen from './src/screens/ClinicScreen';
import ExplainScreen from './src/screens/ExplainScreen';
import HealthFactsScreen from './src/screens/HealthFactsScreen';
import HomeScreen from './src/screens/HomeScreen';
import HospitalScreen from './src/screens/HospitalScreen';
import InvestorScreen from './src/screens/InvestorScreen';
import LandingScreen from './src/screens/LandingScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import PatientDemoScreen from './src/screens/PatientDemoScreen';
import RecordDetailScreen from './src/screens/RecordDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ShareScreen from './src/screens/ShareScreen';
import UploadScreen from './src/screens/UploadScreen';

type Screen =
  | { name: 'onboarding' }
  | { name: 'home' }
  | { name: 'upload' }
  | { name: 'detail'; recordId: string }
  | { name: 'explain'; recordId: string; recordTitle: string }
  | { name: 'facts' }
  | { name: 'share' }
  | { name: 'settings' };

function getClinicTokenFromWebUrl(): string | null | undefined {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return undefined;
  }

  const url = new URL(window.location.href);
  const isClinicPath = url.pathname === '/clinic';
  const token = url.searchParams.get('token');

  if (!isClinicPath && token === null) {
    return undefined;
  }

  return token;
}

function shouldShowWebLanding(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  const url = new URL(window.location.href);
  const hasAuthRedirect =
    url.searchParams.has('code') ||
    url.hash.includes('access_token') ||
    url.hash.includes('refresh_token');

  return url.pathname === '/' && !hasAuthRedirect;
}

function shouldShowHospitalPreview(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  return new URL(window.location.href).pathname === '/hospital';
}

function shouldShowInvestorRoom(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  return new URL(window.location.href).pathname === '/investor';
}

function shouldShowPatientDemo(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  return new URL(window.location.href).pathname === '/patient';
}

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const [screen, setScreen] = useState<Screen>({ name: 'onboarding' });
  const [toast, setToast] = useState<string | null>(null);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1F6F54" />
      </View>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (screen.name === 'onboarding') {
    return (
      <OnboardingScreen
        onAddRecord={() => setScreen({ name: 'upload' })}
        onContinue={() => setScreen({ name: 'home' })}
      />
    );
  }

  if (screen.name === 'upload') {
    return (
      <UploadScreen
        onDone={() => {
          setToast('Record saved. You can explain it or share it when ready.');
          setScreen({ name: 'home' });
        }}
        onBack={() => setScreen({ name: 'home' })}
      />
    );
  }

  if (screen.name === 'detail') {
    return (
      <RecordDetailScreen
        recordId={screen.recordId}
        onBack={() => setScreen({ name: 'home' })}
        onExplain={(id, title) => setScreen({ name: 'explain', recordId: id, recordTitle: title })}
      />
    );
  }

  if (screen.name === 'explain') {
    return (
      <ExplainScreen
        recordId={screen.recordId}
        recordTitle={screen.recordTitle}
        onBack={() => setScreen({ name: 'detail', recordId: screen.recordId })}
      />
    );
  }

  if (screen.name === 'facts') {
    return <HealthFactsScreen onBack={() => setScreen({ name: 'home' })} />;
  }

  if (screen.name === 'share') {
    return <ShareScreen onBack={() => setScreen({ name: 'home' })} />;
  }

  if (screen.name === 'settings') {
    return <SettingsScreen onBack={() => setScreen({ name: 'home' })} />;
  }

  return (
    <HomeScreen
      onAddRecord={() => setScreen({ name: 'upload' })}
      onViewRecord={(id) => setScreen({ name: 'detail', recordId: id })}
      onOpenFacts={() => setScreen({ name: 'facts' })}
      onOpenShare={() => setScreen({ name: 'share' })}
      onOpenSettings={() => setScreen({ name: 'settings' })}
      toast={toast}
      onToastDone={() => setToast(null)}
    />
  );
}

export default function App() {
  const clinicToken = getClinicTokenFromWebUrl();

  if (clinicToken !== undefined) {
    return (
      <>
        <StatusBar style="dark" />
        <ClinicScreen token={clinicToken} />
      </>
    );
  }

  if (shouldShowWebLanding()) {
    return (
      <>
        <StatusBar style="dark" />
        <LandingScreen />
      </>
    );
  }

  if (shouldShowHospitalPreview()) {
    return (
      <>
        <StatusBar style="dark" />
        <HospitalScreen />
      </>
    );
  }

  if (shouldShowInvestorRoom()) {
    return (
      <>
        <StatusBar style="dark" />
        <InvestorScreen />
      </>
    );
  }

  if (shouldShowPatientDemo()) {
    return (
      <>
        <StatusBar style="dark" />
        <PatientDemoScreen />
      </>
    );
  }

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
