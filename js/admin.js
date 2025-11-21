/* admin.js - expanded admin functions and auto-processor */
const db = firebase.database();
const auth = firebase.auth();

function emailKey(email){ return email.replace(/\./g,'_'); }
function uidKey(id){ return String(id).replace(/\./g,'_'); }

async function requireAdmin(){
  return new Promise((resolve)=>{
    const unsub = auth.onAuthStateChanged(async user=>{
      unsub();
      if(!user){ alert('Not signed in'); resolve(false); return; }
      const key = emailKey(user.email||user.uid);
      const snap = await db.ref('admins/'+key).once('value');
      if(!snap.exists()){ alert('Access denied. Not admin.'); resolve(false); return; }
      resolve(true);
    });
  });
}

// --- Logging helper
async function logAdmin(command, details){
  const uid = (auth.currentUser && (auth.currentUser.uid||auth.currentUser.email))||'unknown';
  const ts = Date.now();
  await db.ref('admin_logs/'+ts).set({
    admin: uid,
    command,
    timestamp: ts,
    details: details||{}
  });
}

// --- USER CONTROL ---
async function banUser(target){
  if(!await requireAdmin()) return;
  const k = uidKey(target);
  await db.ref('banned/'+k).set({ by: auth.currentUser.uid||auth.currentUser.email, ts: Date.now() });
  await logAdmin('banUser', {target});
  // Force logout if online
  await db.ref('force_logout/'+k).set(true);
  alert('Banned '+target);
}

async function unbanUser(target){
  if(!await requireAdmin()) return;
  const k = uidKey(target);
  await db.ref('banned/'+k).remove();
  await logAdmin('unbanUser', {target});
  alert('Unbanned '+target);
}

async function muteUser(target){
  if(!await requireAdmin()) return;
  const k = uidKey(target);
  await db.ref('muted/'+k).set({ by: auth.currentUser.uid||auth.currentUser.email, ts: Date.now() });
  await logAdmin('muteUser', {target});
  alert('Muted '+target);
}

async function unmuteUser(target){
  if(!await requireAdmin()) return;
  const k = uidKey(target);
  await db.ref('muted/'+k).remove();
  await logAdmin('unmuteUser', {target});
  alert('Unmuted '+target);
}

async function shadowbanUser(target){
  if(!await requireAdmin()) return;
  const k = uidKey(target);
  await db.ref('shadowbanned/'+k).set({ by: auth.currentUser.uid||auth.currentUser.email, ts: Date.now() });
  await logAdmin('shadowbanUser', {target});
  alert('Shadowbanned '+target);
}

async function unshadowbanUser(target){
  if(!await requireAdmin()) return;
  const k = uidKey(target);
  await db.ref('shadowbanned/'+k).remove();
  await logAdmin('unshadowbanUser', {target});
  alert('Unshadowbanned '+target);
}

async function forceLogout(target){
  if(!await requireAdmin()) return;
  const k = uidKey(target);
  await db.ref('force_logout/'+k).set(true);
  await logAdmin('forceLogout', {target});
  alert('Force logout signal sent to '+target);
}

async function changeNickname(target, newName){
  if(!await requireAdmin()) return;
  const k = uidKey(target);
  await db.ref('nicknames/'+k).set({name:newName, by: auth.currentUser.uid||auth.currentUser.email, ts: Date.now()});
  await logAdmin('changeNickname', {target, newName});
  alert('Nickname changed for '+target);
}

async function resetPfp(target){
  if(!await requireAdmin()) return;
  const k = uidKey(target);
  await db.ref('pfp/'+k).set({url:'default', by: auth.currentUser.uid||auth.currentUser.email, ts: Date.now()});
  await logAdmin('resetPfp', {target});
  alert('PFP reset for '+target);
}

// --- CHAT MODERATION ---
async function clearChat(room){
  if(!await requireAdmin()) return;
  room = room||'global';
  await db.ref('messages/'+room).set(null);
  await logAdmin('clearChat', {room});
  alert('Cleared chat: '+room);
}

async function deleteUserMessages(target){
  if(!await requireAdmin()) return;
  const k = uidKey(target);
  const roomsSnap = await db.ref('rooms').once('value');
  const rooms = roomsSnap.exists()? Object.keys(roomsSnap.val()): ['global'];
  for(const r of rooms){
    const messagesRef = db.ref('messages/'+r);
    const snap = await messagesRef.once('value');
    if(!snap.exists()) continue;
    const updates = {};
    snap.forEach(child=>{
      const m = child.val();
      if(m && ((m.uid && uidKey(m.uid)===k) || (m.email && uidKey(m.email)===k))){
        updates[child.key]=null;
      }
    });
    if(Object.keys(updates).length) await messagesRef.update(updates);
  }
  await logAdmin('deleteUserMessages', {target});
  alert('Deleted messages for '+target);
}

async function deleteMessage(room, msgKey){
  if(!await requireAdmin()) return;
  room = room||'global';
  await db.ref('messages/'+room+'/'+msgKey).remove();
  await logAdmin('deleteMessage', {room, msgKey});
  alert('Deleted message '+msgKey+' in '+room);
}

async function globalAnnouncement(text){
  if(!await requireAdmin()) return;
  const payload = {text, ts: Date.now(), admin: auth.currentUser.uid||auth.currentUser.email};
  await db.ref('announcements').push(payload);
  await logAdmin('globalAnnouncement', {text});
  alert('Announcement sent.');
}

// --- ROOM CONTROL ---
async function lockRoom(room){
  if(!await requireAdmin()) return;
  await db.ref('rooms/'+room+'/locked').set(true);
  await logAdmin('lockRoom', {room});
  alert('Locked room '+room);
}

async function unlockRoom(room){
  if(!await requireAdmin()) return;
  await db.ref('rooms/'+room+'/locked').set(false);
  await logAdmin('unlockRoom', {room});
  alert('Unlocked room '+room);
}

async function setSlowmode(room, msDelay){
  if(!await requireAdmin()) return;
  await db.ref('rooms/'+room+'/slowmode').set(msDelay||0);
  await logAdmin('setSlowmode', {room, msDelay});
  alert('Set slowmode for '+room+' to '+msDelay+'ms');
}

async function createRoom(roomName){
  if(!await requireAdmin()) return;
  if(!roomName) { alert('Room name required'); return; }
  const key = roomName.replace(/\./g,'_');
  await db.ref('rooms/'+key).set({name:roomName, createdBy: auth.currentUser.uid||auth.currentUser.email, ts: Date.now(), locked:false, slowmode:0});
  await db.ref('messages/'+key).set(null);
  await logAdmin('createRoom', {roomName});
  alert('Created room '+roomName);
}

async function deleteRoom(roomName){
  if(!await requireAdmin()) return;
  const key = roomName.replace(/\./g,'_');
  await db.ref('rooms/'+key).set(null);
  await db.ref('messages/'+key).set(null);
  await logAdmin('deleteRoom', {roomName});
  alert('Deleted room '+roomName);
}

// --- UI CUSTOMIZATION ---
async function setAccentColor(colorHex){
  if(!await requireAdmin()) return;
  const custom = JSON.parse(localStorage.getItem('siteCustom')||'{}');
  custom.accentColor = colorHex;
  localStorage.setItem('siteCustom', JSON.stringify(custom));
  // persist on server
  await db.ref('siteCustom/accentColor').set(colorHex);
  await logAdmin('setAccentColor', {colorHex});
  document.documentElement.style.setProperty('--accent', colorHex);
}

async function setBackground(url){
  if(!await requireAdmin()) return;
  const custom = JSON.parse(localStorage.getItem('siteCustom')||'{}');
  custom.bgUrl = url;
  localStorage.setItem('siteCustom', JSON.stringify(custom));
  await db.ref('siteCustom/bgUrl').set(url);
  await logAdmin('setBackground', {url});
  document.body.style.backgroundImage = `url(${url})`;
}

async function setServerLogo(url){
  if(!await requireAdmin()) return;
  const custom = JSON.parse(localStorage.getItem('siteCustom')||'{}');
  custom.logoUrl = url;
  localStorage.setItem('siteCustom', JSON.stringify(custom));
  await db.ref('siteCustom/logoUrl').set(url);
  await logAdmin('setServerLogo', {url});
  const logo=document.querySelector('.site-logo');
  if(logo) logo.src=url;
}

async function setServerTitle(title){
  if(!await requireAdmin()) return;
  const custom = JSON.parse(localStorage.getItem('siteCustom')||'{}');
  custom.siteTitle = title;
  localStorage.setItem('siteCustom', JSON.stringify(custom));
  await db.ref('siteCustom/siteTitle').set(title);
  await logAdmin('setServerTitle', {title});
  const t=document.querySelector('.site-title');
  if(t) t.textContent=title;
  document.title = title;
}

// --- ADMIN COMMAND PROCESSOR ---
// Admins can push structured commands to /admin_commands and they will be processed automatically.
db.ref('admin_commands').on('child_added', async snap=>{
  const cmd = snap.val();
  const key = snap.key;
  if(!cmd) return;
  if(cmd.processed) return;
  try{
    // basic mapping based on cmd.name
    const c = (cmd.name||'').toLowerCase();
    const payload = cmd.payload||{};
    if(c==='ban' || c==='banuser') await banUser(payload.target || payload.uid || payload.email);
    else if(c==='unban' || c==='unbanuser') await unbanUser(payload.target || payload.uid || payload.email);
    else if(c==='mute' || c==='muteuser') await muteUser(payload.target || payload.uid || payload.email);
    else if(c==='unmute' || c==='unmuteuser') await unmuteUser(payload.target || payload.uid || payload.email);
    else if(c==='shadowban') await shadowbanUser(payload.target || payload.uid || payload.email);
    else if(c==='unshadowban') await unshadowbanUser(payload.target || payload.uid || payload.email);
    else if(c==='forcelogout') await forceLogout(payload.target || payload.uid || payload.email);
    else if(c==='changenickname') await changeNickname(payload.target || payload.uid || payload.email, payload.newName);
    else if(c==='resetpfp') await resetPfp(payload.target || payload.uid || payload.email);
    else if(c==='clearchat') await clearChat(payload.room || 'global');
    else if(c==='deleteusermessages') await deleteUserMessages(payload.target || payload.uid || payload.email);
    else if(c==='deletemessage') await deleteMessage(payload.room || 'global', payload.msgKey);
    else if(c==='globalannouncement') await globalAnnouncement(payload.text||payload.message||'');
    else if(c==='lockroom') await lockRoom(payload.room);
    else if(c==='unlockroom') await unlockRoom(payload.room);
    else if(c==='setslowmode') await setSlowmode(payload.room, payload.msDelay||0);
    else if(c==='createroom') await createRoom(payload.roomName||payload.room);
    else if(c==='deleteroom') await deleteRoom(payload.roomName||payload.room);
    else if(c==='freeserver' || c==='freezeserver' || c==='freeze') {
      await db.ref('server/frozen').set(true);
      await logAdmin('freezeServer', {});
    }
    else if(c==='unfreeze') {
      await db.ref('server/frozen').set(false);
      await logAdmin('unfreezeServer', {});
    }
    else if(c==='setaccent') await setAccentColor(payload.colorHex||payload.color);
    else if(c==='setbackground') await setBackground(payload.url||payload.bg);
    else if(c==='setserverlogo') await setServerLogo(payload.url);
    else if(c==='setservertitle') await setServerTitle(payload.title||payload.text);
    // mark processed
    await db.ref('admin_commands/'+key+'/processed').set(true);
    await db.ref('admin_commands/'+key+'/processed_by').set(auth.currentUser? (auth.currentUser.uid||auth.currentUser.email) : 'auto');
  }catch(e){
    console.error('Admin command processing error', e);
    // still mark processed with error
    await db.ref('admin_commands/'+key+'/error').set(String(e));
    await db.ref('admin_commands/'+key+'/processed').set(true);
  }
});
