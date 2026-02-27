import React from 'react';
import { View, Text, Button, TextInput, StyleSheet } from 'react-native';

const CreateAlertScreen = () => {
    const [alertName, setAlertName] = React.useState('');
    const [alertMessage, setAlertMessage] = React.useState('');

    const handleCreateAlert = () => {
        // Handle alert creation logic here
        console.log('Alert Created:', { alertName, alertMessage });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create Admin Alert</Text>
            <TextInput
                style={styles.input}
                placeholder="Alert Name"
                value={alertName}
                onChangeText={setAlertName}
            />
            <TextInput
                style={styles.input}
                placeholder="Alert Message"
                value={alertMessage}
                onChangeText={setAlertMessage}
            />
            <Button title="Create Alert" onPress={handleCreateAlert} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    input: {
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 20,
        paddingHorizontal: 10,
    },
});

export default CreateAlertScreen;