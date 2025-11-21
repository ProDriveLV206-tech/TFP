/* chat.js - room creation, listing, and moderation-aware sending */
const db = firebase.database();
const auth = firebase.auth();

function emailKey(email){ return email.replace(/\./g,'_'); }
function uidKey(id){ return String(id).replace(/\./g,'_'); }

async function canUserSend(uidOrEmail, room){
  if(!uidOrEmail) return {ok:false, reason:'noid'};
  room = room||'global';
  const k = uidKey(uidOrEmail);
  const banned = await db.ref('banned/'+k).once('value');
  if(banned.exists()) return {ok:false, reason:'banned'};
  const mute = await db.ref('muted/'+k).once('value');
  if(mute.exists()) return {ok:false, reason:'muted'};
  const sb = await db.ref('shadowbanned/'+k).once('value');
  if(sb.exists()) return {ok:true, reason:'shadowbanned'};
  const serverFrozen = (await db.ref('server/frozen').once('value')).val();
  if(serverFrozen) return {ok:false, reason:'frozen'};
  const roomSnap = await db.ref('rooms/'+room).once('value');
  if(roomSnap.exists()){
    const r = roomSnap.val();
    if(r.locked) return {ok:false, reason:'room_locked'};
  }
  return {ok:true};
}

// Create room (client callable)
async function createRoom(roomName){
  if(!roomName) { alert('Enter a room name'); return; }
  const key = roomName.replace(/\./g,'_');
  await db.ref('rooms/'+key).set({name:roomName, createdBy: auth.currentUser? (auth.currentUser.uid||auth.currentUser.email):'anon', ts: Date.now(), locked:false, slowmode:0});
  await db.ref('messages/'+key).set(null);
  // navigate to room
  window.location = 'chat.html?room='+encodeURIComponent(key);
}

// Load rooms into a container element (by id)
function loadRooms(containerId){
  const container = document.getElementById(containerId);
  if(!container) return;
  db.ref('rooms').on('value', snap=>{
    container.innerHTML = '';
    const rooms = snap.val() || {};
    Object.keys(rooms).forEach(rk=>{
      const r = rooms[rk];
      const btn = document.createElement('button');
      btn.className = 'room-btn';
      btn.textContent = r.name || rk;
      btn.onclick = ()=> { window.location = 'chat.html?room='+encodeURIComponent(rk); };
      container.appendChild(btn);
    });
  });
}

// Send message with moderation checks
async function sendMessage(room, text){
  room = room||'global';
  const user = auth.currentUser;
  if(!user) { alert('Sign in first'); return; }
  const check = await canUserSend(user.uid || user.email, room);
  if(!check.ok){
    if(check.reason==='shadowbanned'){
      // store to shadow_messages so admins can review, but show locally to user by updating UI (caller should render instantly)
      const payload = {uid: user.uid||user.email, displayName: user.displayName||user.email, msg:text, ts: Date.now()};
      await db.ref('shadow_messages/'+room).push(payload);
      console.log('Message shadow-stored.');
      return {shadow:true};
    }
    alert('Cannot send: '+check.reason);
    return {ok:false};
  }
  // check slowmode
  const lastRef = db.ref('last_message/'+(user.uid||user.email)+'/'+room);
  const lastSnap = await lastRef.once('value');
  const roomSnap = await db.ref('rooms/'+room).once('value');
  const slow = roomSnap.exists() ? (roomSnap.val().slowmode || 0) : 0;
  const now = Date.now();
  if(lastSnap.exists()){
    const lastTs = lastSnap.val().ts || 0;
    if(slow && (now - lastTs) < slow){
      alert('Slowmode: wait a moment');
      return {ok:false, reason:'slowmode'};
    }
  }
  const payload = {uid: user.uid||user.email, displayName: user.displayName||user.email, msg:text, ts: now};
  const pushed = await db.ref('messages/'+room).push(payload);
  await lastRef.set({ts: now});
  return {ok:true, key: pushed.key};
}

// Helper to listen for messages in a room and render via callback
function onRoomMessages(room, callback){
  room = room||'global';
  db.ref('messages/'+room).on('child_added', snap=>{
    const m = snap.val();
    // ignore if shadowbanned user (their messages shouldn't be in /messages)
    if(!m) return;
    callback(snap.key, m);
  });
}

// Utility to apply siteCustom live updates from DB
db.ref('siteCustom').on('value', snap=>{
  const custom = snap.val()||{};
  try{
    if(custom.bgUrl) document.body.style.backgroundImage = `url(${custom.bgUrl})`;
    if(custom.accentColor) document.documentElement.style.setProperty('--accent', custom.accentColor);
    if(custom.logoUrl){
      const logo=document.querySelector('.site-logo');
      if(logo) logo.src=custom.logoUrl;
    }
    if(custom.siteTitle){
      const t=document.querySelector('.site-title');
      if(t) t.textContent=custom.siteTitle;
      document.title = custom.siteTitle || document.title;
    }
  }catch(e){ console.error(e); }
});
