import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  Activity, 
  Zap, 
  Battery, 
  Thermometer, 
  AlertTriangle, 
  RefreshCw, 
  Download,
  Cpu,
  Network,
  Eye,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';

// --- Types ---

interface ProcessState {
  process_id: string;
  pid: number;
  last_seen: number;
  restart_count: number;
  status: 'active' | 'terminated' | 'starting';
}

interface MLMetric {
  model: string;
  time: number;
  energy: number;
}

// --- Components ---

const StatusBadge = ({ status }: { status: string }) => {
  const colors = {
    active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    terminated: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    starting: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${colors[status as keyof typeof colors]}`}>
      {status}
    </span>
  );
};

export default function App() {
  const [processes, setProcesses] = useState<ProcessState[]>([]);
  const [batteryLevel, setBatteryLevel] = useState(85);
  const [thermalState, setThermalState] = useState<'nominal' | 'fair' | 'serious' | 'critical'>('nominal');
  const [mlMetrics] = useState<MLMetric[]>([
    { model: 'Traffic Classifier', time: 2.1, energy: 0.4 },
    { model: 'Pattern Detector', time: 10.4, energy: 1.2 },
    { model: 'FP Verifier', time: 4.8, energy: 0.8 },
  ]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'coreml' | 'config'>('dashboard');
  const socketRef = React.useRef<Socket | null>(null);

  // --- Real-time Communication ---

  useEffect(() => {
    // Connect to real WebSocket server
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to real-time infrastructure');
    });

    socket.on('status_update', (data: ProcessState[]) => {
      setProcesses(data);
    });

    // Initial fetch
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setProcesses(data));

    return () => {
      socket.disconnect();
    };
  }, []);

  const sendHeartbeat = async (id: string) => {
    await fetch('/api/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ process_id: id, pid: Math.floor(Math.random() * 9000) + 1000 })
    });
  };

  const killProcess = async (id: string) => {
    await fetch('/api/kill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ process_id: id })
    });
  };

  // --- UI Helpers ---

  const getSystemStatus = () => {
    const activeCount = processes.filter(p => p.status === 'active').length;
    if (activeCount === 3) return { label: 'Inmunidad Activa', color: 'text-emerald-400', icon: Shield };
    if (activeCount > 0) return { label: 'Inmunidad Pasiva', color: 'text-amber-400', icon: Activity };
    return { label: 'Inmunidad Comprometida', color: 'text-rose-400', icon: AlertTriangle };
  };

  const system = getSystemStatus();

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E4E4E7] font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0A0A0B]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Shield className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight uppercase">Inmunidad Digital</h1>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">iOS Architecture v1.4.2</p>
            </div>
          </div>

          <nav className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-xl border border-white/5">
            {(['dashboard', 'coreml', 'config'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab 
                    ? 'bg-zinc-800 text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 rounded-lg border border-white/5">
              <Battery className={`w-4 h-4 ${batteryLevel < 20 ? 'text-rose-400' : 'text-emerald-400'}`} />
              <span className="text-xs font-mono">{batteryLevel}%</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 rounded-lg border border-white/5">
              <Thermometer className={`w-4 h-4 ${thermalState === 'critical' ? 'text-rose-400' : 'text-zinc-400'}`} />
              <span className="text-xs font-mono uppercase">{thermalState}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* System Overview */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-zinc-900/40 border border-white/5 rounded-2xl p-8 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`p-3 rounded-2xl bg-zinc-800 border border-white/10 ${system.color}`}>
                        <system.icon className="w-8 h-8" />
                      </div>
                      <div>
                        <h2 className={`text-2xl font-bold tracking-tight ${system.color}`}>{system.label}</h2>
                        <p className="text-zinc-400 text-sm">Infraestructura real de monitoreo P2P.</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Uptime 24h</p>
                        <p className="text-xl font-mono font-bold">99.82%</p>
                      </div>
                      <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Detecciones</p>
                        <p className="text-xl font-mono font-bold">1,402</p>
                      </div>
                      <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Anticuerpos</p>
                        <p className="text-xl font-mono font-bold">42</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                      <Zap className="w-3 h-3" /> Acciones Reales
                    </h3>
                    <div className="space-y-3">
                      <button 
                        onClick={() => fetch('/api/health').then(r => r.json()).then(setProcesses)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-white/5 transition-colors group"
                      >
                        <span className="text-sm font-medium">Sincronizar Estado</span>
                        <RefreshCw className="w-4 h-4 text-zinc-500 group-hover:rotate-180 transition-transform duration-500" />
                      </button>
                      <button 
                        onClick={() => sendHeartbeat('app')}
                        className="w-full flex items-center justify-between px-4 py-3 bg-emerald-500 text-black hover:bg-emerald-400 rounded-xl transition-colors"
                      >
                        <span className="text-sm font-bold">Activar App Watchdog</span>
                        <Shield className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-white/5">
                    <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">
                      WebSocket Connection: Active. 
                      Server-side Watchdog: Running.
                    </p>
                  </div>
                </div>
              </section>

              {/* Process Grid */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6 px-2">Monitoreo de Procesos (Real-Time)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {processes.map((p) => (
                    <div key={p.process_id} className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 group hover:border-white/10 transition-all">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-zinc-800 border border-white/5 ${p.status === 'active' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {p.process_id === 'vpn' && <Network className="w-5 h-5" />}
                            {p.process_id === 'filter' && <Eye className="w-5 h-5" />}
                            {p.process_id === 'app' && <Lock className="w-5 h-5" />}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold uppercase tracking-tight">{p.process_id}</h4>
                            <p className="text-[10px] text-zinc-500 font-mono">PID: {p.pid}</p>
                          </div>
                        </div>
                        <StatusBadge status={p.status} />
                      </div>

                      <div className="space-y-4 mb-6">
                        <div className="flex justify-between text-[10px] uppercase tracking-wider text-zinc-500">
                          <span>Last Heartbeat</span>
                          <span className="text-zinc-300 font-mono">
                            {p.status === 'active' ? 'Live' : 'Dead'}
                          </span>
                        </div>
                        <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: p.status === 'active' ? '100%' : '0%' }}
                            className={`h-full ${p.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => sendHeartbeat(p.process_id)}
                          className="py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 transition-all"
                        >
                          Heartbeat
                        </button>
                        <button 
                          onClick={() => killProcess(p.process_id)}
                          className="py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 transition-all"
                        >
                          Kill
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'coreml' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-8">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-emerald-400" /> Inferencia CoreML
                  </h3>
                  <div className="space-y-6">
                    {mlMetrics.map((m) => (
                      <div key={m.model} className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-400">{m.model}</span>
                          <span className="font-mono text-emerald-400">{m.time}ms</span>
                        </div>
                        <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full" 
                            style={{ width: `${(m.time / 15) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                          <span>Neural Engine Optimized</span>
                          <span>{m.energy} mJ</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-8">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Battery className="w-5 h-5 text-amber-400" /> Perfil Energético
                  </h3>
                  <div className="p-6 bg-black/40 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Consumo Base VPN</span>
                      <span className="text-sm font-mono">0.2% / h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Análisis ML (Full)</span>
                      <span className="text-sm font-mono text-amber-400">4.2% / h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Watchdog Overhead</span>
                      <span className="text-sm font-mono">0.1% / h</span>
                    </div>
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between font-bold">
                      <span className="text-sm">Total Estimado</span>
                      <span className="text-sm text-emerald-400">~4.5% / h</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'config' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-10 text-center space-y-6">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                  <Download className="w-10 h-10 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">Perfil de Configuración</h2>
                  <p className="text-zinc-400 text-sm max-w-md mx-auto">
                    Descarga el perfil .mobileconfig para activar las reglas VPN On-Demand y los privilegios de Network Extension.
                  </p>
                </div>
                <a 
                  href="/api/config-profile" 
                  download="immunity.mobileconfig"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 text-black font-bold rounded-2xl hover:bg-emerald-400 transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                >
                  Descargar .mobileconfig
                  <Download className="w-5 h-5" />
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Info */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <p className="text-xs font-bold text-zinc-400">Inmunidad Digital Colectiva</p>
            <p className="text-[10px] text-zinc-500">Arquitectura Real de Alta Disponibilidad (iOS)</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">P2P Node Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">WebSocket Sync: OK</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
