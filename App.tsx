import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View  } from 'react-native';
import { initOfflineSupport } from './app/offline';
import i18n from "./app/i18n/i18n";



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
    backgroundColor: '#8AA39B',
    alignItems: 'center',
    justifyContent: 'center',
  },

});
