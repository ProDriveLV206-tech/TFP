const firebaseConfig = {
  apiKey: "AIzaSyDNDsHNRkJSvTBL2CqgIMo8PUHk-FCGKmo",
  authDomain: "chatpack-1c0db.firebaseapp.com",
  databaseURL: "https://chatpack-1c0db-default-rtdb.firebaseio.com",
  projectId: "chatpack-1c0db",
  storageBucket: "chatpack-1c0db.firebasestorage.app",
  messagingSenderId: "579488821692",
  appId: "1:579488821692:web:5e4e52326d5e92603abbb9",
  measurementId: "G-8LL9SVXL8K"
};
firebase.initializeApp(firebaseConfig);

// online.js - updates online status and last seen
firebase.auth().onAuthStateChanged(function(user){
  if(!user) return;
  var uid = user.uid;
  var ref = firebase.database().ref('users/'+uid+'/presence');
  ref.set({online:true, lastSeen: Date.now()});
  // set disconnect handler
  firebase.database().ref('users/'+uid+'/presence').onDisconnect().set({online:false, lastSeen: Date.now()});
});
