import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

const LiveGPSScreen = () => {
    const [location, setLocation] = React.useState(null);

    const startSharing = () => {
        // Logic to start GPS sharing
    };

    const stopSharing = () => {
        // Logic to stop GPS sharing
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Live GPS Sharing</Text>
            <Text style={styles.location}>{location ? `Current Location: ${location}` : 'Location sharing not started.'}</Text>
            <Button title="Start Sharing" onPress={startSharing} />
            <Button title="Stop Sharing" onPress={stopSharing} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        marginBottom: 20,
    },
    location: {
        fontSize: 18,
        marginBottom: 20,
    },
});

export default LiveGPSScreen;