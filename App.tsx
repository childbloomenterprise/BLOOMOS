import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthScreen from './src/screens/AuthScreen';
import ExplainScreen from './src/screens/ExplainScreen';
import HealthFactsScreen from './src/screens/HealthFactsScreen';
import HomeScreen from './src/screens/HomeScreen';
import RecordDetailScreen from './src/screens/RecordDetailScreen';
import UploadScreen from './src/screens/UploadScreen';

type Screen =
  | { name: 'home' }
  | { name: 'upload' }
  | { name: 'detail'; recordId: string }
  | { name: 'explain'; recordId: string; recordTitle: string }
  | { name: 'facts' };

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

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

  if (screen.name === 'upload') {
    return (
      <UploadScreen
        onDone={() => setScreen({ name: 'home' })}
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

  return (
    <HomeScreen
      onAddRecord={() => setScreen({ name: 'upload' })}
      onViewRecord={(id) => setScreen({ name: 'detail', recordId: id })}
      onOpenFacts={() => setScreen({ name: 'facts' })}
    />
  );
}

export default function App() {
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
