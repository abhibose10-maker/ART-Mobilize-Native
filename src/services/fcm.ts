import messaging from '@react-native-firebase/messaging';

export const requestUserPermission = async () => {
    const authStatus = await messaging().requestPermission();
    const status = authStatus !== messaging.AuthorizationStatus.AUTHORIZED;
    return status;
};

export const onMessageListener = () => {
    messaging().onMessage(async remoteMessage => {
        console.log('A new FCM message arrived!', remoteMessage);
        // Handle foreground messages here
    });
};

export const subscribeToTopic = (topic) => {
    messaging().subscribeToTopic(topic);
};

export const unsubscribeFromTopic = (topic) => {
    messaging().unsubscribeFromTopic(topic);
};

export const getToken = async () => {
    const token = await messaging().getToken();
    return token;
};
