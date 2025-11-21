Admin features implemented:
- Admin actions write to realtime DB and are auto-processed where possible.
- Admin commands affect nodes: /banned, /muted, /shadowbanned, /force_logout, /locked, /slowmode, /chatrooms/{room}/messages removed
- All admin actions are logged under /admin_logs
- To use: add admin email key for proadmin@proton.me under /admins in the database to grant access.
- Replace js/firebase_init.js with your Firebase config.
