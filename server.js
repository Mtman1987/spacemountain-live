const express = require('express');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable JSON middleware
app.use(express.json());

// Initialize SQLite database
const dbFile = path.join(__dirname, 'database.db');
const db = new DatabaseSync(dbFile);

console.log(`[Database] Initializing SQLite database at ${dbFile}`);

// Create database schemas
db.exec(`
  CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS user_identity (
    username TEXT PRIMARY KEY,
    displayName TEXT,
    address TEXT,
    recovery TEXT
  );
`);

// Set default settings if not already present
const defaultSettings = {
  themePreset: 'solar', // solar, nebula, ocean, aurora
  accentColor: '#ff6a2a',
  glassOpacity: '65',
  blurStrength: '22',
  glowIntensity: '80',
  starDensity: '70',
  nebulaIntensity: '80',
  parallaxDepth: '65',
  uiDensity: 'comfortable', // compact, comfortable, spacious
  borderStrength: '60',
  cornerRadius: 'md', // sm, md, lg, full
  sidebarStyle: 'docked', // docked, floating, hidden
  sidebarPosition: 'left', // left, right
  topbarStyle: 'transparent' // transparent, glass
};

// Check if default settings exist
const checkSettingsStmt = db.prepare('SELECT value FROM system_config WHERE key = ?');
const existingSettings = checkSettingsStmt.get('settings');

if (!existingSettings) {
  console.log('[Database] Writing default settings to SQLite...');
  const saveSettingsStmt = db.prepare('INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)');
  saveSettingsStmt.run('settings', JSON.stringify(defaultSettings));
}

// Check if default user identity exists
const checkIdentityStmt = db.prepare('SELECT * FROM user_identity LIMIT 1');
const existingIdentity = checkIdentityStmt.get();

if (!existingIdentity) {
  console.log('[Database] Writing default profile NovaStar to SQLite...');
  const saveIdentityStmt = db.prepare('INSERT INTO user_identity (username, displayName, address, recovery) VALUES (?, ?, ?, ?)');
  saveIdentityStmt.run('novastar', 'NovaStar', 'novastar@spmt.live', 'recovery@spmt.live');
}

// API: Get global theme settings
app.get('/api/settings', (req, res) => {
  try {
    const stmt = db.prepare('SELECT value FROM system_config WHERE key = ?');
    const row = stmt.get('settings');
    if (row) {
      res.json(JSON.parse(row.value));
    } else {
      res.json(defaultSettings);
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to retrieve settings' });
  }
});

// API: Update global theme settings
app.post('/api/settings', (req, res) => {
  try {
    const newSettings = req.body;
    const stmt = db.prepare('INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)');
    stmt.run('settings', JSON.stringify(newSettings));
    res.json({ success: true, settings: newSettings });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// API: Get user profile/identity
app.get('/api/identity', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM user_identity LIMIT 1');
    const row = stmt.get();
    if (row) {
      res.json({
        username: row.username,
        displayName: row.displayName,
        address: row.address,
        recovery: row.recovery
      });
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error('Error fetching identity:', error);
    res.status(500).json({ error: 'Failed to retrieve identity' });
  }
});

// API: Save user profile/identity
app.post('/api/identity', (req, res) => {
  try {
    const { username, displayName, address, recovery } = req.body;
    const key = username || 'novastar';
    const stmt = db.prepare('INSERT OR REPLACE INTO user_identity (username, displayName, address, recovery) VALUES (?, ?, ?, ?)');
    stmt.run(key, displayName, address, recovery);
    res.json({ success: true, identity: { username: key, displayName, address, recovery } });
  } catch (error) {
    console.error('Error saving identity:', error);
    res.status(500).json({ error: 'Failed to save identity' });
  }
});

// API: Delete identity (Sign out)
app.delete('/api/identity', (req, res) => {
  try {
    db.exec('DELETE FROM user_identity');
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing identity:', error);
    res.status(500).json({ error: 'Failed to delete identity' });
  }
});

// API: Forum post reaction (webhook forwarding logging)
app.post('/api/forums/reaction', (req, res) => {
  const { messageId, reaction, username } = req.body;
  console.log(`[Webhook Alert] Reaction '${reaction}' added to messageId: '${messageId}' by user: '${username}'`);
  console.log(`[Discord Forwarder] POST request to Discord Webhook payload: { message_id: "${messageId}", reaction: "${reaction}", user: "${username}" }`);
  res.json({ success: true, status: 'Reaction queued for webhook sync' });
});

// Serve frontend static assets
app.use(express.static(path.join(__dirname, 'frontend')));

// Also expose root static for legacy assets (images, database)
app.use('/legacy', express.static(__dirname));

// Serve frontend index.html for all page requests (fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[Server] SPACEMOUNTAIN.LIVE running at http://localhost:${PORT}`);
});
