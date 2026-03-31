import { useEffect, useMemo, useState, useRef } from "react";

// ============================================
// CONFIGURACIÓN DEL PERFIL - EDITA AQUÍ TUS DATOS
// ============================================
// Para crear un perfil para cada persona:
// 1. Duplica este repositorio en GitHub
// 2. Edita esta sección con los datos de la persona
// 3. Haz deploy a GitHub Pages
// 4. Genera un QR apuntando a la URL publicada
// ============================================

const PROFILE_CONFIG = {
  // ===== DATOS PERSONALES =====
  nombre: "ALEX MENDOZA RÍOS",
  edad: 28,
  tipoSangre: "O+",
  nss: "IMSS: 12345678901", // Opcional
  
  // ===== INFORMACIÓN MÉDICA CRÍTICA =====
  alergias: [
    "Penicilina - Reacción severa",
    "Mariscos",
    "Picadura de abeja - Usa EpiPen"
  ],
  condiciones: [
    "Asma leve controlada",
    "Miopía - Usa lentes de contacto"
  ],
  medicamentos: [
    "Salbutamol inhalador (según necesidad)",
    "Loratadina 10mg diaria"
  ],
  notasMedicas: "Porta EpiPen en mochila lateral derecha. En caso de shock anafiláctico, administrar de inmediato y llamar a emergencias.",
  
  // ===== CONTACTOS DE EMERGENCIA =====
  // Orden de prioridad: 1 = llamar primero
  contactos: [
    {
      nombre: "Mamá - Laura Ríos",
      parentesco: "Madre",
      telefono: "+52 55 1234 5678",
      email: "laura.rios@email.com",
      whatsapp: "5215512345678", // Formato: 521 + 10 dígitos sin espacios
      prioridad: 1
    },
    {
      nombre: "Hermano - Daniel Mendoza",
      parentesco: "Hermano",
      telefono: "+52 55 8765 4321",
      email: "daniel.m@email.com",
      whatsapp: "5215587654321",
      prioridad: 2
    },
    {
      nombre: "Pareja - Sofía Torres",
      parentesco: "Pareja",
      telefono: "+52 55 1122 3344",
      email: "sofia.t@email.com",
      whatsapp: "5215511223344",
      prioridad: 3
    },
  ],
  
  // ===== INFORMACIÓN DEL VEHÍCULO =====
  vehiculo: {
    tipo: "Motocicleta",
    marca: "Honda",
    modelo: "CB190R",
    color: "Rojo/Negro",
    placas: "ABC-123-A",
    seguro: "Qualitas - Póliza: Q-987654321"
  },
  
  // ===== CONFIGURACIÓN DE EMERGENCIA =====
  hospitalPreferido: "Hospital Español - Av. Ejército Nacional 613",
  medicoTratante: "Dr. Ramírez - 55 2468 1357",
  donadorOrganos: true,
  
  // ===== MENSAJE PERSONALIZADO =====
  mensajeEmergencia: "¡URGENTE! Alex tuvo un accidente. Por favor responde este mensaje. Ubicación compartida a continuación.",
} as const;

// ============================================
// TIPOS
// ============================================

type ScanLog = {
  timestamp: string;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  userAgent: string;
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function App() {
  const [modo, setModo] = useState<"setup" | "lockscreen" | "emergencia">("lockscreen");
  const [emergenciaActiva, setEmergenciaActiva] = useState(false);
  const [ubicacion, setUbicacion] = useState<{lat: number; lng: number; accuracy: number} | null>(null);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [mostrarInstrucciones, setMostrarInstrucciones] = useState(false);
  
  const emergenciaRef = useRef<HTMLDivElement>(null);

  // Detectar si es el propietario (modo configuración)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("config") === "true" || window.location.hash === "#config") {
      setModo("setup");
    }
  }, []);

  // Registrar escaneo automáticamente
  useEffect(() => {
    if (modo !== "lockscreen" && modo !== "emergencia") return;
    
    const logScan = async () => {
      const timestamp = new Date().toISOString();
      
      // Intentar obtener ubicación
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const newLog: ScanLog = {
              timestamp,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              userAgent: navigator.userAgent.slice(0, 100)
            };
            setUbicacion({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy
            });
            setScanLogs(prev => [newLog, ...prev.slice(0, 9)]);
            localStorage.setItem(`emergency_scan_${PROFILE_CONFIG.nombre}`, JSON.stringify([newLog]));
          },
          () => {
            const newLog: ScanLog = {
              timestamp,
              lat: null,
              lng: null,
              accuracy: null,
              userAgent: navigator.userAgent.slice(0, 100)
            };
            setScanLogs(prev => [newLog, ...prev.slice(0, 9)]);
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
      }
    };
    
    logScan();
  }, [modo]);

  // Activar emergencia
  const activarEmergencia = () => {
    setEmergenciaActiva(true);
    setModo("emergencia");
    // Vibración
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 300]);
    
    // Scroll al contenido
    setTimeout(() => {
      emergenciaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // Generar mensajes
  const mensajeWhatsApp = useMemo(() => {
    const ubicacionText = ubicacion 
      ? `📍 Ubicación: https://www.google.com/maps?q=${ubicacion.lat},${ubicacion.lng}\nExactitud: ~${Math.round(ubicacion.accuracy)}m`
      : "📍 Ubicación: No disponible (permite GPS para compartir)";
    
    return encodeURIComponent(
      `🚨 EMERGENCIA - ${PROFILE_CONFIG.nombre}\n\n${PROFILE_CONFIG.mensajeEmergencia}\n\n${ubicacionText}\n\n🩸 Tipo de sangre: ${PROFILE_CONFIG.tipoSangre}\n⚠️ Alergias: ${PROFILE_CONFIG.alergias.join(", ")}\n\nHora: ${new Date().toLocaleString("es-MX")}`
    );
  }, [ubicacion]);

  const mensajeSMS = useMemo(() => {
    const ubicacionText = ubicacion 
      ? `Maps: https://maps.google.com/?q=${ubicacion.lat},${ubicacion.lng}`
      : "Ubicacion no disponible";
    return encodeURIComponent(
      `EMERGENCIA: ${PROFILE_CONFIG.nombre} tuvo un accidente. ${ubicacionText} Sangre: ${PROFILE_CONFIG.tipoSangre}. Alergias: ${PROFILE_CONFIG.alergias[0] || 'Ninguna reportada'}`
    );
  }, [ubicacion]);

  const asuntoEmail = useMemo(() => 
    encodeURIComponent(`🚨 EMERGENCIA - ${PROFILE_CONFIG.nombre} - ACCIDENTE`)
  , []);

  const cuerpoEmail = useMemo(() => {
    const ubicacionText = ubicacion 
      ? `Ubicación: https://www.google.com/maps?q=${ubicacion.lat},${ubicacion.lng} (precisión ${Math.round(ubicacion.accuracy)}m)`
      : "Ubicación GPS no disponible";
    
    return encodeURIComponent(`
ALERTA DE EMERGENCIA

La persona ${PROFILE_CONFIG.nombre} ha sufrido un accidente.

DETALLES MÉDICOS CRÍTICOS:
• Tipo de sangre: ${PROFILE_CONFIG.tipoSangre}
• Alergias: ${PROFILE_CONFIG.alergias.join("; ")}
• Condiciones: ${PROFILE_CONFIG.condiciones.join("; ")}
• Medicamentos actuales: ${PROFILE_CONFIG.medicamentos.join("; ")}
• Notas: ${PROFILE_CONFIG.notasMedicas}

INFORMACIÓN DE CONTACTO:
• Vehículo: ${PROFILE_CONFIG.vehiculo.tipo} ${PROFILE_CONFIG.vehiculo.marca} ${PROFILE_CONFIG.vehiculo.modelo} - Placas: ${PROFILE_CONFIG.vehiculo.placas}
• Hospital preferido: ${PROFILE_CONFIG.hospitalPreferido}
• Donador de órganos: ${PROFILE_CONFIG.donadorOrganos ? "SÍ" : "NO"}

${ubicacionText}
Hora del incidente: ${new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" })}

Este mensaje fue generado automáticamente desde el código QR de emergencia.
    `.trim());
  }, [ubicacion]);

  const copiar = async (texto: string, id: string) => {
    await navigator.clipboard.writeText(texto);
    setCopiado(id);
    setTimeout(() => setCopiado(null), 2000);
  };

  // ============================================
  // RENDER: MODO CONFIGURACIÓN
  // ============================================
  if (modo === "setup") {
    return (
      <div className="min-h-screen bg-[#0a0e14] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#ff3b30]/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative max-w-4xl mx-auto px-4 py-8 md:py-12">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[#ff3b30] to-[#ff6b5b] flex items-center justify-center shadow-lg shadow-[#ff3b30]/20">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">VIAL•ID</h1>
                <p className="text-xs text-zinc-400 -mt-0.5">Perfil de Emergencia</p>
              </div>
            </div>
            <button
              onClick={() => setModo("lockscreen")}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition"
            >
              Vista previa →
            </button>
          </div>

          {/* Card principal */}
          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900/50 backdrop-blur-xl overflow-hidden">
            <div className="border-b border-zinc-800 bg-gradient-to-r from-zinc-900 to-zinc-900/50 px-6 py-5">
              <h2 className="text-lg font-semibold">Configuración del perfil</h2>
              <p className="text-sm text-zinc-400 mt-1">Edita directamente en el código fuente (líneas 11-90)</p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Instrucciones para GitHub */}
              <div className="rounded-2xl border border-[#ff3b30]/20 bg-[#ff3b30]/5 p-5">
                <h3 className="font-semibold text-[#ff8a80] mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#ff3b30]/20 text-xs">1</span>
                  Cómo crear tu código personalizado
                </h3>
                <ol className="space-y-2.5 text-sm text-zinc-300 ml-1">
                  <li className="flex gap-3">
                    <span className="text-zinc-500 mt-0.5">•</span>
                    <span><strong className="text-white">Edita PROFILE_CONFIG</strong> en src/App.tsx (arriba del código) con tus datos reales</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-zinc-500 mt-0.5">•</span>
                    <span><strong className="text-white">Haz commit y push</strong> a tu repositorio de GitHub</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-zinc-500 mt-0.5">•</span>
                    <span>En GitHub: Settings → Pages → Deploy from branch → main → / (root)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-zinc-500 mt-0.5">•</span>
                    <span>Copia la URL (ej: https://tunombre.github.io/vial-id/)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-zinc-500 mt-0.5">•</span>
                    <span><strong className="text-white">Genera un QR</strong> con esa URL e imprímelo en material resistente</span>
                  </li>
                </ol>
                
                <button
                  onClick={() => setMostrarInstrucciones(!mostrarInstrucciones)}
                  className="mt-4 text-xs text-[#ff8a80] hover:text-[#ffab91] font-medium"
                >
                  {mostrarInstrucciones ? "Ocultar detalles técnicos" : "Ver detalles técnicos →"}
                </button>
                
                {mostrarInstrucciones && (
                  <div className="mt-4 pt-4 border-t border-zinc-800 space-y-3 text-xs font-mono">
                    <div>
                      <p className="text-zinc-500 mb-1">Estructura de datos (App.tsx:11):</p>
                      <pre className="bg-black/50 p-3 rounded-lg overflow-x-auto text-zinc-300">
{`const PROFILE_CONFIG = {
  nombre: "TU NOMBRE",
  tipoSangre: "O+",
  alergias: ["...", "..."],
  contactos: [{
    nombre: "...",
    telefono: "+52...",
    whatsapp: "521...", // sin +
    email: "...",
    prioridad: 1
  }],
  vehiculo: { tipo, marca, placas }
}`}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Preview de datos actuales */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-zinc-800 p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-zinc-200">Datos actuales (preview)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Nombre:</span>
                      <span className="font-medium">{PROFILE_CONFIG.nombre}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Sangre:</span>
                      <span className="font-mono font-bold text-[#ff6b5b]">{PROFILE_CONFIG.tipoSangre}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Contactos:</span>
                      <span className="font-medium">{PROFILE_CONFIG.contactos.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Vehículo:</span>
                      <span className="font-medium text-zinc-300">{PROFILE_CONFIG.vehiculo.placas}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <h4 className="text-sm font-semibold text-amber-200 mb-2 flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 9v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Importante
                  </h4>
                  <ul className="space-y-1.5 text-xs text-amber-100/80">
                    <li>• Cada persona = 1 repositorio</li>
                    <li>• WhatsApp usa formato: 5215512345678</li>
                    <li>• Los datos se guardan en el código, no en servidor</li>
                    <li>• Funciona sin internet (excepto ubicación y envío)</li>
                  </ul>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-wrap gap-3 pt-2">
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); setModo("lockscreen"); }}
                  className="px-5 py-2.5 rounded-xl bg-[#ff3b30] hover:bg-[#ff5247] font-medium shadow-lg shadow-[#ff3b30]/20 transition"
                >
                  Probar modo emergencia
                </a>
                <button
                  onClick={() => copiar(window.location.origin + window.location.pathname, "url")}
                  className="px-5 py-2.5 rounded-xl border border-zinc-700 hover:bg-zinc-800 font-medium transition"
                >
                  {copiado === "url" ? "✓ URL copiada" : "Copiar URL actual"}
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-zinc-600 mt-8">
            VIAL•ID • Sistema de Identificación Médica para Vialidades • Hecho para CDMX 2026
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: MODO LOCKSCREEN / EMERGENCIA
  // ============================================
  return (
    <div className="min-h-screen bg-[#05070a] text-white selection:bg-[#ff3b30]/30">
      {/* Fondo animado */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_800px_at_50%_-200px,_#ff3b30_0%,_transparent_60%)] opacity-[0.15]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,#05070a_70%)]" />
        {/* Grid sutil */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: "40px 40px"
        }} />
      </div>

      <div className="relative mx-auto max-w-[460px] min-h-screen flex flex-col">
        {/* Header compacto */}
        <header className="sticky top-0 z-30 backdrop-blur-2xl bg-[#05070a]/70 border-b border-white/[0.06]">
          <div className="px-5 h-[56px] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="absolute inset-0 blur-xl bg-[#ff3b30] opacity-40 rounded-full" />
                <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-[#ff3b30] to-[#ff1a0d] flex items-center justify-center shadow-lg shadow-[#ff3b30]/30">
                  <span className="text-[11px] font-black tracking-widest text-white">911</span>
                </div>
              </div>
              <div className="leading-tight">
                <p className="text-[11px] font-bold tracking-[0.18em] text-zinc-400">VIAL•ID</p>
                <p className="text-[13px] font-semibold -mt-0.5">{PROFILE_CONFIG.nombre.split(' ')[0]}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${ubicacion ? 'bg-emerald-400 shadow shadow-emerald-400/50' : 'bg-zinc-600'} animate-pulse`} />
              <span className="text-[11px] text-zinc-400 font-medium">
                {ubicacion ? 'GPS activo' : 'Obteniendo GPS...'}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 pb-28">
          {!emergenciaActiva ? (
            /* ========== PANTALLA DE BLOQUEO ========== */
            <div className="space-y-5">
              {/* Alerta principal */}
              <div className="relative overflow-hidden rounded-[28px] border border-[#ff3b30]/30 bg-gradient-to-br from-[#1a0a08] via-[#140806] to-[#0f0504] p-[1px] shadow-[0_0_80px_-20px_#ff3b30]">
                <div className="relative rounded-[27px] bg-[#0a0504]/90 backdrop-blur-xl px-5 py-6">
                  {/* Patrón de emergencia */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-[repeating-linear-gradient(90deg,#ff3b30_0_12px,transparent_12px_24px)] opacity-60" />
                  
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 mt-1">
                      <div className="relative">
                        <div className="absolute inset-0 animate-ping rounded-2xl bg-[#ff3b30] opacity-20" />
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff3b30] shadow-[0_0_30px_rgba(255,59,48,0.5)]">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <h1 className="text-[22px] font-black tracking-tight leading-[1.1]">
                        ¿ES UNA<br/>EMERGENCIA?
                      </h1>
                      <p className="mt-2.5 text-[13px] leading-relaxed text-zinc-300">
                        Si esta persona sufrió un <strong className="text-white font-semibold">accidente</strong>, presiona el botón rojo.
                        Se mostrarán sus datos médicos y se alertará a sus contactos.
                      </p>
                    </div>
                  </div>

                  {/* BOTÓN GIGANTE */}
                  <button
                    onClick={activarEmergencia}
                    className="group relative mt-6 w-full overflow-hidden rounded-2xl"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#ff3b30] via-[#ff453a] to-[#ff3b30] transition-transform group-active:scale-[0.99]" />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(600px_circle_at_var(--x)_var(--y),rgba(255,255,255,0.15),transparent_40%)]" 
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        e.currentTarget.style.setProperty('--x', `${e.clientX - rect.left}px`);
                        e.currentTarget.style.setProperty('--y', `${e.clientY - rect.top}px`);
                      }}
                    />
                    <div className="relative flex h-[72px] items-center justify-center gap-3 text-[18px] font-black tracking-wide text-white">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                      </span>
                      ACTIVAR EMERGENCIA
                    </div>
                  </button>

                  <p className="mt-3 text-center text-[11px] text-zinc-500">
                    Al presionar, se guarda ubicación y hora exacta del escaneo
                  </p>
                </div>
              </div>

              {/* Info rápida visible */}
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { label: "SANGRE", value: PROFILE_CONFIG.tipoSangre, accent: true },
                  { label: "EDAD", value: `${PROFILE_CONFIG.edad}` },
                  { label: "VEHÍCULO", value: PROFILE_CONFIG.vehiculo.tipo.slice(0, 6) },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur px-3 py-3 text-center">
                    <p className="text-[10px] font-bold tracking-widest text-zinc-500">{item.label}</p>
                    <p className={`mt-1 text-[15px] font-black ${item.accent ? 'text-[#ff6b5b]' : 'text-white'}`}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Instrucciones para testigo */}
              <div className="rounded-[24px] border border-white/[0.06] bg-[#0c0f14]/70 backdrop-blur-xl p-4">
                <h3 className="flex items-center gap-2 text-[13px] font-bold">
                  <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-[#ff3b30]/15 text-[#ff8a80]">!</span>
                  INSTRUCCIONES PARA TESTIGO / PARAMÉDICO
                </h3>
                <ol className="mt-3 space-y-2 text-[13px] leading-relaxed text-zinc-300 list-decimal list-inside marker:text-zinc-500">
                  <li>Presiona <strong className="text-white">ACTIVAR EMERGENCIA</strong></li>
                  <li>Revisa alergias y tipo de sangre</li>
                  <li>Llama al <strong className="text-white">911</strong> (botón abajo)</li>
                  <li>Contacta a familiares (WhatsApp/SMS)</li>
                  <li>No muevas a la persona si hay trauma</li>
                </ol>
              </div>

              {/* Log de escaneos */}
              {scanLogs.length > 0 && (
                <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] px-4 py-3">
                  <p className="text-[11px] font-semibold text-zinc-500 tracking-wide">
                    ÚLTIMO ESCANEO: {new Date(scanLogs[0].timestamp).toLocaleTimeString('es-MX')}
                    {scanLogs[0].lat && ` • ${scanLogs[0].lat.toFixed(4)}, ${scanLogs[0].lng?.toFixed(4)}`}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* ========== MODO EMERGENCIA ACTIVO ========== */
            <div ref={emergenciaRef} className="space-y-4">
              {/* Banner de emergencia activa */}
              <div className="sticky top-[64px] z-20 -mx-1 rounded-2xl border border-emerald-500/30 bg-emerald-950/80 backdrop-blur-xl px-4 py-3 shadow-lg shadow-emerald-900/30">
                <div className="flex items-center gap-3">
                  <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400 shadow shadow-emerald-400/70" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-black tracking-[0.14em] text-emerald-200">EMERGENCIA ACTIVA</p>
                    <p className="text-[11px] text-emerald-300/80 truncate">
                      {ubicacion 
                        ? `GPS: ${ubicacion.lat.toFixed(5)}, ${ubicacion.lng.toFixed(5)} ±${Math.round(ubicacion.accuracy)}m`
                        : 'Obteniendo ubicación precisa...'}
                    </p>
                  </div>
                  <button
                    onClick={() => { setEmergenciaActiva(false); setModo("lockscreen"); }}
                    className="shrink-0 rounded-xl border border-white/10 px-3 py-1.5 text-[11px] font-bold text-zinc-300 hover:bg-white/5"
                  >
                    Cerrar
                  </button>
                </div>
              </div>

              {/* Datos médicos críticos */}
              <section className="overflow-hidden rounded-[24px] border border-[#ff3b30]/20 bg-[#140907]/70 backdrop-blur-xl">
                <div className="border-b border-[#ff3b30]/15 bg-gradient-to-r from-[#1f0c0a] to-transparent px-4 py-3 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ff3b30]/15">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff8a80" strokeWidth="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                  </div>
                  <h2 className="text-[15px] font-black tracking-wide">DATOS MÉDICOS CRÍTICOS</h2>
                </div>
                
                <div className="p-4 space-y-4">
                  {/* Tipo de sangre destacado */}
                  <div className="flex items-center justify-between rounded-2xl border border-[#ff3b30]/30 bg-[#ff3b30]/[0.07] px-4 py-3">
                    <div>
                      <p className="text-[11px] font-bold tracking-[0.16em] text-[#ff8a80]">TIPO DE SANGRE</p>
                      <p className="mt-0.5 font-mono text-[28px] font-black leading-none text-white">{PROFILE_CONFIG.tipoSangre}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-zinc-400">NSS</p>
                      <p className="font-mono text-sm text-zinc-200">{PROFILE_CONFIG.nss}</p>
                    </div>
                  </div>

                  {/* Alergias */}
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-[12px] font-bold text-amber-200">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/15 text-amber-300">⚠</span>
                      ALERGIAS SEVERAS
                    </p>
                    <div className="space-y-1.5">
                      {PROFILE_CONFIG.alergias.map((alergia, i) => (
                        <div key={i} className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2.5">
                          <span className="mt-0.5 text-amber-300">•</span>
                          <span className="text-[13px] font-medium leading-snug text-amber-50">{alergia}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Condiciones y medicamentos */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <p className="text-[11px] font-bold tracking-wide text-zinc-400 mb-2">CONDICIONES</p>
                      <ul className="space-y-1 text-[13px] text-zinc-200">
                        {PROFILE_CONFIG.condiciones.map((c, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-zinc-500">•</span>{c}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <p className="text-[11px] font-bold tracking-wide text-zinc-400 mb-2">MEDICAMENTOS</p>
                      <ul className="space-y-1 text-[13px] text-zinc-200">
                        {PROFILE_CONFIG.medicamentos.map((m, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-zinc-500">•</span>{m}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Notas médicas */}
                  <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.06] p-3.5">
                    <p className="mb-1.5 text-[11px] font-bold tracking-wide text-sky-200">NOTAS PARA PERSONAL MÉDICO</p>
                    <p className="text-[13px] leading-relaxed text-sky-50">{PROFILE_CONFIG.notasMedicas}</p>
                  </div>
                </div>
              </section>

              {/* Contactos - Acción rápida */}
              <section className="rounded-[24px] border border-white/[0.06] bg-[#0c0f14]/70 backdrop-blur-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.06]">
                  <h3 className="text-[15px] font-black tracking-wide">CONTACTAR FAMILIARES AHORA</h3>
                  <p className="text-[12px] text-zinc-400 mt-0.5">Se pre-rellena mensaje con ubicación</p>
                </div>
                
                <div className="divide-y divide-white/[0.04]">
                  {PROFILE_CONFIG.contactos.map((contacto) => (
                    <div key={contacto.telefono} className="p-3.5">
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="min-w-0">
                          <p className="font-bold text-[14px] leading-tight">{contacto.nombre}</p>
                          <p className="text-[12px] text-zinc-400">{contacto.parentesco} • Prioridad {contacto.prioridad}</p>
                        </div>
                        <a
                          href={`tel:${contacto.telefono.replace(/\s/g, '')}`}
                          className="shrink-0 inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-[12px] font-bold text-white shadow shadow-emerald-900/40 active:scale-95"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                          </svg>
                          LLAMAR
                        </a>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <a
                          href={`https://wa.me/${contacto.whatsapp}?text=${mensajeWhatsApp}`}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative overflow-hidden rounded-xl border border-[#25D366]/30 bg-[#0b1411] px-2.5 py-2.5 text-center transition active:scale-[0.98]"
                        >
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[#25D366]/[0.07] transition" />
                          <p className="relative text-[11px] font-bold text-[#6ef0a0]">WhatsApp</p>
                        </a>
                        <a
                          href={`sms:${contacto.telefono.replace(/\s/g, '')}?&body=${mensajeSMS}`}
                          className="rounded-xl border border-white/10 bg-white/[0.02] px-2.5 py-2.5 text-center text-[11px] font-bold text-zinc-200 hover:bg-white/[0.04] active:scale-[0.98]"
                        >
                          SMS
                        </a>
                        <a
                          href={`mailto:${contacto.email}?subject=${asuntoEmail}&body=${cuerpoEmail}`}
                          className="rounded-xl border border-white/10 bg-white/[0.02] px-2.5 py-2.5 text-center text-[11px] font-bold text-zinc-200 hover:bg-white/[0.04] active:scale-[0.98]"
                        >
                          Email
                        </a>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botón enviar a todos */}
                <div className="border-t border-white/[0.06] bg-white/[0.01] p-3">
                  <button
                    onClick={() => {
                      // Abrir WhatsApp del primer contacto como ejemplo
                      const primero = PROFILE_CONFIG.contactos[0];
                      window.open(`https://wa.me/${primero.whatsapp}?text=${mensajeWhatsApp}`, '_blank');
                    }}
                    className="w-full rounded-xl bg-[#25D366] py-3 text-[13px] font-black text-[#052e16] shadow-lg shadow-[#25D366]/20 active:scale-[0.99]"
                  >
                    ENVIAR WHATSAPP A TODOS (1 por 1) →
                  </button>
                  <p className="mt-2 text-center text-[11px] text-zinc-500">
                    Tip: Mantén presionado en iOS para enviar a múltiples contactos
                  </p>
                </div>
              </section>

              {/* Vehículo y datos adicionales */}
              <section className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                  <p className="text-[11px] font-bold tracking-wide text-zinc-400 mb-2.5">VEHÍCULO</p>
                  <div className="space-y-1.5 text-[13px]">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Tipo:</span>
                      <span className="font-medium">{PROFILE_CONFIG.vehiculo.tipo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Modelo:</span>
                      <span className="font-medium">{PROFILE_CONFIG.vehiculo.marca} {PROFILE_CONFIG.vehiculo.modelo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Placas:</span>
                      <span className="font-mono font-bold">{PROFILE_CONFIG.vehiculo.placas}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Color:</span>
                      <span className="font-medium">{PROFILE_CONFIG.vehiculo.color}</span>
                    </div>
                    <div className="pt-1.5 mt-1.5 border-t border-white/5 text-[11px] text-zinc-400">
                      Seguro: {PROFILE_CONFIG.vehiculo.seguro}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                  <p className="text-[11px] font-bold tracking-wide text-zinc-400 mb-2.5">ATENCION MÉDICA</p>
                  <div className="space-y-2 text-[13px]">
                    <div>
                      <p className="text-zinc-500 text-[11px]">Hospital:</p>
                      <p className="font-medium leading-snug">{PROFILE_CONFIG.hospitalPreferido}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-[11px]">Médico:</p>
                      <p className="font-medium">{PROFILE_CONFIG.medicoTratante}</p>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <span className={`inline-flex h-2 w-2 rounded-full ${PROFILE_CONFIG.donadorOrganos ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                      <span className="text-[12px] font-medium">
                        {PROFILE_CONFIG.donadorOrganos ? 'DONADOR DE ÓRGANOS: SÍ' : 'Donador: No registrado'}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Ubicación compartible */}
              {ubicacion && (
                <div className="rounded-2xl border border-sky-500/20 bg-sky-950/40 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold tracking-wide text-sky-200">UBICACIÓN DEL INCIDENTE (GPS)</p>
                      <p className="mt-1 font-mono text-[13px] text-sky-50 break-all">
                        {ubicacion.lat.toFixed(6)}, {ubicacion.lng.toFixed(6)}
                      </p>
                      <p className="text-[11px] text-sky-300/70 mt-0.5">Precisión: ±{Math.round(ubicacion.accuracy)} metros</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <a
                        href={`https://www.google.com/maps?q=${ubicacion.lat},${ubicacion.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-sky-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-sky-500"
                      >
                        Abrir Maps
                      </a>
                      <button
                        onClick={() => copiar(`${ubicacion.lat},${ubicacion.lng}`, "coords")}
                        className="rounded-xl border border-sky-400/30 px-3 py-2 text-[11px] font-bold text-sky-200 hover:bg-sky-900/50"
                      >
                        {copiado === "coords" ? "✓" : "Copiar"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Barra inferior fija - Emergencia */}
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.06] bg-[#05070a]/90 backdrop-blur-2xl">
          <div className="mx-auto max-w-[460px] px-4 py-3 safe-bottom">
            <div className="grid grid-cols-3 gap-2.5">
              <a
                href="tel:911"
                className="group relative flex h-14 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border border-[#ff3b30]/40 bg-[#1a0806] active:scale-[0.97]"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-[#ff3b30]/20 to-transparent opacity-0 group-active:opacity-100" />
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff6b5b" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                <span className="text-[11px] font-black tracking-wide text-[#ff8a80]">911</span>
              </a>
              
              <button
                onClick={() => copiar(window.location.href, "link")}
                className="flex h-14 flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] active:scale-[0.97]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-300">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                <span className="text-[11px] font-bold text-zinc-300">
                  {copiado === "link" ? "¡Copiado!" : "Compartir"}
                </span>
              </button>
              
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Emergencia de ${PROFILE_CONFIG.nombre}. Ver perfil: ${window.location.href}`)}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-14 flex-col items-center justify-center gap-1 rounded-2xl border border-[#25D366]/30 bg-[#07140d] active:scale-[0.97]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M20.52 3.48A11.86 11.86 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.12.55 4.17 1.6 5.99L0 24l6.17-1.62A11.94 11.94 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.2-1.25-6.21-3.48-8.52zM12 22c-1.85 0-3.66-.5-5.24-1.44l-.38-.22-3.66.96.98-3.57-.25-.37A9.96 9.96 0 0 1 2 12c0-5.52 4.48-10 10-10s10 4.48 10 10-4.48 10-10 10zm5.46-7.53c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.5-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.09 3.19 5.06 4.47.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z"/>
                </svg>
                <span className="text-[11px] font-bold text-[#7ef0a8]">WhatsApp</span>
              </a>
            </div>
            
            <p className="mt-2.5 text-center text-[10px] leading-tight text-zinc-600">
              Sistema VIAL•ID • CDMX • Los datos se almacenan localmente • Sin rastreadores
            </p>
          </div>
        </div>
      </div>

      {/* Estilos para safe area */}
      <style>{`
        .safe-bottom { padding-bottom: max(12px, env(safe-area-inset-bottom)); }
      `}</style>
    </div>
  );
}