import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { initOfflineSupport } from './app/offline';


export default function App() {
  useEffect(() => {
    initOfflineSupport().catch(console.error);
  }, []);

  return (
    <View style={styles.container}>
      
      <Text>Open up App.tsx to start working on your app!</Text>
      
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
