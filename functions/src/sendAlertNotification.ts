// Import needed modules

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const sendAlertNotification = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
    // Define the alert message
    const alertMessage = 'This is a test alert notification!';

    // Send notifications to the desired recipients
    const tokens = await admin.messaging().getAllDeviceTokens(); // Modify to get correct device tokens
    const payload = {
        notification: {
            title: 'Alert Notification',
            body: alertMessage,
        },
    };

    // Send notifications
    return admin.messaging().sendToDevice(tokens, payload);
});