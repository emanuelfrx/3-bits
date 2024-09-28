const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');
const { getFirestore, collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc } = require('firebase/firestore');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage'); // Importar Firebase Storage

// Sua configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBs9ZoqCVdk-1ukrJZUI-FekXPNU3tNPTM",
  authDomain: "auth2-7b2ad.firebaseapp.com",
  projectId: "auth2-7b2ad",
  storageBucket: "auth2-7b2ad.appspot.com",
  messagingSenderId: "715673988080",
  appId: "1:715673988080:web:8bff5e4a90dc5763a24b35"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const banco = getFirestore(app);
const storage = getStorage(app);

// Exportar tudo
module.exports = {
  app,
  auth,
  banco,
  storage,
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  ref,
  uploadBytes,
  getDownloadURL
};
