import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AcknowledgementsScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Acknowledgements</Text>
      <Text>Thank you to everyone who contributed to this project.</Text>
      {/* Add any other acknowledgments here */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default AcknowledgementsScreen;