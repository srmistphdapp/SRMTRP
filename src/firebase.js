// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD_qTXX_WstnPXU54x5El4h9dKeogY8blI",
  authDomain: "phd-srm.firebaseapp.com",
  databaseURL: "https://phd-srm-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "phd-srm",
  storageBucket: "phd-srm.firebasestorage.app",
  messagingSenderId: "658327272465",
  appId: "1:658327272465:web:f31790b524839b50fd05b0",
  measurementId: "G-SELJ5SQ9HL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
