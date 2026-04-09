import { useEffect, useMemo, useRef, useState } from "react";

// ============================================================================
// CONFIGURACIÓN DE LA PERSONA - EDITA ESTA SECCIÓN PARA CADA USUARIO
// ============================================================================
// 📝 INSTRUCCIONES PARA GITHUB PAGES:
// 1. Duplica este repositorio para cada persona
// 2. Edita SOLO esta sección PROFILE_DATA con los datos reales
// 3. Haz commit y push - GitHub Pages servirá automáticamente la app
// 4. El QR debe apuntar a: https://TU-USUARIO.github.io/NOMBRE-REPO/
// ============================================================================

const PROFILE_DATA = {
  // 👤 Información básica
  nombreCompleto: "ALEJANDRA MENDOZA RÍOS",
  fechaNacimiento: "1995-03-14", // Formato YYYY-MM-DD
  edad: 30,
  sexo: "Femenino",
  tipoSangre: "O+",
  pesoKg: 62,
  estaturaCm: 167,
  
  // 🩺 Información médica crítica
  alergias: [
    "Penicilina (anafilaxia)",
    "Picadura de abeja",
    "Látex"
  ],
  medicamentos: [
    "Levotiroxina 75mcg - diario en ayunas",
    "EpiPen (llevar siempre)"
  ],
  condiciones: [
    "Hipotiroidismo",
    "Asma leve - usar salbutamol en crisis"
  ],
  implantes: [
    "DIU hormonal Mirena (colocado 2023)"
  ],
  donadorOrganos: true,
  
  // 📞 Contactos de emergencia (orden de prioridad)
  contactos: [
    {
      nombre: "Mamá - Laura Ríos",
      relacion: "Madre",
      telefono: "525512345678", // Con código de país sin + ni espacios
      whatsapp: "525512345678",
    },
    {
      nombre: "Hermano - Diego Mendoza",
      relacion: "Hermano",
      telefono: "525587654321",
      whatsapp: "525587654321",
    },
    {
      nombre: "Pareja - Sofía Torres",
      relacion: "Pareja",
      telefono: "525523456789",
      whatsapp: "525523456789",
    },
  ],
  
  // 🏥 Seguros y documentos
  seguroMedico: "GNP - Póliza 88472915",
  nss: "12345678901",
  curp: "MERL950314MDFNSL09",
  identificacion: "INE / Solicitar en bolsa delantera mochila",
  
  // 📍 Info adicional
  vehiculo: "Bicicleta eléctrica - VanMoof S5 Negra",
  notasExtra: "Usa lentes de contacto. En caso de inconsciencia, NO retirar casco sin inmovilizar columna cervical. Contactar inmediatamente a mamá, tiene historial médico completo.",
};

// ============================================================================
// FIN DE CONFIGURACIÓN - NO EDITAR DEBAJO A MENOS QUE SEPAS QUÉ HACES
// ============================================================================

type ScanLog = {
  id: string;
  timestamp: string;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  address: string | null;
  userAgent: string;
};

const EMERGENCY_NUMBERS = [
  { label: "911 - Emergencias CDMX", tel: "911" },
  { label: "Cruz Roja Mexicana", tel: "065" },
  { label: "Locatel CDMX", tel: "*0311" },
];

export default function App() {
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanLog, setScanLog] = useState<ScanLog | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [dark, setDark] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<ScanLog[]>([]);
  const hasScannedRef = useRef(false);

  // Cargar historial
  useEffect(() => {
    const saved = localStorage.getItem("emergency-scan-history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {}
    }
    // Verificar si es el dueño (parámetro ?edit=1)
    const params = new URLSearchParams(window.location.search);
    if (params.get("edit") === "1") {
      setEditMode(true);
    }
  }, []);

  // Registrar escaneo inicial automáticamente
  useEffect(() => {
    if (hasScannedRef.current || editMode) return;
    hasScannedRef.current = true;
    
    const logInitialScan = async () => {
      setScanning(true);
      const log = await createScanLog();
      setScanLog(log);
      setScanning(false);
      
      // Guardar en historial
      const newHistory = [log, ...history].slice(0, 50);
      setHistory(newHistory);
      localStorage.setItem("emergency-scan-history", JSON.stringify(newHistory));
    };
    
    logInitialScan();
  }, [editMode, history]);

  const createScanLog = async (): Promise<ScanLog> => {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const userAgent = navigator.userAgent;
    
    let lat: number | null = null;
    let lng: number | null = null;
    let accuracy: number | null = null;
    let address: string | null = null;
    
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });
      
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
      accuracy = pos.coords.accuracy;
      
      // Reverse geocoding con Nominatim (OSM) - gratis y sin API key
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          { headers: { "Accept-Language": "es" } }
        );
        const data = await res.json();
        if (data.display_name) {
          const addr = data.address || {};
          const calle = [addr.road, addr.house_number].filter(Boolean).join(" ");
          const colonia = addr.suburb || addr.neighbourhood || addr.quarter || "";
          const alcaldia = addr.city_district || addr.county || "";
          const ciudad = addr.city || addr.town || addr.village || "CDMX";
          const estado = addr.state || "";
          
          address = [calle, colonia, alcaldia, ciudad, estado]
            .filter(Boolean)
            .join(", ");
        }
      } catch {
        address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }
    } catch (err: any) {
      setLocationError(err?.message || "No se pudo obtener ubicación");
    }
    
    return { id, timestamp, lat, lng, accuracy, address, userAgent };
  };

  const handleEmergencyActivate = async () => {
    setEmergencyActive(true);
    // Crear nuevo log al activar emergencia
    const log = await createScanLog();
    setScanLog(log);
    const newHistory = [log, ...history].slice(0, 50);
    setHistory(newHistory);
    localStorage.setItem("emergency-scan-history", JSON.stringify(newHistory));
    
    // Vibración si está disponible
    if ("vibrate" in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  };

  const formatTime = useMemo(() => {
    if (!scanLog) return "";
    try {
      return new Intl.DateTimeFormat("es-MX", {
        dateStyle: "full",
        timeStyle: "medium",
        timeZone: "America/Mexico_City",
      }).format(new Date(scanLog.timestamp));
    } catch {
      return scanLog.timestamp;
    }
  }, [scanLog]);

  const whatsappMessage = useMemo(() => {
    const ubicacion = scanLog?.address 
      ? `📍 ${scanLog.address}`
      : scanLog?.lat 
      ? `📍 https://maps.google.com/?q=${scanLog.lat},${scanLog.lng}`
      : "📍 Ubicación no disponible";
    
    return encodeURIComponent(
      `🚨 EMERGENCIA - ${PROFILE_DATA.nombreCompleto}\n\n` +
      `Se ha escaneado su código de emergencia.\n\n` +
      `🕒 ${formatTime}\n${ubicacion}\n\n` +
      `🩸 Tipo de sangre: ${PROFILE_DATA.tipoSangre}\n` +
      `⚠️ Alergias: ${PROFILE_DATA.alergias.join(", ")}\n\n` +
      `Por favor contacta a servicios de emergencia y acude al lugar.\n` +
      `Este mensaje fue enviado automáticamente desde el código QR de emergencia.`
    );
  }, [formatTime, scanLog]);

  return (
    <div className={`min-h-screen w-full ${dark ? "dark" : ""}`}>
      <div className="min-h-screen bg-[#0a0c10] text-zinc-100 selection:bg-rose-500/30 selection:text-rose-100">
        {/* Fondo decorativo */}
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(1200px_800px_at_20%_-10%,rgba(244,63,94,0.18),transparent_60%),radial-gradient(1000px_700px_at_120%_10%,rgba(14,165,233,0.14),transparent_55%),radial-gradient(900px_600px_at_-10%_110%,rgba(245,158,11,0.12),transparent_55%)]" />
          <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(transparent_95%,rgba(255,255,255,.5)_95%),linear-gradient(90deg,transparent_95%,rgba(255,255,255,.5)_95%)] [background-size:40px_40px]" />
        </div>

        <div className="relative mx-auto flex min-h-screen max-w-[1100px] flex-col">
          {/* Header */}
          <header className="sticky top-0 z-30 backdrop-blur-xl border-b border-white/10 bg-[#0a0c10]/70">
            <div className="mx-auto flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute -inset-1 rounded-2xl bg-rose-500/20 blur-xl" />
                  <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 shadow-lg shadow-rose-900/30">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
                      <path d="M12 2v8M12 14v8M4.93 4.93l5.66 5.66M13.41 13.41l5.66 5.66M2 12h8M14 12h8M4.93 19.07l5.66-5.66M13.41 10.59l5.66-5.66" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.75"/>
                    </svg>
                  </div>
                </div>
                <div className="leading-tight">
                  <div className="text-[11px] font-semibold tracking-[0.2em] text-rose-300/90">CÓDIGO DE VIDA</div>
                  <div className="text-[15px] font-bold tracking-tight">Emergencia Médica QR</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium hover:bg-white/[0.08] transition"
                  title="Ver registros de escaneo"
                >
                  📋 {history.length}
                </button>
                <button
                  onClick={() => setDark(!dark)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-2 hover:bg-white/[0.08] transition"
                  aria-label="Cambiar tema"
                >
                  {dark ? "🌙" : "☀️"}
                </button>
              </div>
            </div>
          </header>

          {/* Banner de escaneo */}
          {scanning && (
            <div className="mx-4 mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                <span className="font-medium text-amber-200">
                  Registrando ubicación y hora del escaneo...
                </span>
              </div>
            </div>
          )}

          {/* Main content */}
          <main className="grid flex-1 grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
            {/* Columna izquierda - Botón emergencia */}
            <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]">
              <div className="absolute inset-0 bg-[radial-gradient(600px_300px_at_50%_-10%,rgba(244,63,94,0.25),transparent_70%)]" />
              
              <div className="relative p-6 sm:p-8 lg:p-10">
                {!emergencyActive ? (
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-rose-200">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" />
                      MODO PÚBLICO - SOLO PARA EMERGENCIAS
                    </div>
                    
                    <h1 className="text-balance text-[2rem] font-black leading-[1.05] tracking-tight sm:text-[2.5rem]">
                      ¿PRESENCIAS UNA <span className="bg-gradient-to-r from-rose-400 to-orange-300 bg-clip-text text-transparent">EMERGENCIA</span>?
                    </h1>
                    <p className="mt-3 max-w-xl text-pretty text-zinc-300">
                      Esta persona lleva este código para que, en caso de accidente, 
                      puedas acceder a su información médica crítica en segundos.
                    </p>

                    {/* Tarjeta de info rápida */}
                    <div className="mt-8 grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
                      {[
                        { k: "Nombre", v: PROFILE_DATA.nombreCompleto.split(" ").slice(0,2).join(" ") },
                        { k: "Sangre", v: PROFILE_DATA.tipoSangre },
                        { k: "Edad", v: `${PROFILE_DATA.edad} años` },
                      ].map((item) => (
                        <div key={item.k} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <div className="text-[11px] uppercase tracking-wide text-zinc-400">{item.k}</div>
                          <div className="mt-1 truncate font-semibold">{item.v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Botón gigante */}
                    <button
                      onClick={handleEmergencyActivate}
                      className="group relative mt-10 w-full max-w-xl overflow-hidden rounded-[1.75rem] border border-rose-400/40 bg-[radial-gradient(120%_120%_at_50%_0%,rgba(244,63,94,0.9),rgba(225,29,72,0.9))] p-[1px] shadow-[0_20px_60px_-15px_rgba(244,63,94,0.65)] transition active:scale-[0.99]"
                    >
                      <div className="relative rounded-[1.7rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.06))] px-8 py-7 backdrop-blur">
                        <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100"
                          style={{ background: "radial-gradient(500px 200px at 50% -20%, rgba(255,255,255,0.25), transparent 60%)" }}
                        />
                        <div className="flex items-center justify-center gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white drop-shadow">
                              <path d="M12 9v3m0 0v3m0-3h3m-3 0H9m11.657-3.657a9 9 0 11-15.314 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                          </div>
                          <div className="text-left">
                            <div className="text-[13px] font-semibold uppercase tracking-[0.18em] text-rose-100/90">
                              PRESIONA PARA
                            </div>
                            <div className="text-[28px] font-black leading-none tracking-tight text-white sm:text-[32px]">
                              VER DATOS DE EMERGENCIA
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>

                    <p className="mt-4 max-w-md text-xs text-zinc-400">
                      Al presionar, se registrará automáticamente la hora y ubicación exacta 
                      para dejar constancia del auxilio. Esta información puede ser útil para emergencias.
                    </p>
                  </div>
                ) : (
                  // Vista de emergencia activa
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-200">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                        EMERGENCIA ACTIVA
                      </div>
                      <div className="text-right text-xs text-zinc-400">
                        <div>Escaneo registrado:</div>
                        <div className="font-medium text-zinc-200">{formatTime}</div>
                      </div>
                    </div>

                    {/* Ubicación */}
                    <div className="rounded-2xl border border-sky-400/20 bg-sky-500/5 p-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-sky-200">
                        📍 Ubicación del incidente
                      </div>
                      {scanLog?.address ? (
                        <div className="space-y-2">
                          <div className="font-medium leading-snug">{scanLog.address}</div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <a
                              href={`https://maps.google.com/?q=${scanLog.lat},${scanLog.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg bg-sky-500/20 px-3 py-1.5 font-medium text-sky-100 hover:bg-sky-500/30 transition"
                            >
                              Abrir en Google Maps ↗
                            </a>
                            {scanLog.accuracy && (
                              <span className="rounded-lg bg-white/5 px-3 py-1.5 text-zinc-300">
                                Precisión: ±{Math.round(scanLog.accuracy)}m
                              </span>
                            )}
                          </div>
                        </div>
                      ) : locationError ? (
                        <div className="text-amber-200">No se pudo obtener ubicación: {locationError}</div>
                      ) : (
                        <div className="text-zinc-400">Obteniendo ubicación...</div>
                      )}
                    </div>

                    {/* Acciones rápidas */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {EMERGENCY_NUMBERS.map((num) => (
                        <a
                          key={num.tel}
                          href={`tel:${num.tel}`}
                          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center transition hover:border-rose-400/40 hover:bg-rose-500/10"
                        >
                          <div className="text-[11px] uppercase tracking-wide text-zinc-400 group-hover:text-rose-200">
                            Llamar
                          </div>
                          <div className="mt-1 font-bold">{num.label}</div>
                          <div className="mt-1 text-2xl font-black tracking-wide text-rose-300">
                            {num.tel}
                          </div>
                        </a>
                      ))}
                    </div>

                    {/* Botones WhatsApp */}
                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                      <div className="mb-3 text-sm font-semibold text-emerald-200">
                        ✉️ Avisar por WhatsApp (desde tu teléfono):
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {PROFILE_DATA.contactos.map((c) => (
                          <a
                            key={c.telefono}
                            href={`https://wa.me/${c.whatsapp}?text=${whatsappMessage}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2.5 text-center text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/20"
                          >
                            <div className="truncate font-semibold">{c.nombre}</div>
                            <div className="text-[11px] opacity-80">{c.relacion}</div>
                          </a>
                        ))}
                      </div>
                      <p className="mt-2 text-[11px] text-emerald-200/70">
                        Se abrirá WhatsApp con un mensaje pre-llenado. Solo presiona enviar.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Columna derecha - Ficha médica */}
            <aside className="flex flex-col gap-6">
              {/* Datos críticos - siempre visibles en emergencia */}
              <div className={`overflow-hidden rounded-[2rem] border ${emergencyActive ? 'border-rose-400/30 bg-rose-500/[0.06]' : 'border-white/10 bg-white/[0.03]'} backdrop-blur`}>
                <div className="border-b border-white/10 px-6 py-4">
                  <h2 className="flex items-center gap-2 text-lg font-bold">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/20 text-rose-300">🩸</span>
                    Ficha Médica Rápida
                  </h2>
                </div>
                
                <div className="space-y-4 p-6">
                  {/* Datos solo visibles si emergencia está activa */}
                  <div className={emergencyActive ? "" : "blur-md select-none pointer-events-none"}>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <Info label="Nombre completo" value={PROFILE_DATA.nombreCompleto} />
                      <Info label="F. Nacimiento" value={new Date(PROFILE_DATA.fechaNacimiento).toLocaleDateString('es-MX')} />
                      <Info label="Tipo de sangre" value={PROFILE_DATA.tipoSangre} highlight />
                      <Info label="Sexo / Edad" value={`${PROFILE_DATA.sexo} · ${PROFILE_DATA.edad} años`} />
                      <Info label="Peso / Estatura" value={`${PROFILE_DATA.pesoKg} kg · ${PROFILE_DATA.estaturaCm} cm`} />
                      <Info label="Donador órganos" value={PROFILE_DATA.donadorOrganos ? "SÍ" : "NO"} />
                    </div>

                    <div className="mt-4 space-y-3">
                      <DetailBlock title="⚠️ ALERGIAS CRÍTICAS" items={PROFILE_DATA.alergias} color="rose" />
                      <DetailBlock title="💊 MEDICAMENTOS" items={PROFILE_DATA.medicamentos} color="amber" />
                      <DetailBlock title="🏥 CONDICIONES MÉDICAS" items={PROFILE_DATA.condiciones} color="sky" />
                      {PROFILE_DATA.implantes.length > 0 && (
                        <DetailBlock title="🔧 IMPLANTES / DISPOSITIVOS" items={PROFILE_DATA.implantes} color="violet" />
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-2 text-xs">
                      <InfoInline label="Seguro médico" value={PROFILE_DATA.seguroMedico} />
                      <InfoInline label="NSS" value={PROFILE_DATA.nss} />
                      <InfoInline label="CURP" value={PROFILE_DATA.curp} />
                      <InfoInline label="ID" value={PROFILE_DATA.identificacion} />
                    </div>

                    <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-xs leading-relaxed">
                      <div className="font-semibold text-amber-200">📝 Notas importantes:</div>
                      <div className="mt-1 text-zinc-300">{PROFILE_DATA.notasExtra}</div>
                    </div>

                    <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-900/50 p-3 text-xs">
                      <div className="font-semibold text-zinc-200">🚲 Vehículo:</div>
                      <div className="text-zinc-400">{PROFILE_DATA.vehiculo}</div>
                    </div>
                  </div>

                  {!emergencyActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-2xl border border-white/20 bg-[#0a0c10]/90 px-6 py-4 text-center backdrop-blur-md">
                        <div className="text-3xl mb-2">🔒</div>
                        <div className="font-bold">Información protegida</div>
                        <div className="text-sm text-zinc-400">Presiona el botón de emergencia para ver</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Contactos directos */}
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
                <h3 className="mb-3 font-bold">👨‍👩‍👧 Contactos de emergencia</h3>
                <div className="space-y-2">
                  {PROFILE_DATA.contactos.map((c, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{c.nombre}</div>
                        <div className="text-xs text-zinc-400">{c.relacion}</div>
                      </div>
                      <div className="flex gap-1.5">
                        <a href={`tel:+${c.telefono}`} className="rounded-lg bg-zinc-800 px-2.5 py-1.5 text-xs font-medium hover:bg-zinc-700">Llamar</a>
                        <a href={`https://wa.me/${c.whatsapp}?text=${whatsappMessage}`} target="_blank" rel="noreferrer" className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500">WA</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </main>

          {/* Footer instructivo */}
          <footer className="border-t border-white/10 px-4 py-6 text-center text-xs text-zinc-400 sm:px-6">
            <div className="mx-auto max-w-4xl">
              <p className="font-medium text-zinc-300">
                💡 Este QR es para uso exclusivo en emergencias médicas.
              </p>
              <p className="mt-1">
                Al escanear, se registra automáticamente fecha, hora y ubicación para fines de auxilio. 
                Los datos personales solo se muestran tras confirmar emergencia.
              </p>
              <p className="mt-3 text-[11px] opacity-70">
                Proyecto de código abierto • Optimizado para México 2026 • 
                <button onClick={() => setEditMode(!editMode)} className="underline hover:text-zinc-200 ml-1">
                  {editMode ? "Salir de edición" : "Modo edición"}
                </button>
              </p>
            </div>
          </footer>
        </div>

        {/* Modal historial */}
        {showHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setShowHistory(false)}>
            <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-white/15 bg-[#0f1218] shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="border-b border-white/10 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">📋 Registro de escaneos ({history.length})</h3>
                  <button onClick={() => setShowHistory(false)} className="rounded-xl bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">Cerrar</button>
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-4">
                {history.length === 0 ? (
                  <p className="py-8 text-center text-zinc-400">No hay registros aún</p>
                ) : (
                  <div className="space-y-2">
                    {history.map((log) => (
                      <div key={log.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs">
                        <div className="font-medium">{new Date(log.timestamp).toLocaleString('es-MX')}</div>
                        <div className="mt-1 truncate text-zinc-400">{log.address || `${log.lat?.toFixed(5)}, ${log.lng?.toFixed(5)}`}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="border-t border-white/10 px-6 py-3 text-right">
                <button
                  onClick={() => {
                    if (confirm("¿Borrar todo el historial?")) {
                      setHistory([]);
                      localStorage.removeItem("emergency-scan-history");
                    }
                  }}
                  className="text-xs text-rose-300 hover:text-rose-200"
                >
                  Borrar historial
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal edición */}
        {editMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur">
            <div className="w-full max-w-3xl rounded-[1.5rem] border border-amber-400/30 bg-[#0f1218] p-6 shadow-2xl">
              <h3 className="text-xl font-black text-amber-200">⚙️ Modo Edición - Dueño del QR</h3>
              <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-xl bg-zinc-900/50 p-4 text-sm leading-relaxed">
                <p className="font-bold text-zinc-200">Para personalizar este código para OTRA persona:</p>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-zinc-300">
                  <li><strong>1.</strong> Abre el archivo <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-amber-200">src/App.tsx</code></li>
                  <li><strong>2.</strong> Busca la sección marcada como <code className="rounded bg-zinc-800 px-1.5 py-0.5">PROFILE_DATA</code> (líneas 8-61)</li>
                  <li><strong>3.</strong> Reemplaza TODOS los datos con la información real de la persona</li>
                  <li><strong>4.</strong> Guarda, haz commit y push a tu repo de GitHub</li>
                  <li><strong>5.</strong> GitHub Pages generará automáticamente: <code className="rounded bg-zinc-800 px-1.5 py-0.5">https://tu-usuario.github.io/nombre-repo</code></li>
                  <li><strong>6.</strong> Genera un QR apuntando a esa URL e imprímelo en un sticker resistente</li>
                </ol>
                
                <div className="mt-4 rounded-lg border border-sky-400/20 bg-sky-500/5 p-3">
                  <p className="font-semibold text-sky-200">💡 Tip profesional:</p>
                  <p className="mt-1 text-zinc-300">Crea un repositorio SEPARADO para cada persona (ej: qr-emergencia-alejandra, qr-emergencia-carlos). Así cada QR es único e independiente.</p>
                </div>

                <div className="mt-4 rounded-lg border border-rose-400/20 bg-rose-500/5 p-3">
                  <p className="font-semibold text-rose-200">🔒 Privacidad:</p>
                  <p className="mt-1 text-zinc-300">Los datos se guardan en el código fuente (público si el repo es público). NO incluyas información ultra-sensible como números de tarjetas, contraseñas, etc. Solo datos médicos esenciales.</p>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setEditMode(false)}
                  className="rounded-xl bg-zinc-700 px-4 py-2 font-medium hover:bg-zinc-600"
                >
                  Entendido
                </button>
                <a
                  href="?edit=0"
                  className="rounded-xl bg-amber-600 px-4 py-2 font-medium text-black hover:bg-amber-500"
                >
                  Ver como público
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Componentes auxiliares
function Info({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? 'border-rose-400/30 bg-rose-500/10' : 'border-white/10 bg-white/[0.02]'}`}>
      <div className="text-[11px] uppercase tracking-wide text-zinc-400">{label}</div>
      <div className={`mt-1 font-semibold ${highlight ? 'text-rose-200' : ''}`}>{value}</div>
    </div>
  );
}

function InfoInline({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2">
      <span className="text-zinc-400">{label}:</span>
      <span className="font-medium text-zinc-200 text-right">{value}</span>
    </div>
  );
}

function DetailBlock({ title, items, color }: { title: string; items: string[]; color: 'rose' | 'amber' | 'sky' | 'violet' }) {
  const colors = {
    rose: 'border-rose-400/20 bg-rose-500/5 text-rose-200',
    amber: 'border-amber-400/20 bg-amber-500/5 text-amber-200',
    sky: 'border-sky-400/20 bg-sky-500/5 text-sky-200',
    violet: 'border-violet-400/20 bg-violet-500/5 text-violet-200',
  };
  return (
    <div className={`rounded-xl border p-3 ${colors[color]}`}>
      <div className="text-[11px] font-bold uppercase tracking-wide">{title}</div>
      <ul className="mt-2 space-y-1 text-[13px] leading-relaxed text-zinc-200">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current opacity-70" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}