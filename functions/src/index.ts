import * as functions from 'firebase-functions';

// Create a Cloud Function
export const helloWorld = functions.https.onRequest((request, response) => {
    response.send('Hello from Firebase!');
});
