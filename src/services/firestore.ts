'use strict';

import { Firestore } from '@google-cloud/firestore';

const firestore = new Firestore();

/**
 * Function to fetch documents from a specified collection based on division.
 * @param {string} collectionName - The name of the Firestore collection.
 * @param {string} division - The division to query.
 * @returns {Promise<Array<Object>>} - Promise resolving to an array of documents.
 */
const getDocumentsByDivision = async (collectionName, division) => {
    const snapshot = await firestore.collection(collectionName).where('division', '==', division).get();
    const documents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return documents;
};

/**
 * Function to add a new document to a specified collection.
 * @param {string} collectionName - The name of the Firestore collection.
 * @param {Object} data - The data of the document to add.
 * @returns {Promise<string>} - Promise resolving to the ID of the added document.
 */
const addDocument = async (collectionName, data) => {
    const docRef = await firestore.collection(collectionName).add(data);
    return docRef.id;
};

export { getDocumentsByDivision, addDocument };