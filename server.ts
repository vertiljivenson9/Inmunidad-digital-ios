import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import { createServer } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("shared_container.db");

// Initialize Shared Container DB
db.exec(`
  CREATE TABLE IF NOT EXISTS process_health (
    process_id TEXT PRIMARY KEY,
    pid INTEGER,
    last_seen INTEGER,
    restart_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS checkpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    process_id TEXT,
    state_json TEXT,
    timestamp INTEGER
  );

  CREATE TABLE IF NOT EXISTS ml_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name TEXT,
    inference_time_ms REAL,
    energy_mJ REAL,
    timestamp INTEGER
  );

  INSERT OR IGNORE INTO process_health (process_id, pid, last_seen, status, restart_count) VALUES ('vpn', 0, 0, 'terminated', 0);
  INSERT OR IGNORE INTO process_health (process_id, pid, last_seen, status, restart_count) VALUES ('filter', 0, 0, 'terminated', 0);
  INSERT OR IGNORE INTO process_health (process_id, pid, last_seen, status, restart_count) VALUES ('app', 0, 0, 'terminated', 0);
`);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer);
  const PORT = 3000;

  app.use(express.json());

  // Real-time broadcast helper
  const broadcastStatus = () => {
    const health = db.prepare("SELECT * FROM process_health").all();
    io.emit("status_update", health);
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    const health = db.prepare("SELECT * FROM process_health").all();
    res.json(health);
  });

  app.post("/api/heartbeat", (req, res) => {
    const { process_id, pid } = req.body;
    const now = Date.now();
    db.prepare("UPDATE process_health SET last_seen = ?, pid = ?, status = 'active' WHERE process_id = ?")
      .run(now, pid, process_id);
    broadcastStatus();
    res.json({ success: true });
  });

  app.post("/api/kill", (req, res) => {
    const { process_id } = req.body;
    db.prepare("UPDATE process_health SET status = 'terminated', pid = 0 WHERE process_id = ?")
      .run(process_id);
    broadcastStatus();
    res.json({ success: true });
  });

  // Server-side Watchdog (Real Infrastructure)
  setInterval(() => {
    const now = Date.now();
    const processes = db.prepare("SELECT * FROM process_health").all() as any[];
    
    let changed = false;
    processes.forEach(p => {
      // If active but no heartbeat for 15 seconds, mark as terminated
      if (p.status === 'active' && (now - p.last_seen > 15000)) {
        db.prepare("UPDATE process_health SET status = 'terminated', pid = 0 WHERE process_id = ?")
          .run(p.process_id);
        changed = true;
      }
      
      // If terminated and 'app' is alive, restart it (Watchdog logic)
      const appProcess = processes.find(proc => proc.process_id === 'app');
      if (p.status === 'terminated' && appProcess?.status === 'active' && p.process_id !== 'app') {
        // In a real system, this would trigger an XPC restart. 
        // Here we simulate the restart by updating the DB.
        db.prepare("UPDATE process_health SET status = 'active', last_seen = ?, restart_count = restart_count + 1 WHERE process_id = ?")
          .run(now, p.process_id);
        changed = true;
      }
    });

    if (changed) {
      broadcastStatus();
    }
  }, 2000);

  app.get("/api/config-profile", (req, res) => {
    const profile = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>PayloadDescription</key>
            <string>Configures VPN for Digital Immunity</string>
            <key>PayloadDisplayName</key>
            <string>Digital Immunity VPN</string>
            <key>PayloadIdentifier</key>
            <string>com.immunity.vpn.config</string>
            <key>PayloadType</key>
            <string>com.apple.vpn.managed</string>
            <key>PayloadUUID</key>
            <string>12345678-1234-1234-1234-123456789012</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>VPNType</key>
            <string>VPN</string>
            <key>OnDemandEnabled</key>
            <integer>1</integer>
            <key>OnDemandRules</key>
            <array>
                <dict>
                    <key>Action</key>
                    <string>Connect</string>
                    <key>DomainAction</key>
                    <string>ConnectIfNeeded</string>
                    <key>Domains</key>
                    <array>
                        <string>instagram.com</string>
                        <string>facebook.com</string>
                        <string>tiktok.com</string>
                    </array>
                </dict>
            </array>
        </dict>
    </array>
    <key>PayloadDisplayName</key>
    <string>Inmunidad Digital Colectiva</string>
    <key>PayloadIdentifier</key>
    <string>com.immunity.profile</string>
    <key>PayloadRemovalDisallowed</key>
    <false/>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>87654321-4321-4321-4321-210987654321</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;
    res.setHeader("Content-Type", "application/x-apple-aspen-config");
    res.send(profile);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist/index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
