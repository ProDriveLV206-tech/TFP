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

// auth.js: handles auth, profile, friends, theme saving
// firebase_init.js must be loaded before this script
var auth = firebase.auth();
var db = firebase.database();
var storage = firebase.storage ? firebase.storage() : null;

function login(){ 
  var e=document.getElementById('email').value.trim();
  var p=document.getElementById('password').value;
  auth.signInWithEmailAndPassword(e,p).then(function(){ window.location.href='chat.html'; }).catch(function(e){ alert(e.message); });
}
function signup(){
  var e=document.getElementById('email').value.trim();
  var p=document.getElementById('password').value;
  auth.createUserWithEmailAndPassword(e,p).then(function(cred){
    db.ref('users/'+cred.user.uid).set({ email: cred.user.email, name: cred.user.email.split('@')[0], created: Date.now() });
    alert('Account created. Redirecting...'); window.location.href='chat.html';
  }).catch(function(e){ alert(e.message); });
}

function saveProfile(){ 
  var user = auth.currentUser; if(!user) return;
  var name = document.getElementById('profileName') ? document.getElementById('profileName').value : null;
  if(name) db.ref('users/'+user.uid+'/name').set(name);
  var pfp = document.getElementById('profilePfp') ? document.getElementById('profilePfp').value.trim() : null;
  if(pfp) db.ref('users/'+user.uid+'/pfp').set(pfp);
  var theme = localStorage.getItem('theme') || 'dark';
  db.ref('users/'+user.uid+'/theme').set(theme);
  alert('Profile saved');
}

function sendFriendRequest(email){
  var user = auth.currentUser; if(!user) return alert('Login required');
  var key = email.replace(/\./g,'_').toLowerCase();
  db.ref('friend_requests/'+key+'/'+user.uid).set({ from: user.email, ts: Date.now() });
  alert('Friend request sent');
}

function acceptFriendRequest(fromUid){
  var user = auth.currentUser; if(!user) return;
  var me = user.uid;
  db.ref('friends/'+me+'/'+fromUid).set(true);
  db.ref('friends/'+fromUid+'/'+me).set(true);
  db.ref('friend_requests/'+me+'/'+fromUid).remove();
  alert('Friend added');
}
