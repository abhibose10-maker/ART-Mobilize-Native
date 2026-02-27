import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

const AlertAcknowledgementScreen = () => {
    const handleAcknowledge = () => {
        // Logic to handle alert acknowledgment
        console.log('Alert acknowledged!');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Alert Acknowledgement</Text>
            <Text>Please acknowledge the alert to continue.</Text>
            <Button title='Acknowledge' onPress={handleAcknowledge} />
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
        marginBottom: 16,
    },
});

export default AlertAcknowledgementScreen;
