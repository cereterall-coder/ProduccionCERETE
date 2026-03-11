import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Users, Play, Plus, Trash2, Edit2, RefreshCw, Database,
  Search, CheckCircle2, AlertCircle, X, LayoutDashboard, Activity,
  ArrowRight, UserPlus, Filter, Info, FileText, BarChart3,
  Calendar, Hospital, Stethoscope, ChevronRight, ChevronDown, Table as TableIcon,
  Copyright, PanelLeftClose, PanelLeftOpen, Maximize, Minimize, LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logoCerete from './assets/logo_cerete.png';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList
} from 'recharts';


const API_BASE = '';

const CENTROS_MAP = {
  "671": "HOSPITAL NACIONAL VIRGEN DE LA PUERTA",
  "205": "HOSPITAL VICTOR LAZARTE",
  "206": "HOSPITAL II CHOCOPE",
  "207": "HOSPITAL I ALBRECHT",
  "208": "HOSPITAL I PACASMAYO",
  "211": "HOSPITAL I FLORENCIA DE MORA",
  "212": "HOSPITAL I LA ESPERANZA",
  "213": "HOSPITAL I MOCHE",
  "241": "HOSPITAL I VIRU",
  "444": "HOSPITAL I CHAO",
  "429": "CME CASA GRANDE",
  "209": "CM ASCOPE",
  "210": "POLICLINICO EL PORVENIR",
  "443": "POLICLINICO LARCO",
  "484": "CAP. III METROPOLITANO",
  "223": "CAP. II GUADALUPE",
  "224": "CAP. II HUAMACHUCO",
  "226": "CAP. II LAREDO",
  "229": "CAP. II OTUZCO",
  "219": "CAP. I CASCAS",
  "220": "CAP. I CHICAMA",
  "228": "CAP. I MALABRIGO",
  "231": "CAP. I SALAVERRY",
  "235": "CAP. I SAN PEDRO",
  "239": "CAP. I SOLEDAD",
  "240": "CAP. I TAYABAMBA",
  "218": "PM CARTAVIO",
  "225": "PM JEQUETEPEQUE",
  "227": "PM LIMONCARRO",
  "230": "PM QUIRUVILCA",
  "233": "PM SAN JOSE",
  "236": "PM STGO DE CHUCO",
  "237": "PM SAUSAL",
  "432": "PM PAIJAN",
  "433": "PM SANTIAGO DE CAO",
  "442": "CM HUANCHACO"
};

const getCentroNombre = (code) => CENTROS_MAP[String(code)] || code;

const val = (v) => {
  if (!v) return 0;
  const num = parseInt(v);
  return isNaN(num) ? 0 : num;
};

const normalizeName = (name) => {
  if (!name) return "";
  return name.toString().trim().toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos (Ó -> O)
    .replace(/[^A-Z0-9 ]/g, " ") // Quitar caracteres raros como ├ô
    .replace(/\s+/g, " ") // Colapsar espacios múltiples
    .trim();
};

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeReport, setActiveReport] = useState('matrix');
  const [especialidades, setEspecialidades] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [dashboardDate, setDashboardDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const [filters, setFilters] = useState({ centro: 'all', servicio: 'all', profesional: 'all', mes: 'all', field: 'PRO' });
  const [form, setForm] = useState({ ITEM: '', ESPECIALIDAD: '', NOMBRES_Y_APELLIDOS: '', DNI: '', ACTIVO: true, FOTO_URL: '' });
  const [editingId, setEditingId] = useState(null);
  const [showAuthorship, setShowAuthorship] = useState(false);
  const [selectedProfCalendar, setSelectedProfCalendar] = useState(null); // modal calendario
  const [activeProcess, setActiveProcess] = useState('horas'); // sub-pestañas de Consolidación
  const [importingCitados, setImportingCitados] = useState(false);
  const [processingCitados, setProcessingCitados] = useState(false);
  const [importingTerminalista, setImportingTerminalista] = useState(false);
  const [processingTerminalista, setProcessingTerminalista] = useState(false);
  const [citadosData, setCitadosData] = useState([]);
  const [terminalistaData, setTerminalistaData] = useState([]);
  const [selectedProfCitados, setSelectedProfCitados] = useState('all');
  const [selectedDigitador, setSelectedDigitador] = useState('all');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [loadingCitados, setLoadingCitados] = useState(false);
  const [loadingTerminalista, setLoadingTerminalista] = useState(false);
  const [mesesCitados, setMesesCitados] = useState([]);
  const [mesesTerminalista, setMesesTerminalista] = useState([]);
  const nowLocal = new Date();
  const currentMonth = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, '0')}`; // "YYYY-MM" local
  const [mesCitados, setMesCitados] = useState(currentMonth);
  const [mesTerminalista, setMesTerminalista] = useState(currentMonth);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('auth_cerete') === 'true');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const expectedPass = `cerete${dd}${mm}`;

    if (passwordInput === expectedPass) {
      setIsAuthenticated(true);
      sessionStorage.setItem('auth_cerete', 'true');
      setLoginError(false);
    } else {
      setLoginError(true);
      setPasswordInput('');
    }
  };

  useEffect(() => {
    fetchData();
    fetchReportData();

    // Configurar WebSocket para actualizaciones en tiempo real
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:8080';
    const ws = new WebSocket(`${protocol}//${host}/ws`);

    ws.onmessage = (event) => {
      if (event.data === 'refresh') {
        console.log('Actualización detectada, recargando datos...');
        fetchData();
        fetchReportData();
        // También recargar citados si estamos en esa pestaña o se requiere
        if (mesCitados) fetchCitadosData(mesCitados);
        if (mesTerminalista) fetchTerminalistaData(mesTerminalista);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket cerrado. Reintentando en 5s...');
      setTimeout(() => {
        // Podrías implementar una lógica de reconexión aquí
      }, 5000);
    };

    return () => ws.close();
  }, []);

  // ── Actualización Automática para Televisores/Monitores ───────────────────
  useEffect(() => {
    // Configurar un intervalo de 5 minutos (300,000 ms)
    const autoRefreshInterval = setInterval(() => {
      console.log('Recarga automática de datos para monitoreo...');
      fetchData();
      fetchReportData();
      if (activeTab === 'dashboard' || activeTab === 'monitoreo-hoy') {
        // Asegurarse de que se refresque con la fecha actual local
        const n = new Date();
        const y = n.getFullYear();
        const m = String(n.getMonth() + 1).padStart(2, '0');
        const d = String(n.getDate()).padStart(2, '0');
        setDashboardDate(`${y}-${m}-${d}`);
      }
    }, 300000); // 5 minutos

    return () => clearInterval(autoRefreshInterval);
  }, [activeTab]);
  // ─────────────────────────────────────────────────────────────────────────

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false));
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const fetchCitadosData = async (mes) => {
    setLoadingCitados(true);
    try {
      const url = mes
        ? `${API_BASE}/citados-data-mes?mes=${mes}`
        : `${API_BASE}/citados-data`;
      const res = await axios.get(url);
      const data = Array.isArray(res.data) ? res.data : [];
      setCitadosData(data);
    } catch (err) { 
      console.error('No se pudo cargar citados:', err); 
      setCitadosData([]);
    }
    finally { setLoadingCitados(false); }
  };

  const fetchMesesCitados = async () => {
    try {
      const res = await axios.get(`${API_BASE}/citados-meses`);
      const meses = res.data;
      setMesesCitados(meses);
      const target = meses.includes(currentMonth) ? currentMonth : (meses.length > 0 ? meses[meses.length - 1] : null);
      if (target) { setMesCitados(target); fetchCitadosData(target); }
      else { fetchCitadosData(null); }
    } catch (err) { console.error(err); fetchCitadosData(null); }
  };

  const fetchTerminalistaData = async (mes) => {
    setLoadingTerminalista(true);
    try {
      const url = mes ? `${API_BASE}/terminalista-data-mes?mes=${mes}` : `${API_BASE}/terminalista-data`;
      const res = await axios.get(url);
      const data = Array.isArray(res.data) ? res.data : [];
      setTerminalistaData(data);
    } catch (err) { 
      console.error('Error cargando terminalistas:', err); 
      setTerminalistaData([]);
    }
    finally { setLoadingTerminalista(false); }
  };

  const fetchMesesTerminalista = async () => {
    try {
      const res = await axios.get(`${API_BASE}/terminalista-meses`);
      const meses = res.data;
      setMesesTerminalista(meses);
      const target = meses.includes(currentMonth) ? currentMonth : (meses.length > 0 ? meses[meses.length - 1] : null);
      if (target) { setMesTerminalista(target); fetchTerminalistaData(target); }
      else { fetchTerminalistaData(null); }
    } catch (err) { console.error(err); fetchTerminalistaData(null); }
  };

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_BASE}/especialidades`);
      setEspecialidades(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/report-data`);
      const data = Array.isArray(res.data) ? res.data : [];
      setReportData(data);
      if (data.length > 0) {
        const monthsSet = new Set(data.map(d => {
          const p = d.PERIODO?.split('/');
          return (p && p.length >= 3) ? `${p[1]}/${p[2]}` : null;
        }).filter(Boolean));

        if (monthsSet.size > 0) {
          const sortedMonths = [...monthsSet].sort((a, b) => {
            const [mA, yA] = a.split('/').map(Number);
            const [mB, yB] = b.split('/').map(Number);
            return yA !== yB ? yA - yB : mA - mB;
          });
          const latestMonth = sortedMonths[sortedMonths.length - 1];
          setFilters(f => ({ ...f, mes: latestMonth }));
        }
      }
    } catch (err) { 
      console.error('Error en fetchReportData:', err); 
      setReportData([]);
    } finally { setLoading(false); }
  };

  const handleImportTxt = async () => {
    setImporting(true);
    try {
      await axios.post(`${API_BASE}/import-txt`);
      alert("Archivos TXT unidos correctamente.");
    } catch (err) { alert("Error al procesar TXT."); } finally { setImporting(false); }
  };

  const handleProcess = async () => {
    setProcessing(true);
    try {
      await axios.post(`${API_BASE}/process`);
      alert("Consolidación completada.");
      fetchReportData();
    } catch (err) { alert("Error en el cruce."); } finally { setProcessing(false); }
  };

  const handleImportCitados = async () => {
    setImportingCitados(true);
    try {
      await axios.post(`${API_BASE}/import-citados`);
      alert("Archivos de Citados unidos correctamente.");
    } catch (err) { alert("Error al consolidar Citados."); } finally { setImportingCitados(false); }
  };

  const handleProcessCitados = async () => {
    setProcessingCitados(true);
    try {
      await axios.post(`${API_BASE}/process-citados`);
      alert("Cruce de Citados completado.");
    } catch (err) { alert("Error en el cruce de Citados."); } finally { setProcessingCitados(false); }
  };

  const handleImportTerminalista = async () => {
    setImportingTerminalista(true);
    try {
      await axios.post(`${API_BASE}/import-terminalista`);
      alert("Archivos TXT de Terminalistas unidos correctamente.");
    } catch (err) { alert("Error al consolidar Terminalistas."); } finally { setImportingTerminalista(false); }
  };

  const handleProcessTerminalista = async () => {
    setProcessingTerminalista(true);
    try {
      await axios.post(`${API_BASE}/process-terminalista`);
      alert("Cruce de Terminalistas completado.");
    } catch (err) { alert("Error en el cruce de Terminalistas."); } finally { setProcessingTerminalista(false); }
  };


  const matrixData = useMemo(() => {
    if (!reportData.length || activeReport !== 'matrix') return { headers: [], rows: [] };
    let selectedMes = filters.mes;
    if (selectedMes === 'all' && reportData.length > 0) {
      const p = reportData[0].PERIODO.split('/');
      selectedMes = `${p[1]}/${p[2]}`;
    }
    if (!selectedMes || !selectedMes.includes('/')) return { headers: [], rows: [] };
    const [month, year] = selectedMes.split('/');
    const daysInMonth = new Date(year, parseInt(month), 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const grouping = {};
    reportData.forEach(d => {
      if (!d.PERIODO) return;
      const parts = d.PERIODO.split('/');
      if (parts.length < 3) return;
      const dMonth = parts[1];
      const dYear = parts[2];
      const dDay = parseInt(parts[0]);

      if (`${dMonth}/${dYear}` === selectedMes) {
        const profName = d.PROFESIONAL || 'SIN NOMBRE';
        const dni = d.DOC_PROFESIONAL;
        
        // Filtro de Profesionales Activos
        const masterInfo = especialidades.find(e => e.DNI === dni || e.NOMBRES_Y_APELLIDOS === profName);
        if (masterInfo && masterInfo.ACTIVO === false) return;

        const centerName = d.CENTRO || 'SIN CENTRO';
        const turnoName = d.TURNO || 'SIN TURNO';
        const groupKey = `${centerName} |-| ${turnoName}`;

        if (!grouping[profName]) grouping[profName] = { _total: 0 };
        if (!grouping[profName][groupKey]) grouping[profName][groupKey] = {};
        const cellValue = val(d[filters.field]);
        grouping[profName][groupKey][dDay] = (grouping[profName][groupKey][dDay] || 0) + cellValue;
        grouping[profName]._total += cellValue;
      }
    });

    const rows = Object.entries(grouping).map(([prof, centers]) => {
      const children = Object.entries(centers)
        .filter(([k]) => k !== '_total')
        .map(([key, dayValues]) => {
          const [center, turno] = key.split(' |-| ');
          return { center, turno, dayValues };
        });
      return { name: prof, total: centers._total, isParent: true, children };
    }).filter(r => r.total > 0).sort((a, b) => a.name.localeCompare(b.name));

    return { headers: days, rows };
  }, [reportData, filters.mes, filters.field, activeReport, especialidades]);

  const produccionData = useMemo(() => {
    if (!reportData.length || activeReport !== 'production') return { headers: [], rows: [] };

    const months = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
    const grouping = {};
    const yearsSet = new Set();


    reportData.forEach(d => {
      if (!d.PERIODO) return;
      const parts = d.PERIODO.split('/');
      if (parts.length < 3) return;
      const dMonth = parseInt(parts[1]);
      const dYear = parts[2];
      yearsSet.add(dYear);

      let serviceName = d.SERVICIO || 'SIN SERVICIO';
      if (serviceName.includes('TECNOLOGO MEDICO') && serviceName.includes('TERAPIA FISICA')) {
        serviceName = 'T.M EN TERAPIA FISICA Y REHABILITACION';
      }
      const centerName = d.CENTRO || 'SIN CENTRO';
      const monthIdx = dMonth - 1;

      // Filtro de Profesionales Activos
      const profName = d.PROFESIONAL;
      const dni = d.DOC_PROFESIONAL;
      const masterInfo = especialidades.find(e => e.DNI === dni || e.NOMBRES_Y_APELLIDOS === profName);
      if (masterInfo && masterInfo.ACTIVO === false) return;

      if (!grouping[serviceName]) grouping[serviceName] = { _total: 0 };
      if (!grouping[serviceName][centerName]) grouping[serviceName][centerName] = {};

      const ateVal = val(d.ATE);
      const key = `${monthIdx}-${dYear}`;
      grouping[serviceName][centerName][key] = (grouping[serviceName][centerName][key] || 0) + ateVal;
      grouping[serviceName]._total += ateVal;

    });

    const sortedYears = Array.from(yearsSet).sort();
    const headers = [];
    sortedYears.forEach(year => {
      months.forEach((m, i) => {
        headers.push({ label: `${m} ${year}`, key: `${i}-${year}` });
      });
    });

    const rows = Object.entries(grouping).map(([service, centers]) => {
      const children = Object.entries(centers)
        .filter(([k]) => k !== '_total')
        .map(([center, monthValues]) => ({ name: center, dayValues: monthValues }));
      return { name: service, total: centers._total, isParent: true, children };
    }).filter(r => r.total > 0).sort((a, b) => a.name.localeCompare(b.name));

    return { headers, rows };
  }, [reportData, activeReport, especialidades]);


  const resumenData = useMemo(() => {
    if (!reportData.length || activeReport !== 'month') return { headers: [], rows: [] };
    let selectedMes = filters.mes;
    if (selectedMes === 'all' && reportData.length > 0) {
      const p = reportData[0].PERIODO.split('/');
      selectedMes = `${p[1]}/${p[2]}`;
    }
    if (!selectedMes || !selectedMes.includes('/')) return { headers: [], rows: [] };
    const [month, year] = selectedMes.split('/');
    const daysInMonth = new Date(year, parseInt(month), 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const grouping = {};
    reportData.forEach(d => {
      if (!d.PERIODO) return;
      const parts = d.PERIODO.split('/');
      if (parts.length < 3) return;
      const dMonth = parts[1];
      const dYear = parts[2];
      const dDay = parseInt(parts[0]);

      if (`${dMonth}/${dYear}` === selectedMes) {
        if (filters.centro !== 'all' && d.CENTRO !== filters.centro) return;
        const profName = d.PROFESIONAL || 'SIN NOMBRE';
        const dni = d.DOC_PROFESIONAL;

        // Filtro de Profesionales Activos
        const masterInfo = especialidades.find(e => e.DNI === dni || e.NOMBRES_Y_APELLIDOS === profName);
        if (masterInfo && masterInfo.ACTIVO === false) return;

        // Determinar Turno (M o T)
        const horaIni = parseInt(String(d.HORA_INI || '').split(':')[0]);
        const turnoKey = (!isNaN(horaIni) && horaIni < 13) ? 'M' : 'T';

        if (!grouping[profName]) grouping[profName] = {};
        if (!grouping[profName][turnoKey]) {
          grouping[profName][turnoKey] = {
            PRO: { _total: 0 },
            CIT: { _total: 0 },
            ATE: { _total: 0 }
          };
        }

        ['PRO', 'CIT', 'ATE'].forEach(field => {
          const valNum = val(d[field]);
          grouping[profName][turnoKey][field][dDay] = (grouping[profName][turnoKey][field][dDay] || 0) + valNum;
          grouping[profName][turnoKey][field]._total += valNum;
        });
      }
    });

    const rows = Object.entries(grouping).map(([prof, turnos]) => {
      const children = [];
      Object.entries(turnos).forEach(([turno, fields]) => {
        ['PRO', 'CIT', 'ATE'].forEach(field => {
          children.push({
            type: field,
            name: `[${turno}] ${field}`,
            total: fields[field]._total,
            dayValues: fields[field]
          });
        });
      });
      // El total del padre será la suma de todos los PRO (cupos) de todos sus turnos
      const totalPro = Object.values(turnos).reduce((acc, t) => acc + t.PRO._total, 0);
      return { name: prof, isParent: true, children, total: totalPro };
    }).filter(r => r.total >= 0).sort((a, b) => a.name.localeCompare(b.name));

    return { headers: days, rows };
  }, [reportData, filters.mes, filters.centro, activeReport, especialidades]);

  const dashboardData = useMemo(() => {
    // Convertir dashboardDate "YYYY-MM-DD" → "DD/MM/YYYY" (formato de PERIODO)
    const [yyyy, mm, dd] = dashboardDate.split('-');
    const todayStr = `${dd}/${mm}/${yyyy}`;
    const data = reportData.filter(d => d.PERIODO === todayStr && val(d.PRO) > 0);
    const profs = {};
    data.forEach(d => {
      const name = d.PROFESIONAL;
      const dni = d.DOC_PROFESIONAL;
      if (!profs[name]) {
        const masterInfo = especialidades.find(e => e.DNI === dni || e.NOMBRES_Y_APELLIDOS === name);
        profs[name] = {
          name,
          dni: dni || (masterInfo ? masterInfo.DNI : ''),
          especialidad: masterInfo ? masterInfo.ESPECIALIDAD : (d.SERVICIO || 'ASISTENCIAL'),
          fotoUrl: masterInfo ? masterInfo.FOTO_URL : '',
          assignments: [],
          totalCit: 0,
          totalPro: 0
        };
      }
      profs[name].assignments.push({ centro: d.CENTRO, turno: d.TURNO, cit: val(d.CIT), pro: val(d.PRO), ate: val(d.ATE) });
      profs[name].totalCit += val(d.CIT);
      profs[name].totalPro += val(d.PRO);
    });

    const sortedList = Object.values(profs)
      .filter(p => {
        const masterInfo = especialidades.find(e => e.DNI === p.dni || e.NOMBRES_Y_APELLIDOS === p.name);
        return masterInfo ? masterInfo.ACTIVO !== false : true; 
      })
      .map(p => ({
        ...p,
        assignments: p.assignments.sort((a, b) => {
          const hA = parseInt(String(a.turno).split(':')[0]) || 0;
          const hB = parseInt(String(b.turno).split(':')[0]) || 0;
          return hA - hB;
        })
      })).sort((a, b) => a.name.localeCompare(b.name));

    return {
      stats: {
        totalPros: sortedList.length,
        totalCit: sortedList.reduce((acc, p) => acc + p.totalCit, 0),
        totalPro: sortedList.reduce((acc, p) => acc + p.totalPro, 0),
        totalAte: sortedList.reduce((acc, p) => acc + p.assignments.reduce((sum, a) => sum + a.ate, 0), 0)
      },
      list: sortedList
    };
  }, [reportData, especialidades, dashboardDate]);

  const monitoreoDailyData = useMemo(() => {
    const [yyyy, mm] = dashboardDate.split('-');
    const targetMonthYear = `${mm}/${yyyy}`;
    const daysCount = new Date(yyyy, mm, 0).getDate();
    const result = [];
    
    for (let i = 1; i <= daysCount; i++) {
      const dStr = String(i).padStart(2, '0') + '/' + targetMonthYear;
      let cSum = 0;
      let aSum = 0;
      
      // Mapear profesionales del día para aplicar filtro de "Activo" igual que en Dashboard
      const dailyProfs = {};
      reportData.forEach(d => {
        if (d.PERIODO === dStr && val(d.PRO) > 0) {
          const name = d.PROFESIONAL;
          if (!dailyProfs[name]) {
            const dni = d.DOC_PROFESIONAL;
            const masterInfo = especialidades.find(e => e.DNI === dni || e.NOMBRES_Y_APELLIDOS === name);
            if (masterInfo && masterInfo.ACTIVO === false) return; // Omitir si está en lista maestra como INACTIVO
            dailyProfs[name] = { cit: 0, ate: 0 };
          }
          dailyProfs[name].cit += val(d.CIT);
          dailyProfs[name].ate += val(d.ATE);
        }
      });

      // Sumar totales del día filtrado
      Object.values(dailyProfs).forEach(p => {
        cSum += p.cit;
        aSum += p.ate;
      });

      result.push({
        day: i,
        label: `${i}`,
        cit: cSum,
        ate: aSum,
        porcentaje: cSum > 0 ? Math.round((aSum / cSum) * 100) : 0
      });
    }
    return result;
  }, [reportData, especialidades, dashboardDate]);

  const monitoreoTotals = useMemo(() => {
    return monitoreoDailyData.reduce((acc, curr) => ({
      cit: acc.cit + curr.cit,
      ate: acc.ate + curr.ate
    }), { cit: 0, ate: 0 });
  }, [monitoreoDailyData]);

  const currentReportData = activeReport === 'matrix' ? matrixData : (activeReport === 'production' ? produccionData : resumenData);

  const uniqueLists = useMemo(() => ({
    centros: [...new Set(reportData.map(d => d.CENTRO))].sort(),
    meses: [...new Set(reportData.map(d => {
      const p = d.PERIODO.split('/');
      return `${p[1]}/${p[2]}`;
    }))].sort((a, b) => {
      const [mA, yA] = a.split('/').map(Number);
      const [mB, yB] = b.split('/').map(Number);
      return yA !== yB ? yA - yB : mA - mB;
    }),
    profesionalesActivos: [...new Set(reportData.map(d => d.PROFESIONAL).filter(Boolean))]
      .filter(p => {
        // Encontrar una entrada de reportData para obtener el DNI de este profesional
        const sampleEntry = reportData.find(d => d.PROFESIONAL === p);
        const dni = sampleEntry ? String(sampleEntry.DOC_PROFESIONAL || "").trim() : "";
        
        const masterInfo = especialidades.find(e => 
          String(e.DNI || "").trim() === dni || normalizeName(e.NOMBRES_Y_APELLIDOS) === normalizeName(p)
        );
        
        // Si no está en la maestra, lo mostramos por defecto.
        // Solo lo ocultamos si masterInfo EXISTE y ACTIVO es estrictamente false.
        return masterInfo ? masterInfo.ACTIVO !== false : true; 
      })
      .sort()
  }), [reportData, especialidades]);

  // ── Reportes de Citados ──────────────────────────────────────────────────
  const parseDate = (str) => {
    if (!str) return null;
    const [d, m, y] = str.split('/');
    return new Date(`${y}-${m}-${d}`);
  };

  const profListCitados = useMemo(
    () => [...new Set(citadosData.map(r => r.PROFESIONAL).filter(Boolean))].sort(),
    [citadosData]
  );

  const filteredCitados = useMemo(() => {
    return citadosData.filter(r => {
      if (r.ESTADO_CITA !== 'ATENDIDA') return false;
      if (selectedProfCitados !== 'all' && r.PROFESIONAL !== selectedProfCitados) return false;
      if (fechaDesde || fechaHasta) {
        const fecha = parseDate(r.FECHA_CITA);
        if (!fecha) return false;
        if (fechaDesde && fecha < new Date(fechaDesde)) return false;
        if (fechaHasta && fecha > new Date(fechaHasta)) return false;
      }
      return true;
    });
  }, [citadosData, selectedProfCitados, fechaDesde, fechaHasta]);

  const digitadoresList = useMemo(
    () => [...new Set(terminalistaData.map(r => r.NOMBRE_USUARIO).filter(Boolean))].sort(),
    [terminalistaData]
  );

  const filteredTerminalista = useMemo(() => {
    return terminalistaData.filter(r => {
      if (selectedDigitador !== 'all' && r.NOMBRE_USUARIO !== selectedDigitador) return false;
      if (fechaDesde || fechaHasta) {
        // En terminalistas el campo es FECHOR_REGISTRO (DD/MM/YYYY HH:MM)
        const datePart = r.FECHOR_REGISTRO?.split(' ')[0];
        const fecha = parseDate(datePart);
        if (!fecha) return false;
        if (fechaDesde && fecha < new Date(fechaDesde)) return false;
        if (fechaHasta && fecha > new Date(fechaHasta)) return false;
      }
      return true;
    });
  }, [terminalistaData, selectedDigitador, fechaDesde, fechaHasta]);


  // ── Reportes de Programación (PDF) ──────────────────────────────────────────
  const generarPDFProgramacionMes = (targetMes, targetProf = 'all') => {
    try {
      if (targetMes === 'all') {
        alert("Por favor seleccione un mes.");
        return;
      }
      
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 10;

      const filtered = reportData.filter(d => {
        if (!d.PERIODO) return false;
        
        // 1. Filtro de Mes
        const parts = d.PERIODO.split('/');
        const periodMatches = `${parts[1]}/${parts[2]}` === targetMes;
        if (!periodMatches) return false;

        // 2. Filtro de Activo (Por DNI)
        const dni = String(d.DOC_PROFESIONAL || "").trim();
        const masterInfo = especialidades.find(e => 
          String(e.DNI || "").trim() === dni || normalizeName(e.NOMBRES_Y_APELLIDOS) === normalizeName(d.PROFESIONAL)
        );
        
        // Permitir si no está en la maestra, o si está en la maestra y está activo.
        const isActive = masterInfo ? masterInfo.ACTIVO !== false : true;
        if (!isActive) return false;

        // 3. Filtro de Profesional específico (si aplica)
        const profMatches = targetProf === 'all' || d.PROFESIONAL === targetProf;
        
        return profMatches && val(d.PRO) > 0;
      });

      if (filtered.length === 0) {
        alert("No hay datos de programación para los filtros seleccionados.");
        return;
      }

      const grouped = {};
      filtered.forEach(d => {
        const prof = d.PROFESIONAL || 'SIN NOMBRE';
        if (!grouped[prof]) grouped[prof] = [];
        grouped[prof].push(d);
      });

      const sortedProfs = Object.keys(grouped).sort();
      const [mNum, yNum] = targetMes.split('/').map(Number);
      const monthsNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      const mesNombre = monthsNames[mNum - 1];

      sortedProfs.forEach((prof, idx) => {
        if (idx > 0) doc.addPage();

        // HEADER
        doc.setFillColor(24, 113, 185);
        doc.rect(0, 0, pageW, 25, 'F');
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(`PROGRAMACIÓN MENSUAL - ${mesNombre.toUpperCase()} ${yNum}`, margin, 12);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Centro Regional de Telemedicina - Red Asistencial La Libertad`, margin, 18);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(prof, margin, 35);

        const subHeaderY = 40;
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, subHeaderY, pageW - margin, subHeaderY);

        const calX = margin;
        const calY = 48;
        const cellSize = 11; // Reducido un poco para modo vertical
        const calWidth = cellSize * 7;
        
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        const daysAbbr = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
        daysAbbr.forEach((day, i) => {
          if (i === 0) {
            doc.setTextColor(220, 38, 38); // Rojo para "DOM"
          } else {
            doc.setTextColor(100, 116, 139);
          }
          doc.text(day, calX + (i * cellSize) + (cellSize / 2), calY - 3, { align: 'center' });
        });

        const firstDay = new Date(yNum, mNum - 1, 1).getDay();
        const daysInMonth = new Date(yNum, mNum, 0).getDate();
        const shiftsByDay = {};
        grouped[prof].forEach(d => {
          const dayNum = parseInt(d.PERIODO.split('/')[0]);
          if (!shiftsByDay[dayNum]) shiftsByDay[dayNum] = [];
          shiftsByDay[dayNum].push(d);
        });

        let dayCounter = 1;
        for (let row = 0; row < 6; row++) {
          for (let col = 0; col < 7; col++) {
            const x = calX + col * cellSize;
            const y = calY + row * cellSize;
            if ((row === 0 && col < firstDay) || dayCounter > daysInMonth) {
              doc.setDrawColor(241, 245, 249);
              doc.rect(x, y, cellSize, cellSize, 'S');
            } else {
              const hasShifts = shiftsByDay[dayCounter];
              if (hasShifts) {
                if (hasShifts.length > 1) {
                  doc.setFillColor(16, 185, 129); // Verde
                } else {
                  doc.setFillColor(186, 230, 253); // Azul claro
                }
                doc.rect(x, y, cellSize, cellSize, 'F');
              }
              doc.setDrawColor(203, 213, 225);
              doc.rect(x, y, cellSize, cellSize, 'S');
              doc.setFontSize(9);
              doc.setFont('helvetica', 'bold');
              if (hasShifts && hasShifts.length > 1) {
                doc.setTextColor(255, 255, 255);
              } else if (col === 0) {
                doc.setTextColor(220, 38, 38); // Rojo para número en domingo
              } else {
                doc.setTextColor(30, 41, 59);
              }
              doc.text(dayCounter.toString(), x + 2, y + 4);

              if (hasShifts) {
                doc.setFontSize(6);
                hasShifts.forEach((s, sIdx) => {
                  const hStart = parseInt(String(s.HORA_INI || '').split(':')[0]);
                  const isM = (!isNaN(hStart) && hStart < 13);
                  if (col === 0) {
                    doc.setTextColor(220, 38, 38); // Rojo para letras en domingo
                  } else if (isM) {
                    doc.setTextColor(24, 113, 185);
                  } else {
                    doc.setTextColor(245, 158, 11);
                  }
                  doc.setFont('helvetica', 'bold');
                  const textX = x + cellSize - 2.5 - (sIdx * 3.5);
                  doc.text(isM ? 'M' : 'T', textX, y + cellSize - 1.5, { align: 'right' });
                });
              }
              dayCounter++;
            }
          }
          if (dayCounter > daysInMonth) break;
        }

        const tableX = calX + calWidth + 5; // Menos espacio entre cal y tabla para modo vertical
        const tableData = grouped[prof].sort((a, b) => {
          const dA = parseInt(a.PERIODO.split('/')[0]);
          const dB = parseInt(b.PERIODO.split('/')[0]);
          return dA - dB;
        });

        autoTable(doc, {
          startY: calY - 10,
          margin: { left: tableX },
          head: [['FECHA', 'TURNO', 'SUBACTIVIDAD / ESTABLECIMIENTO', 'CUPOS']],
          body: tableData.map(d => [
            d.PERIODO,
            d.TURNO,
            `${d.SUBACTIVIDAD || d.ACTIVIDAD} - [${getCentroNombre(d.CENTRO)}]`,
            d.PRO || '0'
          ]),
          styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
          headStyles: { fillColor: [24, 113, 185], fontStyle: 'bold' },
          columnStyles: { 
            0: { cellWidth: 18 }, 
            1: { cellWidth: 30 }, 
            2: { cellWidth: 'auto' }, 
            3: { cellWidth: 12, halign: 'center' } 
          },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          theme: 'grid'
        });

        const finalY = Math.max(doc.lastAutoTable.finalY, calY + cellSize * 6) + 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(24, 113, 185);
        doc.text(`TOTAL TURNOS PROGRAMADOS: ${tableData.length}`, margin, finalY);

        // FECHA EMISIÓN Y NOTA
        const emissionDate = new Date().toLocaleString('es-PE');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 116, 139);
        doc.text(`Fecha de emisión: ${emissionDate}`, margin, finalY + 7);
        doc.text(`* Reporte sujeto a cambios en el día`, margin, finalY + 11);
      });

      const fileName = targetProf === 'all' 
        ? `Programacion_Mensual_Todos_${targetMes.replace('/', '_')}.pdf`
        : `Programacion_Mensual_${targetProf.replace(/ /g, '_')}_${targetMes.replace('/', '_')}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error generando PDF Mensual:', error);
      alert('Error crítico al generar el PDF. Revise la consola del navegador.');
    }
  };

  const generarPDFProgramacionDia = (targetDate) => {
    try {
      if (!targetDate) {
        alert("Seleccione una fecha.");
        return;
      }
      const [y, m, d] = targetDate.split('-');
      const dateStr = `${d}/${m}/${y}`;
      
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 10;

      // HEADER (Mismo diseño que mensual)
      doc.setFillColor(24, 113, 185);
      doc.rect(0, 0, pageW, 25, 'F');
      
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`PROGRAMACIÓN DEL DÍA: ${dateStr}`, margin, 12);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Centro Regional de Telemedicina - Red Asistencial La Libertad`, margin, 18);

      const filtered = reportData.filter(d => {
        if (d.PERIODO !== dateStr || val(d.PRO) <= 0) return false;
        
        // Aplicar filtro de activos también aquí por consistencia
        const dni = String(d.DOC_PROFESIONAL || "").trim();
        const masterInfo = especialidades.find(e => 
          String(e.DNI || "").trim() === dni || normalizeName(e.NOMBRES_Y_APELLIDOS) === normalizeName(d.PROFESIONAL)
        );
        return masterInfo ? masterInfo.ACTIVO !== false : true;
      }).sort((a, b) => (a.PROFESIONAL || '').localeCompare(b.PROFESIONAL || ''));

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`Resumen de Profesionales Programados: ${filtered.length}`, margin, 35);

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 40, pageW - margin, 40);

      autoTable(doc, {
        startY: 45,
        head: [['PROFESIONAL', 'TURNO', 'ESTABLECIMIENTO', 'SUBACTIVIDAD', 'CUPOS']],
        body: filtered.map(d => [
          d.PROFESIONAL,
          d.TURNO,
          getCentroNombre(d.CENTRO),
          d.SUBACTIVIDAD || d.ACTIVIDAD || '',
          d.PRO || '0'
        ]),
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [16, 185, 129], fontStyle: 'bold' },
        columnStyles: {
          3: { cellWidth: 'auto' },
          4: { cellWidth: 15, halign: 'center' }
        },
        alternateRowStyles: { fillColor: [240, 253, 244] },
      });
      
      const finalY = doc.lastAutoTable.finalY + 10;
      const emissionDate = new Date().toLocaleString('es-PE');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      doc.text(`Fecha de emisión: ${emissionDate}`, margin, finalY);
      doc.text(`* Reporte sujeto a cambios en el día`, margin, finalY + 4);

      doc.save(`Programacion_Dia_${dateStr.replace(/\//g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generando PDF Diario:', error);
      alert('Error crítico al generar el PDF. Revise la consola del navegador.');
    }
  };

  // ── Generación de PDF Citados ────────────────────────────────────────────────
  const generarPDFCitados = () => {
    const COLS_PDF = [
      { header: 'CENTRO', dataKey: 'CENTRO' },
      { header: 'SERVICIO', dataKey: 'SERVICIO' },
      { header: 'FECHA CITA', dataKey: 'FECHA_CITA' },
      { header: 'ESTADO', dataKey: 'ESTADO_CITA' },
      { header: 'DOC. PACIENTE', dataKey: 'DOC_PACIENTE' },
      { header: 'ACTO MED.', dataKey: 'ACTO_MED' },
      { header: 'CIE-10', dataKey: 'CIE10' },
    ];

    const prepararRegistros = (rows) =>
      rows.map(r => ({
        ...r,
        CIE10: r.ULTCIE10ATEN ? r.ULTCIE10ATEN.split(' - ')[0].trim() : '',
      }));

    const crearPDF = (profesional, filas) => {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 14;

      // Encabezado
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(24, 113, 185);
      doc.text('Atenciones en Telemedicina', margin, 18);

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Mes: ${mesCitados}   |   Profesional: ${profesional}`, margin, 25);

      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Total atenciones: ${filas.length}`, margin, 31);

      // Línea separadora
      doc.setDrawColor(24, 113, 185);
      doc.setLineWidth(0.5);
      doc.line(margin, 34, pageW - margin, 34);

      autoTable(doc, {
        startY: 37,
        columns: COLS_PDF,
        body: prepararRegistros(filas),
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 7,
          cellPadding: 1,          // mínimo interlineado
          overflow: 'linebreak',
          valign: 'middle',
          lineColor: [220, 230, 241],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [24, 113, 185],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 7,
          cellPadding: 1.2,
        },
        alternateRowStyles: { fillColor: [245, 249, 255] },
        columnStyles: {
          0: { cellWidth: 42 },  // CENTRO
          1: { cellWidth: 42 },  // SERVICIO — más ancho para 1 sola línea
          2: { cellWidth: 18 },  // FECHA
          3: { cellWidth: 16 },  // ESTADO
          4: { cellWidth: 20 },  // DOC PACIENTE
          5: { cellWidth: 16 },  // ACTO MED — código numérico corto
          6: { cellWidth: 12 },  // CIE-10   — código de 3-5 chars
        },
        didDrawPage: (data) => {
          // Pie de página
          const pg = doc.internal.getCurrentPageInfo().pageNumber;
          doc.setFontSize(7);
          doc.setTextColor(180, 180, 180);
          doc.text(
            `Página ${pg}`,
            pageW / 2,
            doc.internal.pageSize.getHeight() - 8,
            { align: 'center' }
          );
        },
      });

      // ── Hoja de consolidado final ──────────────────────────────────────────
      doc.addPage();
      const pageH = doc.internal.pageSize.getHeight();

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(24, 113, 185);
      doc.text('Consolidado de Atenciones', margin, 18);

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Mes: ${mesCitados}   |   Profesional: ${profesional}`, margin, 25);

      doc.setDrawColor(24, 113, 185);
      doc.setLineWidth(0.5);
      doc.line(margin, 29, pageW - margin, 29);

      // Agrupar por CENTRO
      const conteo = {};
      filas.forEach(r => {
        const c = r.CENTRO || 'Sin Centro';
        conteo[c] = (conteo[c] || 0) + 1;
      });
      const resumen = Object.entries(conteo)
        .sort((a, b) => b[1] - a[1])          // mayor a menor
        .map(([centro, total]) => ({ centro, total }));

      autoTable(doc, {
        startY: 33,
        head: [['CENTRO DE SALUD', 'ATENCIONES']],
        body: resumen.map(r => [getCentroNombre(r.centro), r.total]),
        foot: [['TOTAL', filas.length]],
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 2.5, valign: 'middle' },
        headStyles: { fillColor: [24, 113, 185], textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [24, 113, 185], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 249, 255] },
        columnStyles: {
          0: { cellWidth: 130 },
          1: { cellWidth: 36, halign: 'center', fontStyle: 'bold' },
        },
      });

      const parts = mesCitados.includes('-') ? mesCitados.split('-') : mesCitados.split('/');
      const anio = parts[0].length === 4 ? parts[0] : parts[1];
      const mesNum = parts[0].length === 4 ? parts[1] : parts[0];
      const nombreArchivo = `${profesional.replace(/\s+/g, '_')}_${mesNum}_${anio}.pdf`;
      doc.save(nombreArchivo);
    };

    if (selectedProfCitados === 'all') {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 14;

      let firstPage = true;
      profListCitados.forEach((prof) => {
        const filas = filteredCitados.filter(r => r.PROFESIONAL === prof);
        if (filas.length === 0) return;

        if (!firstPage) doc.addPage();
        firstPage = false;

        // --- Página de Detalle ---
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(24, 113, 185);
        doc.text('Atenciones en Telemedicina', margin, 18);

        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text(`Mes: ${mesCitados}   |   Profesional: ${prof}`, margin, 25);

        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Total atenciones: ${filas.length}`, margin, 31);

        doc.setDrawColor(24, 113, 185);
        doc.setLineWidth(0.5);
        doc.line(margin, 34, pageW - margin, 34);

        autoTable(doc, {
          startY: 37,
          columns: COLS_PDF,
          body: prepararRegistros(filas).map(r => ({ ...r, CENTRO: getCentroNombre(r.CENTRO) })),
          margin: { left: margin, right: margin },
          styles: { fontSize: 7, cellPadding: 1, valign: 'middle', lineColor: [220, 230, 241], lineWidth: 0.1 },
          headStyles: { fillColor: [24, 113, 185], textColor: 255, fontStyle: 'bold', fontSize: 7, cellPadding: 1.2 },
          alternateRowStyles: { fillColor: [245, 249, 255] },
          columnStyles: {
            0: { cellWidth: 42 }, 1: { cellWidth: 42 }, 2: { cellWidth: 18 },
            3: { cellWidth: 16 }, 4: { cellWidth: 20 }, 5: { cellWidth: 16 }, 6: { cellWidth: 12 },
          },
        });

        // --- Página de Resumen ---
        doc.addPage();
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(24, 113, 185);
        doc.text('Consolidado de Atenciones', margin, 18);

        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text(`Mes: ${mesCitados}   |   Profesional: ${prof}`, margin, 25);

        doc.setDrawColor(24, 113, 185);
        doc.setLineWidth(0.5);
        doc.line(margin, 29, pageW - margin, 29);

        const conteo = {};
        filas.forEach(r => {
          const c = r.CENTRO || 'Sin Centro';
          conteo[c] = (conteo[c] || 0) + 1;
        });
        const resumen = Object.entries(conteo)
          .sort((a, b) => b[1] - a[1])
          .map(([centro, total]) => ({ centro, total }));

        autoTable(doc, {
          startY: 33,
          head: [['CENTRO DE SALUD', 'ATENCIONES']],
          body: resumen.map(r => [getCentroNombre(r.centro), r.total]),
          foot: [['TOTAL', filas.length]],
          margin: { left: margin, right: margin },
          styles: { fontSize: 9, cellPadding: 2.5, valign: 'middle' },
          headStyles: { fillColor: [24, 113, 185], textColor: 255, fontStyle: 'bold' },
          footStyles: { fillColor: [24, 113, 185], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 249, 255] },
          columnStyles: { 0: { cellWidth: 130 }, 1: { cellWidth: 36, halign: 'center', fontStyle: 'bold' } },
        });
      });

      const parts = mesCitados.includes('-') ? mesCitados.split('-') : mesCitados.split('/');
      const anio = parts[0].length === 4 ? parts[0] : parts[1];
      const mesNum = parts[0].length === 4 ? parts[1] : parts[0];
      doc.save(`Consolidado_Citados_${mesNum}_${anio}.pdf`);
    } else {
      crearPDF(selectedProfCitados, filteredCitados);
    }
  };

  const generarPDFTerminalista = () => {
    const COLS_PDF = [
      { header: 'CENTRO', dataKey: 'CENTRO' },
      { header: 'SERVICIO', dataKey: 'SERVICIO' },
      { header: 'DESC_SERVICIO', dataKey: 'DESC_SERVICIO' },
      { header: 'FECHOR_REGISTRO', dataKey: 'FECHOR_REGISTRO' },
      { header: 'VOLUNTARIA', dataKey: 'TIPO_CITA' },
    ];

    const crearPDF = (digitador, filas) => {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 14;

      autoTable(doc, {
        startY: 37,
        columns: COLS_PDF,
        body: filas.map(r => ({ ...r, CENTRO: getCentroNombre(r.CENTRO) })),
        margin: { left: margin, right: margin, top: 35 },
        styles: { fontSize: 7, cellPadding: 0.8, valign: 'middle', minCellHeight: 3 },
        headStyles: { fillColor: [24, 113, 185], textColor: 255, fontStyle: 'bold', minCellHeight: 4 },
        alternateRowStyles: { fillColor: [245, 249, 255] },
        columnStyles: {
          0: { cellWidth: 55 }, // Centro (Nombre largo)
          1: { cellWidth: 15 }, // Servicio (Código)
          2: { cellWidth: 50 }, // Desc_Servicio
          3: { cellWidth: 32 }, // Fechor_Registro
          4: { cellWidth: 25 }, // Voluntaria
        },
        didDrawPage: (data) => {
          const pg = doc.internal.getCurrentPageInfo().pageNumber;
          const pW = doc.internal.pageSize.getWidth();
          const pH = doc.internal.pageSize.getHeight();

          doc.setFontSize(13);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(24, 113, 185);
          doc.text('Citas x Terminalista (Productividad)', margin, 18);

          doc.setFontSize(10);
          doc.setTextColor(80, 80, 80);
          doc.text(`Mes: ${mesTerminalista}   |   Digitador: ${digitador}`, margin, 25);

          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(`Total registros: ${filas.length}`, margin, 31);

          doc.setDrawColor(24, 113, 185);
          doc.setLineWidth(0.5);
          doc.line(margin, 34, pW - margin, 34);

          doc.setFontSize(7);
          doc.setTextColor(150, 150, 150);
          doc.text(`Página ${pg}`, pW / 2, pH - 8, { align: 'center' });
        },
      });

      // --- Página de Resumen Final ---
      doc.addPage();
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(24, 113, 185);
      doc.text('Consolidado de Citas (Resumen)', margin, 18);

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Mes: ${mesTerminalista}   |   Digitador: ${digitador}`, margin, 25);

      doc.setDrawColor(24, 113, 185);
      doc.setLineWidth(0.5);
      doc.line(margin, 29, pageW - margin, 29);

      const conteo = {};
      filas.forEach(r => {
        const c = r.CENTRO || 'Sin Centro';
        conteo[c] = (conteo[c] || 0) + 1;
      });
      const resumenData = Object.entries(conteo)
        .sort((a, b) => b[1] - a[1])
        .map(([centro, total]) => [getCentroNombre(centro), total]);

      autoTable(doc, {
        startY: 33,
        head: [['CENTRO DE SALUD', 'TOTAL CITAS']],
        body: resumenData,
        foot: [['TOTAL GENERAL', filas.length]],
        margin: { left: margin * 2.5, right: margin * 2.5 }, // Centrar un poco más
        styles: { fontSize: 9, cellPadding: 2.5, valign: 'middle' },
        headStyles: { fillColor: [24, 113, 185], textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [24, 113, 185], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 249, 255] },
        columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 36, halign: 'center', fontStyle: 'bold' } },
      });

      const parts = mesTerminalista.includes('-') ? mesTerminalista.split('-') : mesTerminalista.split('/');
      const anio = parts[0].length === 4 ? parts[0] : parts[1];
      const mesNum = parts[0].length === 4 ? parts[1] : parts[0];
      const nombreArchivo = `Terminalista_${digitador.replace(/\s+/g, '_')}_${mesNum}_${anio}.pdf`;
      doc.save(nombreArchivo);
    };

    if (selectedDigitador === 'all') {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 14;

      digitadoresList.forEach((dig, idx) => {
        const filas = filteredTerminalista.filter(r => r.NOMBRE_USUARIO === dig);
        if (filas.length === 0) return;

        if (idx > 0) doc.addPage();

        autoTable(doc, {
          startY: 37,
          columns: COLS_PDF,
          body: filas.map(r => ({ ...r, CENTRO: getCentroNombre(r.CENTRO) })),
          margin: { left: margin, right: margin, top: 35 },
          styles: { fontSize: 7, cellPadding: 0.8, valign: 'middle', minCellHeight: 3 },
          headStyles: { fillColor: [24, 113, 185], textColor: 255, fontStyle: 'bold', minCellHeight: 4 },
          alternateRowStyles: { fillColor: [245, 249, 255] },
          columnStyles: {
            0: { cellWidth: 55 },
            1: { cellWidth: 15 },
            2: { cellWidth: 50 },
            3: { cellWidth: 32 },
            4: { cellWidth: 25 },
          },
          didDrawPage: (data) => {
            const pgText = doc.internal.getCurrentPageInfo().pageNumber;
            const pW = doc.internal.pageSize.getWidth();
            const pH = doc.internal.pageSize.getHeight();

            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(24, 113, 185);
            doc.text('Citas x Terminalista (Productividad)', margin, 18);

            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80);
            doc.text(`Mes: ${mesTerminalista}   |   Digitador: ${dig}`, margin, 25);

            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Total registros: ${filas.length}`, margin, 31);

            doc.setDrawColor(24, 113, 185);
            doc.setLineWidth(0.5);
            doc.line(margin, 34, pW - margin, 34);

            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.text(`Página ${pgText}`, pW / 2, pH - 8, { align: 'center' });
          },
        });
      });

      // --- Página de Resumen Consolidado (Total General de todos los digitadores) ---
      doc.addPage();
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(24, 113, 185);
      doc.text('Resumen Consolidado - Todos los Digitadores', margin, 18);

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Mes: ${mesTerminalista}   |   Gerecia Regional La Libertad`, margin, 25);

      doc.setDrawColor(24, 113, 185);
      doc.setLineWidth(0.5);
      doc.line(margin, 29, pageW - margin, 29);

      const conteoGlobal = {};
      filteredTerminalista.forEach(r => {
        const c = r.CENTRO || 'Sin Centro';
        conteoGlobal[c] = (conteoGlobal[c] || 0) + 1;
      });
      const resumenGlobal = Object.entries(conteoGlobal)
        .sort((a, b) => b[1] - a[1])
        .map(([centro, total]) => [getCentroNombre(centro), total]);

      autoTable(doc, {
        startY: 33,
        head: [['CENTRO DE SALUD', 'TOTAL CITAS']],
        body: resumenGlobal,
        foot: [['TOTAL GENERAL MES', filteredTerminalista.length]],
        margin: { left: margin * 2.5, right: margin * 2.5 },
        styles: { fontSize: 9, cellPadding: 2.5, valign: 'middle' },
        headStyles: { fillColor: [24, 113, 185], textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [24, 113, 185], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 249, 255] },
        columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 36, halign: 'center', fontStyle: 'bold' } },
      });

      const parts = mesTerminalista.includes('-') ? mesTerminalista.split('-') : mesTerminalista.split('/');
      const anio = parts[0].length === 4 ? parts[0] : parts[1];
      const mesNum = parts[0].length === 4 ? parts[1] : parts[0];
      doc.save(`Consolidado_Terminalistas_${mesNum}_${anio}.pdf`);
    } else {
      crearPDF(selectedDigitador, filteredTerminalista);
    }
  };

  const toggleRow = (name) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(name)) newExpanded.delete(name);
    else newExpanded.add(name);
    setExpandedRows(newExpanded);
  };

  const openForm = (item = null) => {
    if (item) {
      setForm({
        ITEM: item.ITEM,
        ESPECIALIDAD: item.ESPECIALIDAD,
        NOMBRES_Y_APELLIDOS: item.NOMBRES_Y_APELLIDOS,
        DNI: item.DNI,
        ACTIVO: item.ACTIVO !== undefined ? item.ACTIVO : true,
        FOTO_URL: item.FOTO_URL || ''
      });
      setEditingId(item.ITEM);
    } else {
      setForm({ ITEM: '', ESPECIALIDAD: '', NOMBRES_Y_APELLIDOS: '', DNI: '', ACTIVO: true, FOTO_URL: '' });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId !== null) {
        await axios.put(`${API_BASE}/especialidades/${editingId}`, form);
      } else {
        await axios.post(`${API_BASE}/especialidades`, form);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) { alert("Error al guardar"); }
  };

  const handleDelete = async (id) => {
    if (confirm("¿Estás seguro de que deseas eliminar este especialista?")) {
      try {
        await axios.delete(`${API_BASE}/especialidades/${id}`);
        fetchData();
      } catch (err) { alert("Error al eliminar"); }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="login-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="login-card"
        >
          <img src={logoCerete} alt="CERETE" className="login-logo" />
          <h1 className="login-title">Sistema de Gestión</h1>
          <p className="login-subtitle">CENTRO REGIONAL DE TELEMEDICINA - RED ASISTENCIAL LA LIBERTAD</p>

          <form onSubmit={handleLogin} className="space-y-2">
            <div className="relative">
              <input
                type="password"
                placeholder="Ingresar Clave..."
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (loginError) setLoginError(false);
                }}
                className={`login-input ${loginError ? 'error' : ''}`}
                autoFocus
              />
              <AnimatePresence>
                {loginError && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-red-500 text-[10px] font-black uppercase mb-4 tracking-widest text-center"
                  >
                    Clave incorrecta. Intente de nuevo.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <button type="submit" className="login-btn">
              Acceder al Sistema
            </button>
          </form>

          <div className="login-footer">
            <Hospital size={14} strokeWidth={2.5} />
            <span>AMALVIVA — 2026</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`app-container ${!isSidebarOpen ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="flex items-center justify-center mb-8 px-2">
          <div className="flex items-center gap-3">
            {isSidebarOpen ? (
              <img
                src={logoCerete}
                alt="CERETE Logo"
                className="object-contain mx-auto"
                style={{ height: '4.5cm', width: '4.5cm' }}
              />
            ) : (
              <div className="w-10 h-10 bg-[#1871B9] rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/10 mx-auto">
                <Hospital size={20} color="white" strokeWidth={2.5} />
              </div>
            )}
          </div>
        </div>

        {/* BOTÓN FLOTANTE EN BORDE DERECHO DEL SIDEBAR */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title={isSidebarOpen ? 'Contraer menú' : 'Expandir menú'}
          style={{
            position: 'absolute',
            top: '50%',
            right: '-18px',
            transform: 'translateY(-50%)',
            zIndex: 200,
            backgroundColor: '#1871B9',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(24, 113, 185, 0.4)',
            transition: 'all 0.25s ease'
          }}
        >
          {isSidebarOpen ? <PanelLeftClose size={18} strokeWidth={1.75} /> : <PanelLeftOpen size={18} strokeWidth={1.75} />}
        </button>
        <nav className="flex-1">
          <button onClick={() => setActiveTab('dashboard')} className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}><LayoutDashboard size={20} /> <span>Dashboard</span></button>
          <button onClick={() => setActiveTab('crud')} className={`nav-item ${activeTab === 'crud' ? 'active' : ''}`}><Users size={20} /> <span>Especialistas</span></button>
          <button onClick={() => setActiveTab('process')} className={`nav-item ${activeTab === 'process' ? 'active' : ''}`}><Filter size={20} /> <span>Consolidación</span></button>
          <button onClick={() => setActiveTab('monitoreo-hoy')} className={`nav-item ${activeTab === 'monitoreo-hoy' ? 'active' : ''}`}><Activity size={20} /> <span>Monitoreo Hoy</span></button>
          <button onClick={() => setActiveTab('reports')} className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}><BarChart3 size={20} /> <span>Monitoreo</span></button>
          <button
            onClick={() => {
              setActiveTab('reportes');
              if (citadosData.length === 0) fetchMesesCitados();
            }}
            className={`nav-item ${activeTab === 'reportes' ? 'active' : ''}`}
          ><FileText size={20} /> <span>Reportes</span></button>
          <button
            onClick={() => {
              setActiveTab('terminalistas');
              if (terminalistaData.length === 0) fetchMesesTerminalista();
            }}
            className={`nav-item ${activeTab === 'terminalistas' ? 'active' : ''}`}
          ><Users size={20} /> <span>Terminalistas</span></button>
        </nav>

        <div className="mt-auto flex flex-col items-center gap-2 pb-6">
          <button
            onClick={toggleFullScreen}
            className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all duration-300"
            title={isFullscreen ? "Salir de Pantalla Completa" : "Pantalla Completa"}
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
          <button
            onClick={() => setShowAuthorship(true)}
            className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all duration-300 group relative"
            title="Información de Autoría"
          >
            <Copyright size={20} className="group-hover:rotate-12 transition-transform" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border-2 border-white animate-pulse"></div>
          </button>
          <button
            onClick={() => {
              if (confirm("¿Desea cerrar la sesión del sistema?")) {
                setIsAuthenticated(false);
                sessionStorage.removeItem('auth_cerete');
              }
            }}
            className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-300"
            title="Cerrar Sesión"
          >
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        {activeTab === 'dashboard' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20">
            {/* ENCABEZADO TIPO BANNER INSTITUCIONAL */}
            <div className="db-banner !py-4">
              <div className="relative z-10" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <h1 className="db-title">PERSONAL PROGRAMADO</h1>
                  <p className="text-blue-50 font-black text-2xl opacity-90 tracking-tight">
                    {new Date(dashboardDate + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                      .replace(/^\w/, c => c.toUpperCase())}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 700, marginTop: '2px' }}>
                    {dashboardData.list.length} profesional(es) programado(s)
                  </p>
                </div>
                {/* Selector de fecha */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '8px 14px', backdropFilter: 'blur(8px)' }}>
                  <Calendar size={16} color="white" />
                  <input
                    type="date"
                    value={dashboardDate}
                    onChange={e => setDashboardDate(e.target.value)}
                    style={{
                      background: 'transparent', border: 'none', color: 'white',
                      fontWeight: 800, fontSize: '13px', cursor: 'pointer', outline: 'none',
                      colorScheme: 'dark'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* TARJETAS DE PROFESIONALES */}
            <div className="space-y-6 pt-2">
              <div className="prof-grid">
                {dashboardData.list.length > 0 ? dashboardData.list.map((prof, idx) => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05, duration: 0.4 }}
                    key={idx}
                    className="prof-card"
                  >
                    {/* CABECERA DE LA TARJETA */}
                    <div className="prof-header">
                      <div className="prof-avatar-container" style={{ cursor: 'pointer' }} onClick={() => setSelectedProfCalendar(prof)} title="Ver calendario del mes">
                        <img
                          src={prof.fotoUrl || (prof.dni ? `/fotos/${prof.dni}.png` : `https://i.pravatar.cc/150?u=${prof.name}`)}
                          alt={prof.name}
                          className="prof-avatar"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://i.pravatar.cc/150?u=${encodeURIComponent(prof.name)}`;
                          }}
                          style={{ transition: 'transform 0.2s', }}
                          onMouseEnter={e => e.target.style.transform = 'scale(1.08)'}
                          onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                        />
                      </div>

                      <h4 className="prof-name">{prof.name}</h4>
                      <p className="prof-specialty">{prof.especialidad}</p>

                    </div>

                    {/* CUERPO DE LA TARJETA CON ESTRUCTURA DE TABLA COMPACTA */}
                    <div className="prof-body">
                      <table className="as-table">
                        <thead>
                          <tr>
                            <th>Centro</th>
                            <th className="text-center">T</th>
                            <th className="text-center">P</th>
                            <th className="text-center">C</th>
                            <th className="text-center">A</th>
                          </tr>
                        </thead>
                        <tbody>
                          {prof.assignments.map((as, aIdx) => (
                            <tr key={aIdx}>
                              <td className="font-bold text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px]" title={getCentroNombre(as.centro)}>
                                {getCentroNombre(as.centro)}
                              </td>
                              <td className="text-center">
                                <span className="as-badge-turno" title={as.turno}>
                                  {(() => {
                                    const hora = parseInt(String(as.turno).split(':')[0]);
                                    if (isNaN(hora)) return String(as.turno).includes('M') ? 'M' : 'T';
                                    return hora < 13 ? 'M' : 'T';
                                  })()}
                                </span>
                              </td>
                              <td className="text-center as-val-pro">{as.pro}</td>
                              <td className="text-center as-val-cit">{as.cit}</td>
                              <td className="text-center as-val-ate">{as.ate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )) : (
                  <div className="col-span-full py-20 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                      <Info size={40} />
                    </div>
                    <h4 className="text-xl font-black text-slate-400 uppercase tracking-widest">Sin Programación hoy</h4>
                    <p className="text-slate-400 text-sm">Viernes de feriado o sin datos cargados</p>
                  </div>
                )}
              </div>
            </div>

            {/* GRID DE ESTADÍSTICAS RÁPIDAS - AL FINAL */}
            <div className="stats-grid" style={{ marginTop: '0.5cm' }}>
              {[
                { label: 'Especialistas', sub: 'En Turno Hoy', value: dashboardData.stats.totalPros, icon: Users, color: '#1871B9' },
                { label: 'Cupos Totales', sub: 'Oferta Programada', value: dashboardData.stats.totalPro, icon: FileText, color: '#F15A24' },
                { label: 'Citas Hoy', sub: 'Pacientes Agendados', value: dashboardData.stats.totalCit, icon: CheckCircle2, color: '#10B981' },
                { label: 'Atenciones', sub: 'Efectividad Real', value: dashboardData.stats.totalAte, icon: Stethoscope, color: '#6366F1' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -8 }}
                  className="stat-card"
                >
                  <div className="space-y-0.5">
                    <div className="stat-label">{stat.label}</div>
                    <div className="stat-value text-2xl">{stat.value}</div>
                    <div className="text-[9px] text-slate-400 font-bold">{stat.sub}</div>
                  </div>
                  <div style={{ backgroundColor: `${stat.color}10`, color: stat.color }} className="w-12 h-12 rounded-2xl flex items-center justify-center relative shadow-sm">
                    <stat.icon size={22} />
                  </div>
                </motion.div>
              ))}
            </div>

          </motion.div>

        )}

        {activeTab === 'monitoreo-hoy' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20">
            {/* ENCABEZADO MONITOREO */}
            <div className="db-banner !py-6">
              <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
                <div className="text-center flex-1">
                  <h1 className="db-title">MONITOREO DE ACTIVIDAD MENSUAL</h1>
                  <p className="text-blue-50 font-black text-2xl opacity-90 tracking-tight">
                    {new Date(dashboardDate + 'T12:00:00').toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
                      .toUpperCase()}
                  </p>
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-1">Tendencia Diaria de Citados y Atendidos</p>
                </div>
                {/* Selector de Mes (usando input date por simplicidad pero solo cambia el mes) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '8px 14px', backdropFilter: 'blur(8px)' }}>
                  <Calendar size={16} color="white" />
                  <input
                    type="month"
                    value={dashboardDate.slice(0, 7)}
                    onChange={e => setDashboardDate(e.target.value + "-01")}
                    style={{
                      background: 'transparent', border: 'none', color: 'white',
                      fontWeight: 800, fontSize: '13px', cursor: 'pointer', outline: 'none',
                      colorScheme: 'dark'
                    }}
                  />
                </div>
              </div>
            </div>


            <div className="glass-card !bg-white !p-10 max-w-7xl mx-auto shadow-2xl border-slate-200" style={{ minHeight: '650px' }}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="text-slate-800 font-black uppercase tracking-widest text-sm">Trend de Citas vs Atenciones</h4>
                  <p className="text-slate-400 text-[10px] font-bold">Resumen consolidado por día del mes seleccionado</p>
                </div>
                <div className="flex gap-6 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-slate-200"></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase">Citados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-[#1871B9]"></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase">Atendidos</span>
                  </div>
                </div>
              </div>

              {/* Distribución Horizontal - Alineación Derecha (Mini Tarjetas 3.2cm) */}
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: '24px', marginBottom: '30px' }}>
                <motion.div 
                  whileHover={{ y: -3, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  className="bg-white border border-slate-200 rounded-xl flex flex-col justify-center px-4 relative overflow-hidden transition-all shadow-sm"
                  style={{ width: '3.2cm', height: '2.2cm', borderLeft: '6px solid #10B981' }}
                >
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">CITADOS</span>
                  <div className="flex items-baseline gap-1">
                    <h3 className="text-2xl font-black text-slate-800 leading-none tabular-nums">{monitoreoTotals.cit}</h3>
                  </div>
                  <div className="absolute right-1 bottom-1 text-emerald-500/10 rotate-12">
                    <CheckCircle2 size={32} />
                  </div>
                </motion.div>

                <motion.div 
                  whileHover={{ y: -3, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  className="bg-white border border-slate-200 rounded-xl flex flex-col justify-center px-4 relative overflow-hidden transition-all shadow-sm"
                  style={{ width: '3.2cm', height: '2.2cm', borderLeft: '6px solid #1871B9' }}
                >
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">ATENDIDOS</span>
                  <div className="flex flex-col">
                    <h3 className="text-2xl font-black text-slate-800 leading-none tabular-nums mb-1">{monitoreoTotals.ate}</h3>
                    <span className="text-[10px] font-black text-white bg-[#1871B9] px-1.5 py-0.5 rounded-md inline-block self-start shadow-sm">
                      {monitoreoTotals.cit > 0 ? Math.round((monitoreoTotals.ate / monitoreoTotals.cit) * 100) : 0}%
                    </span>
                  </div>
                  <div className="absolute right-1 bottom-1 text-[#1871B9]/10 rotate-12">
                    <Activity size={32} />
                  </div>
                </motion.div>
              </div>

              <div style={{ width: '100%', height: '420px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monitoreoDailyData}
                    margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                    barGap={-40}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fontWeight: 900, fill: '#64748B' }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fontWeight: 900, fill: '#64748B' }} 
                    />
                    <Tooltip 
                      cursor={{ fill: '#f1f5f9' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-5 rounded-2xl border-none shadow-[0_20px_50px_rgba(0,0,0,0.15)] min-w-[180px]">
                              <p className="text-xs font-black text-slate-800 uppercase mb-3 border-b pb-2">Día {data.day}</p>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-slate-400">CITADOS</span>
                                  <span className="text-xs font-black text-slate-700">{data.cit}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-slate-400">ATENDIDOS</span>
                                  <span className="text-xs font-black text-[#1871B9]">{data.ate}</span>
                                </div>
                                <div className="mt-3 bg-slate-50 p-2 rounded-lg">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-500">EFECTIVIDAD</span>
                                    <span className="text-xs font-black text-emerald-600">{data.porcentaje}%</span>
                                  </div>
                                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                    <div className="bg-emerald-500 h-full" style={{ width: `${data.porcentaje}%` }}></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="cit" 
                      fill="#e2e8f0" 
                      radius={[6, 6, 0, 0]} 
                      barSize={40}
                    />
                    <Bar 
                      dataKey="ate" 
                      fill="#1871B9" 
                      radius={[6, 6, 0, 0]} 
                      barSize={40}
                    >
                      <LabelList 
                        dataKey="porcentaje" 
                        position="top" 
                        content={(props) => {
                          const { x, y, width, value } = props;
                          if (value === 0) return null;
                          return (
                            <text x={x + width / 2} y={y - 12} fill="#1871B9" fontSize={11} fontWeight={900} textAnchor="middle">
                              {value}%
                            </text>
                          );
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 flex justify-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-full">
                  Visualizando Resumen Mensual de Atenciones por Día
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'crud' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <header className="flex justify-between items-end mb-10">
              <div>
                <h2 className="text-3xl font-black text-[#1871B9] mb-1">Especialistas</h2>
                <p className="text-slate-500 font-medium">Gestión y control de base de datos institucional</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => openForm()}
                className="btn-primary"
              >
                <UserPlus size={18} /> Nuevo Registro
              </motion.button>
            </header>
            <div className="space-y-6">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1871B9] transition-colors" size={20} />
                <input
                  type="text"
                  placeholder="Buscar profesional por nombre o DNI..."
                  className="input-field pl-12 py-4 shadow-sm"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="specialist-grid">
                {especialidades
                  .filter(e => e.NOMBRES_Y_APELLIDOS.toLowerCase().includes(searchTerm.toLowerCase()))
                  .sort((a, b) => a.NOMBRES_Y_APELLIDOS.localeCompare(b.NOMBRES_Y_APELLIDOS))
                  .map(item => (
                    <motion.div
                      key={item.ITEM}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="specialist-card"
                    >
                      <div className="card-top">
                        <div className="avatar-container">
                          <div className="specialist-avatar" style={{ padding: 0, overflow: 'hidden' }}>
                            {item.FOTO_URL ? (
                              <img src={item.FOTO_URL} alt={item.NOMBRES_Y_APELLIDOS} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              item.NOMBRES_Y_APELLIDOS.split(' ').map(n => n[0]).slice(0, 2).join('')
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className="item-id-badge">ID #{item.ITEM}</span>
                            <div className={`specialist-status ${item.ACTIVO !== false ? 'status-active-badge' : 'status-inactive-badge'}`}>
                              <span className="status-dot"></span>
                              {item.ACTIVO !== false ? 'Activo' : 'Inactivo'}
                            </div>
                          </div>
                        </div>

                        <h3 className="specialist-name">
                          {item.NOMBRES_Y_APELLIDOS}
                        </h3>

                        <span className="specialist-specialty">
                          {item.ESPECIALIDAD}
                        </span>
                      </div>

                      <div className="card-actions-hover">
                        <button onClick={() => openForm(item)} className="btn-action edit" style={{ background: '#F1F5F9' }}><Edit2 size={13} /></button>
                        <button onClick={() => handleDelete(item.ITEM)} className="btn-action delete" style={{ background: '#FEF2F2' }}><Trash2 size={13} /></button>
                      </div>

                      <div className="card-footer-meta">
                        <div className="dni-info">
                          <Database size={13} strokeWidth={2.5} />
                          <span>{item.DNI}</span>
                        </div>
                        <UserPlus size={14} style={{ opacity: 0.3 }} />
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'process' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-8 max-w-2xl mx-auto">
            <h2 className="text-3xl font-black mb-6 text-center">Canalización de Datos</h2>

            {/* Sub-pestañas — mismo diseño que Monitoreo */}
            <div className="tab-container flex mb-8">
              {[
                { id: 'horas', icon: Database, label: 'Horas Efectivas' },
                { id: 'citados', icon: FileText, label: 'Citados' },
                { id: 'terminalistas', icon: Users, label: 'Citas x Terminalista' }
              ].map(tab => (
                <motion.button
                  key={tab.id}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveProcess(tab.id)}
                  className={`tab-btn ${activeProcess === tab.id ? 'active' : ''}`}
                >
                  <tab.icon size={14} /> {tab.label}
                </motion.button>
              ))}
            </div>

            {/* Horas Efectivas */}
            {activeProcess === 'horas' && (
              <div className="space-y-6">
                <div className="glass-card p-12 text-center bg-white/50 backdrop-blur-md border-dashed border-2 border-[#1871B9]/20">
                  <div className="w-20 h-20 bg-[#1871B9]/10 text-[#1871B9] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Hospital size={40} />
                  </div>
                  <h4 className="text-2xl font-black text-slate-800 mb-4">Sincronización de Horas Efectivas</h4>
                  <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
                    Los datos de programación y horas efectivas se cargan automáticamente desde el archivo maestro
                    <strong className="text-[#1871B9] mx-1">especialidades_horas.json</strong> ubicado en la carpeta
                    <span className="bg-slate-100 px-2 py-1 rounded font-mono text-xs ml-1 border border-slate-200">/Horas Efectivas</span>.
                  </p>
                  <div className="mt-8 flex justify-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                      <CheckCircle2 size={14} /> MODO LECTURA DIRECTA ACTIVO
                    </div>
                  </div>
                </div>

                {/* NUEVA SECCIÓN: REPORTES PDF DE PROGRAMACIÓN */}
                <div className="grid grid-cols-2 gap-6">
                  {/* REPORTE MENSUAL */}
                  <div className="glass-card p-8">
                    <div className="w-12 h-12 bg-blue-600/10 text-blue-500 rounded-xl flex items-center justify-center mx-auto mb-6">
                      <Calendar size={24} />
                    </div>
                    <h4 className="text-lg font-black mb-2">Reporte Mensual</h4>
                    <p className="text-slate-500 text-xs mb-6">Genera un PDF con la programación detallada de todos los profesionales del mes.</p>
                    
                    <div className="flex flex-col gap-3">
                      <select 
                        className="select-periodo w-full !h-10"
                        value={filters.mes}
                        onChange={e => setFilters(f => ({ ...f, mes: e.target.value }))}
                      >
                        <option value="all">Seleccionar Mes...</option>
                        {uniqueLists.meses.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>

                      <select 
                        className="select-periodo w-full !h-10"
                        value={filters.profesional}
                        onChange={e => setFilters(f => ({ ...f, profesional: e.target.value }))}
                      >
                        <option value="all">— TODOS LOS PROFESIONALES ACTIVOS —</option>
                        {uniqueLists.profesionalesActivos.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      
                      <motion.button
                        whileHover={{ scale: filters.mes === 'all' ? 1 : 1.02 }} 
                        whileTap={{ scale: filters.mes === 'all' ? 1 : 0.98 }}
                        onClick={() => generarPDFProgramacionMes(filters.mes, filters.profesional)}
                        disabled={filters.mes === 'all'}
                        className="btn-primary w-full justify-center !h-10"
                        style={{ background: filters.mes === 'all' ? '#94A3B8' : 'linear-gradient(135deg, #1871B9, #0ea5e9)' }}
                      >
                        <FileText size={16} /> Descargar Reporte
                      </motion.button>
                    </div>
                  </div>

                  {/* REPORTE DIARIO */}
                  <div className="glass-card p-8">
                    <div className="w-12 h-12 bg-emerald-600/10 text-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-6">
                      <Activity size={24} />
                    </div>
                    <h4 className="text-lg font-black mb-2">Reporte Diario</h4>
                    <p className="text-slate-500 text-xs mb-6">Genera un PDF con los profesionales programados para el día seleccionado.</p>
                    
                    <div className="flex flex-col gap-3">
                      <input
                        type="date"
                        value={dashboardDate}
                        onChange={e => setDashboardDate(e.target.value)}
                        className="select-periodo w-full !h-10 !px-4"
                        style={{ colorScheme: 'light' }}
                      />
                      
                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => generarPDFProgramacionDia(dashboardDate)}
                        className="btn-primary w-full justify-center !h-10"
                        style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}
                      >
                        <FileText size={16} /> Descargar Reporte
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Citados */}
            {activeProcess === 'citados' && (
              <div className="grid grid-cols-2 gap-6">
                <div className="glass-card p-8">
                  <div className="w-12 h-12 bg-violet-600/10 text-violet-500 rounded-xl flex items-center justify-center mx-auto mb-6"><Database size={24} /></div>
                  <h4 className="text-lg font-black mb-2">1. Unificado</h4>
                  <p className="text-slate-500 text-xs mb-8">Une archivos TXT de <strong>Citados</strong> en un solo JSON maestro.</p>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleImportCitados} disabled={importingCitados}
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}
                    className="btn-primary w-full justify-center"
                  >
                    {importingCitados ? 'Sincronizando...' : 'Generar Unificado'}
                  </motion.button>
                </div>
                <div className="glass-card p-8">
                  <div className="w-12 h-12 bg-orange-600/10 text-orange-500 rounded-xl flex items-center justify-center mx-auto mb-6"><Play size={24} /></div>
                  <h4 className="text-lg font-black mb-2">2. Sincronizar</h4>
                  <p className="text-slate-500 text-xs mb-8">Cruza citados con especialistas activos por <strong>DNI_MEDICO</strong>.</p>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleProcessCitados} disabled={processingCitados}
                    style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)' }}
                    className="btn-primary w-full justify-center"
                  >
                    {processingCitados ? 'Procesando...' : 'Ejecutar Cruce'}
                  </motion.button>
                </div>
              </div>
            )}

            {/* Terminalistas */}
            {activeProcess === 'terminalistas' && (
              <div className="grid grid-cols-2 gap-6">
                <div className="glass-card p-8">
                  <div className="w-12 h-12 bg-blue-600/10 text-blue-500 rounded-xl flex items-center justify-center mx-auto mb-6"><Database size={24} /></div>
                  <h4 className="text-lg font-black mb-2">1. Unificado</h4>
                  <p className="text-slate-500 text-xs mb-8">Une archivos TXT de <strong>Citas x Terminalista</strong> en un solo JSON maestro.</p>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleImportTerminalista} disabled={importingTerminalista}
                    style={{ background: 'linear-gradient(135deg, #1871B9, #0ea5e9)' }}
                    className="btn-primary w-full justify-center"
                  >
                    {importingTerminalista ? 'Sincronizando...' : 'Generar Unificado'}
                  </motion.button>
                </div>
                <div className="glass-card p-8">
                  <div className="w-12 h-12 bg-emerald-600/10 text-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-6"><Play size={24} /></div>
                  <h4 className="text-lg font-black mb-2">2. Sincronizar</h4>
                  <p className="text-slate-500 text-xs mb-8">Cruza datos con Digitadores por <strong>DOC_USUARIO</strong>.</p>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleProcessTerminalista} disabled={processingTerminalista}
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                    className="btn-primary w-full justify-center"
                  >
                    {processingTerminalista ? 'Procesando...' : 'Ejecutar Cruce'}
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'reports' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-6">
                <div>
                  <h2 className="text-xl font-black text-[#1871B9] leading-tight">Analítica</h2>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Gestión Institucional</p>
                </div>
                <div className="h-10 w-[1px] bg-slate-100"></div>
                <div className="tab-container flex">
                  {[
                    { id: 'matrix', icon: TableIcon, label: 'Matriz' },
                    { id: 'month', icon: Calendar, label: 'Resumen' },
                    { id: 'production', icon: BarChart3, label: 'Producción' }
                  ].map(btn => (
                    <motion.button
                      key={btn.id}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveReport(btn.id)}
                      className={`tab-btn ${activeReport === btn.id ? 'active' : ''}`}
                    >
                      <btn.icon size={14} /> {btn.label}
                    </motion.button>
                  ))}
                </div>
              </div>
              <div className="text-[10px] text-slate-400 font-bold italic pr-2">
                Base de Datos Sincronizada
              </div>
            </header>

            {activeReport !== 'production' && (
              <div className="glass-card !bg-white !p-4 mb-10 border-slate-200 shadow-sm">
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '40px', flexWrap: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>Periodo:</label>
                    <select
                      className="select-periodo"
                      style={{ width: 'auto', minWidth: '120px' }}
                      value={filters.mes}
                      onChange={e => setFilters({ ...filters, mes: e.target.value })}
                    >
                      <option value="all">TODOS LOS PERIODOS</option>
                      {uniqueLists.meses.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  <div style={{ width: '1px', height: '24px', backgroundColor: '#F1F5F9' }}></div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
                      {activeReport === 'matrix' ? 'Dato a Tabular:' : 'Lista de Centro:'}
                    </label>
                    {activeReport === 'matrix' ? (
                      <select
                        className="select-periodo"
                        style={{ width: 'auto', minWidth: '150px' }}
                        value={filters.field}
                        onChange={e => setFilters({ ...filters, field: e.target.value })}
                      >
                        <option value="PRO">PRO (Cupos)</option>
                        <option value="CIT">CIT (Citados)</option>
                        <option value="ATE">ATE (Atendidos)</option>
                      </select>
                    ) : (
                      <select
                        className="select-periodo"
                        style={{ width: 'auto', minWidth: '150px' }}
                        value={filters.centro}
                        onChange={e => setFilters({ ...filters, centro: e.target.value })}
                      >
                        <option value="all">TODOS LOS CENTROS</option>
                        {uniqueLists.centros.map(c => <option key={c} value={c}>{getCentroNombre(c)}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="matrix-container">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="sticky-col border-r border-white/5 bg-slate-900 w-64 text-left px-4">
                      {activeReport === 'matrix' ? 'Especialista / Centro' : (activeReport === 'production' ? 'Servicio / Centro' : 'Profesional / Indicador')}
                    </th>
                    <th className="cell-total">{activeReport === 'month' ? 'PRO' : 'TOTAL'}</th>
                    {currentReportData.headers.map((h, hIdx) => (
                      <th key={hIdx} className="px-1 text-center border-l border-white/5 min-w-[60px]">
                        {activeReport === 'production' ? h.label : h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentReportData.rows.map((row, idx) => {
                    const today = new Date();
                    const currentDay = today.getDate();
                    const currentMonth = today.getMonth() + 1;
                    const currentYear = today.getFullYear();
                    const [resMonth, resYear] = (filters.mes !== 'all' ? filters.mes : `${currentMonth}/${currentYear}`).split('/').map(Number);
                    const isCurrentMonthOrPast = resYear < currentYear || (resYear === currentYear && resMonth <= currentMonth);

                    return (
                      <React.Fragment key={idx}>
                        <tr onClick={() => toggleRow(row.name)} className="prof-row cursor-pointer group">
                          <td className="sticky-col px-2">
                            <div className="flex items-center gap-1 overflow-hidden">
                              <div className={`transition-transform duration-300 shrink-0 ${expandedRows.has(row.name) ? 'rotate-90 text-[#1871B9]' : 'text-slate-400'}`}><ChevronRight size={10} /></div>
                              <span className="truncate font-black text-[#1871B9] text-sm tracking-tight">{row.name}</span>
                            </div>
                          </td>
                          <td className="cell-total font-black" style={{ textAlign: 'center' }}>{row.total}</td>
                          {currentReportData.headers.map((h, hIdx) => {
                            let valDisplay = '';
                            let isWarning = false;

                            if (activeReport === 'matrix') {
                              const childValues = row.children.map(c => c.dayValues[h] || 0);
                              valDisplay = childValues.reduce((acc, v) => acc + v, 0);
                              isWarning = childValues.some(v => v > 24);
                            } else if (activeReport === 'production') {
                              valDisplay = Object.values(row.children).reduce((acc, c) => acc + (c.dayValues[h.key] || 0), 0);
                            } else {
                              valDisplay = row.children.find(c => c.type === 'PRO')?.dayValues[h] || 0;
                            }

                            let cellClass = `cell-data ${valDisplay > 0 ? 'has-value' : ''}`;
                            let inlineStyle = {};
                            if (activeReport === 'matrix' && isWarning) {
                              cellClass += ' !text-white !bg-red-600 !opacity-100 font-black';
                              inlineStyle = { backgroundColor: '#dc2626', color: 'white', opacity: 1, fontWeight: '900' };
                            }

                            return <td key={hIdx} className={cellClass} style={inlineStyle}>{valDisplay || ''}</td>
                          })}
                        </tr>
                        {expandedRows.has(row.name) && row.children.map((child, cIdx) => (
                          <tr key={`${idx}-${cIdx}`} className="center-row">
                            <td className="sticky-col px-6 py-1 italic border-r border-white/5">
                              {activeReport === 'matrix' ? (
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-700">{getCentroNombre(child.center)}</span>
                                  <span className="text-[8px] font-black text-[#F15A24] uppercase tracking-tighter">Turno: {child.turno}</span>
                                </div>
                              ) : (
                                <span className="text-[10px] font-black text-slate-500">{getCentroNombre(child.name || child.center)}</span>
                              )}
                            </td>
                            <td className="cell-total border-r border-white/5 text-[10px] font-bold" style={{ textAlign: 'center' }}>
                              {activeReport === 'month' ? child.total : (activeReport === 'production' ? child.total : '')}
                            </td>
                            {currentReportData.headers.map((h, hIdx) => {
                              const valRaw = activeReport === 'production' ? (child.dayValues[h.key] || 0) : (child.dayValues[h] || 0);

                              let cellClass = `cell-data ${valRaw > 0 ? (activeReport === 'matrix' ? 'opacity-100 font-bold' : 'opacity-100 font-bold') : 'opacity-20'}`;
                              let inlineStyle = {};

                              // Warning for Matrix > 24
                              if (activeReport === 'matrix' && valRaw > 24) {
                                cellClass += ' !text-white !bg-red-600 !opacity-100 font-black';
                                inlineStyle = { backgroundColor: '#dc2626', color: 'white', opacity: 1, fontWeight: '900' };
                              }

                              // Conditional coloring for Resumen (Attendance < Programmed)
                              if (activeReport === 'month' && child.type === 'ATE' && valRaw > 0) {
                                const proVal = row.children.find(c => c.type === 'PRO')?.dayValues[h] || 0;
                                const isPastDay = isCurrentMonthOrPast && (resMonth < currentMonth || (resMonth === currentMonth && h < currentDay));
                                if (isPastDay && valRaw < proVal) {
                                  cellClass += ' !text-white !bg-red-500 !opacity-100';
                                  inlineStyle = { backgroundColor: '#ef4444', color: 'white', opacity: 1 };
                                }
                              }

                              return <td key={hIdx} className={cellClass} style={inlineStyle}>{valRaw || ''}</td>
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                {(activeReport === 'production' || activeReport === 'matrix' || activeReport === 'month') && (
                  <tfoot className="sticky-footer" style={{ position: 'sticky', bottom: 0, zIndex: 30 }}>
                    <tr style={{ backgroundColor: '#1871B9', color: 'white', fontWeight: '900', fontSize: '13px' }}>
                      <td className="sticky-col px-4 py-2 border-t-2 border-white/20 uppercase" style={{ backgroundColor: '#1871B9', textAlign: 'center' }}>
                        TOTAL {activeReport === 'production' ? 'PRODUCCIÓN' : (activeReport === 'matrix' ? 'MATRIZ' : 'PROGRAMACIÓN')}
                      </td>
                      <td style={{ textAlign: 'center', padding: '8px 0', borderTop: '2px solid rgba(255,255,255,0.2)' }}>
                        {currentReportData.rows.reduce((acc, row) => acc + row.total, 0)}
                      </td>
                      {currentReportData.headers.map((h, hIdx) => {
                        const totalCol = currentReportData.rows.reduce((acc, row) => {
                          let valRow = 0;
                          if (activeReport === 'production') {
                            valRow = row.children.reduce((sum, c) => sum + (c.dayValues[h.key] || 0), 0);
                          } else if (activeReport === 'matrix') {
                            valRow = row.children.reduce((sum, c) => sum + (c.dayValues[h] || 0), 0);
                          } else if (activeReport === 'month') {
                            valRow = row.children.filter(c => c.type === 'PRO').reduce((sum, c) => sum + (c.dayValues[h] || 0), 0);
                          }
                          return acc + valRow;
                        }, 0);
                        return (
                          <td key={hIdx} style={{ textAlign: 'center', padding: '8px 0', borderTop: '2px solid rgba(255,255,255,0.2)' }}>
                            {totalCol || ''}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                )}

              </table>
            </div>


            {activeReport === 'production' && currentReportData.rows.length > 0 && (
              <div className="mt-8 mb-12 p-8 glass-card" style={{ minHeight: '450px' }}>
                <h4 className="text-slate-500 text-[11px] font-black uppercase tracking-[0.2em] mb-10 text-center">Tendencia de Producción Mensual</h4>
                <div style={{ height: '350px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={currentReportData.headers.map(h => {
                        let monthlyTotal = 0;
                        currentReportData.rows.forEach(row => {
                          const valForMonth = row.children.reduce((sum, child) => sum + (child.dayValues[h.key] || 0), 0);
                          monthlyTotal += valForMonth;
                        });
                        return { month: h.label, total: monthlyTotal };
                      })}
                      margin={{ top: 40, right: 30, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 800, fill: '#64748B' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 800, fill: '#64748B' }} />
                      <Tooltip
                        cursor={{ fill: '#f8fafc', opacity: 0.8 }}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: '900', padding: '12px' }}
                      />
                      <Bar dataKey="total" name="Producción Total" fill="#1871B9" radius={[8, 8, 0, 0]} barSize={60}>
                        <LabelList dataKey="total" position="top" style={{ fontSize: '13px', fontWeight: 900, fill: '#1d4ed8' }} offset={15} />
                        {currentReportData.headers.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#1871B9' : '#10B981'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeReport === 'matrix' && (
              <div className="flex items-center gap-4 mt-4 p-4 bg-red-50 border border-red-100 rounded-xl">
                <div className="w-4 h-4 bg-red-600 rounded"></div>
                <span className="text-xs font-bold text-red-800 uppercase tracking-tight">Alerta: Valores superiores a 24 (Sobrepasan el estándar de atención)</span>
              </div>
            )}

            <div className="analytics-footer">
              <div className="footer-info-text">
                Actualizado en tiempo real desde el servidor institucional
              </div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="info-badge"
              >
                <span className="label">Resumen de Carga</span>
                <div className="value-container">
                  <Database size={18} />
                  <span className="value">{reportData.length}</span>
                  <span className="unit">REGISTROS</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {activeTab === 'reportes' && (() => {
          const COLS = [
            { key: 'CENTRO', label: 'Centro' },
            { key: 'SERVICIO', label: 'Servicio' },
            { key: 'FECHA_CITA', label: 'Fecha Cita' },
            { key: 'ESTADO_CITA', label: 'Estado' },
            { key: 'DOC_PACIENTE', label: 'Doc. Paciente' },
            { key: 'ACTO_MED', label: 'Acto Med.' },
            { key: 'ULTCIE10ATEN', label: 'CIE-10' },
          ];
          return (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {/* HEADER */}
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'white', padding: '14px 20px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1871B9', margin: 0, lineHeight: 1.2 }}>Reportes de Citados</h2>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Detalle por profesional — Solo Atendidas</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>

                  {/* Selector de MES */}
                  {mesesCitados.length > 0 && (
                    <>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Mes:</label>
                      <select
                        className="select-periodo"
                        value={mesCitados}
                        onChange={e => {
                          setMesCitados(e.target.value);
                          setCitadosData([]);
                          fetchCitadosData(e.target.value);
                        }}
                        style={{ minWidth: '130px' }}
                      >
                        {mesesCitados.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <div style={{ width: '1px', height: '24px', background: '#E2E8F0' }} />
                    </>
                  )}
                  {/* Selector profesional */}
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Profesional:</label>
                  <select
                    className="select-periodo"
                    value={selectedProfCitados}
                    onChange={e => setSelectedProfCitados(e.target.value)}
                    style={{ minWidth: '200px' }}
                  >
                    <option value="all">— TODOS —</option>
                    {profListCitados.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>

                  {/* Separador */}
                  <div style={{ width: '1px', height: '24px', background: '#E2E8F0' }} />

                  {/* Filtro Desde */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} color="#1871B9" />
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Desde:</label>
                    <input
                      type="date"
                      value={fechaDesde}
                      onChange={e => setFechaDesde(e.target.value)}
                      style={{ border: '1px solid #CBD5E1', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', fontWeight: 700, color: '#1871B9', cursor: 'pointer', outline: 'none' }}
                    />
                  </div>

                  {/* Filtro Hasta */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} color="#1871B9" />
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Hasta:</label>
                    <input
                      type="date"
                      value={fechaHasta}
                      onChange={e => setFechaHasta(e.target.value)}
                      style={{ border: '1px solid #CBD5E1', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', fontWeight: 700, color: '#1871B9', cursor: 'pointer', outline: 'none' }}
                    />
                  </div>

                  {/* Limpiar filtros fecha */}
                  {(fechaDesde || fechaHasta) && (
                    <button
                      onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
                      style={{ fontSize: '11px', fontWeight: 800, color: '#EF4444', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}
                    >✕ Limpiar</button>
                  )}

                  {/* Contador */}
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#1871B9', background: '#EFF6FF', padding: '4px 12px', borderRadius: '20px' }}>
                    {filteredCitados.length} registros
                  </span>

                  {/* Separador */}
                  <div style={{ width: '1px', height: '24px', background: '#E2E8F0' }} />

                  {/* Botón PDF */}
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={generarPDFCitados}
                    disabled={filteredCitados.length === 0}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: filteredCitados.length === 0 ? '#E2E8F0' : 'linear-gradient(135deg,#dc2626,#ef4444)',
                      color: filteredCitados.length === 0 ? '#94A3B8' : 'white',
                      border: 'none', borderRadius: '8px',
                      padding: '7px 14px', fontWeight: 800, fontSize: '12px',
                      cursor: filteredCitados.length === 0 ? 'not-allowed' : 'pointer',
                      boxShadow: filteredCitados.length === 0 ? 'none' : '0 4px 12px rgba(220,38,38,0.3)',
                    }}
                  >
                    <FileText size={14} /> EXPORTAR PDF
                  </motion.button>
                </div>
              </header>

              <div className="glass-card !p-0 overflow-hidden" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
                <table className="w-full text-left" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#F8FAFC' }}>
                    <tr>
                      {COLS.map(col => (
                        <th key={col.key} style={{ padding: '12px 16px', fontSize: '10px', fontWeight: 900, color: '#64748B', textTransform: 'uppercase', borderBottom: '2px solid #E2E8F0' }}>{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingCitados ? (
                      <tr><td colSpan={COLS.length} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontWeight: 700 }}>Cargando datos de citados...</td></tr>
                    ) : filteredCitados.length > 0 ? (
                      filteredCitados.map((reg, idx) => (
                        <tr key={idx} style={{ background: idx % 2 === 0 ? 'white' : '#F8FAFC', transition: 'background 0.2s' }}>
                          {COLS.map((col, cIdx) => (
                            <td key={cIdx} style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: '#334155', borderBottom: '1px solid #F1F5F9' }}>
                              {col.key === 'ULTCIE10ATEN' ? (reg[col.key] || '').split(' - ')[0] : (col.key === 'CENTRO' ? getCentroNombre(reg[col.key]) : reg[col.key])}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={COLS.length} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontWeight: 700 }}>No se encontraron registros de atenciones para este mes.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          );
        })()}

        {activeTab === 'terminalistas' && (() => {
          const COLS = [
            { key: 'CENTRO', label: 'Centro' },
            { key: 'DESC_SERVICIO', label: 'Servicio' },
            { key: 'FECHOR_REGISTRO', label: 'Fecha Registro' },
            { key: 'SUBACTIVIDAD', label: 'Actividad' },
            { key: 'TIPO_CITA', label: 'Tipo Cita' },
            { key: 'TIPO_PACIENTE', label: 'Paciente' },
          ];
          return (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'white', padding: '14px 20px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1871B9', margin: 0, lineHeight: 1.2 }}>Citas x Terminalista</h2>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Productividad de Digitadores — Detalle de Citas</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {mesesTerminalista.length > 0 && (
                    <>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Mes:</label>
                      <select
                        className="select-periodo"
                        value={mesTerminalista}
                        onChange={e => {
                          setMesTerminalista(e.target.value);
                          setTerminalistaData([]);
                          fetchTerminalistaData(e.target.value);
                        }}
                        style={{ minWidth: '130px' }}
                      >
                        {mesesTerminalista.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <div style={{ width: '1px', height: '24px', background: '#E2E8F0' }} />
                    </>
                  )}
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Digitador:</label>
                  <select
                    className="select-periodo"
                    value={selectedDigitador}
                    onChange={e => setSelectedDigitador(e.target.value)}
                    style={{ minWidth: '200px' }}
                  >
                    <option value="all">— TODOS —</option>
                    {digitadoresList.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <div style={{ width: '1px', height: '24px', background: '#E2E8F0' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} color="#1871B9" />
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Desde:</label>
                    <input
                      type="date"
                      value={fechaDesde}
                      onChange={e => setFechaDesde(e.target.value)}
                      style={{ border: '1px solid #CBD5E1', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', fontWeight: 700, color: '#1871B9', cursor: 'pointer', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} color="#1871B9" />
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Hasta:</label>
                    <input
                      type="date"
                      value={fechaHasta}
                      onChange={e => setFechaHasta(e.target.value)}
                      style={{ border: '1px solid #CBD5E1', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', fontWeight: 700, color: '#1871B9', cursor: 'pointer', outline: 'none' }}
                    />
                  </div>
                  {(fechaDesde || fechaHasta) && (
                    <button onClick={() => { setFechaDesde(''); setFechaHasta(''); }} style={{ fontSize: '11px', fontWeight: 800, color: '#EF4444', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>✕ Limpiar</button>
                  )}
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#1871B9', background: '#EFF6FF', padding: '4px 12px', borderRadius: '20px' }}>
                    {filteredTerminalista.length} registros
                  </span>
                  <div style={{ width: '1px', height: '24px', background: '#E2E8F0' }} />
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={generarPDFTerminalista}
                    disabled={filteredTerminalista.length === 0}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: filteredTerminalista.length === 0 ? '#E2E8F0' : 'linear-gradient(135deg,#1871B9,#0ea5e9)',
                      color: filteredTerminalista.length === 0 ? '#94A3B8' : 'white',
                      border: 'none', borderRadius: '8px',
                      padding: '7px 14px', fontWeight: 800, fontSize: '12px',
                      cursor: filteredTerminalista.length === 0 ? 'not-allowed' : 'pointer',
                      boxShadow: filteredTerminalista.length === 0 ? 'none' : '0 4px 12px rgba(24,113,185,0.3)',
                    }}
                  >
                    <FileText size={14} /> EXPORTAR PDF
                  </motion.button>
                </div>
              </header>

              <div className="glass-card !p-0 overflow-hidden" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
                <table className="w-full text-left" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#F8FAFC' }}>
                    <tr>
                      {COLS.map(col => (
                        <th key={col.key} style={{ padding: '12px 16px', fontSize: '10px', fontWeight: 900, color: '#64748B', textTransform: 'uppercase', borderBottom: '2px solid #E2E8F0' }}>{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingTerminalista ? (
                      <tr><td colSpan={COLS.length} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontWeight: 700 }}>Cargando datos de terminalistas...</td></tr>
                    ) : filteredTerminalista.length > 0 ? (
                      filteredTerminalista.map((reg, idx) => (
                        <tr key={idx} style={{ background: idx % 2 === 0 ? 'white' : '#F8FAFC', transition: 'background 0.2s' }}>
                          {COLS.map(col => (
                            <td key={col.key} style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: '#334155', borderBottom: '1px solid #F1F5F9' }}>
                              {col.key === 'CENTRO' ? getCentroNombre(reg[col.key]) : reg[col.key]}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={COLS.length} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontWeight: 700 }}>No se encontraron registros para los filtros aplicados.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          );
        })()}
      </main>

      {/* FORM MODAL - FORCED INLINE STYLES FOR LAYOUT */}
      < AnimatePresence >
        {isModalOpen && (
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card w-[480px] !p-10 shadow-2xl border-white/20" style={{ position: 'relative' }}>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 50, padding: '8px', cursor: 'pointer' }}
                className="hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              >
                <X size={24} />
              </button>

              <div className="mb-8">
                <h3 className="text-2xl font-black text-[#1871B9]">{editingId ? 'Editar Especialista' : 'Nuevo Registro'}</h3>
                <div className="h-1.5 w-12 bg-[#F15A24] mt-1 rounded-full"></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">ID Interno</label>
                    <input type="number" className="input-field" value={form.ITEM} onChange={e => setForm({ ...form, ITEM: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Documento DNI</label>
                    <input className="input-field" value={form.DNI} onChange={e => setForm({ ...form, DNI: e.target.value })} required />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre y Apellidos</label>
                  <input className="input-field" value={form.NOMBRES_Y_APELLIDOS} onChange={e => setForm({ ...form, NOMBRES_Y_APELLIDOS: e.target.value })} required />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Especialidad / Área</label>
                  <input className="input-field" value={form.ESPECIALIDAD} onChange={e => setForm({ ...form, ESPECIALIDAD: e.target.value })} required />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Estado del Profesional</label>
                  <select
                    className="input-field cursor-pointer"
                    value={form.ACTIVO ? 'true' : 'false'}
                    onChange={e => setForm({ ...form, ACTIVO: e.target.value === 'true' })}
                  >
                    <option value="true">ACTIVO</option>
                    <option value="false">INACTIVO</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">URL de la Foto (Opcional)</label>
                  <input
                    className="input-field"
                    placeholder="https://ejemplo.com/foto.jpg"
                    value={form.FOTO_URL}
                    onChange={e => setForm({ ...form, FOTO_URL: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingTop: '16px' }}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn-secondary !h-14 w-full flex justify-center items-center font-black rounded-xl text-[10px] uppercase tracking-widest border border-slate-200"
                  >
                    CANCELAR
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="btn-primary !h-14 w-full flex justify-center items-center font-black rounded-xl text-[10px] uppercase tracking-widest"
                  >
                    {editingId ? 'ACTUALIZAR' : 'GUARDAR'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {
          showAuthorship && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAuthorship(false)}
                style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(10px)' }}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: '420px',
                  backgroundColor: 'white',
                  borderRadius: '24px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.5)'
                }}
              >
                {/* Cabecera Decorativa con Estilo Inline */}
                <div style={{
                  height: '100px',
                  background: 'linear-gradient(135deg, #1871B9 0%, #0c4a6e 100%)',
                  padding: '24px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '10px', borderRadius: '12px', backdropFilter: 'blur(4px)' }}>
                    <Copyright style={{ color: 'white' }} size={24} />
                  </div>
                  <button
                    onClick={() => setShowAuthorship(false)}
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', display: 'flex' }}
                  >
                    <X style={{ color: 'white' }} size={20} />
                  </button>
                </div>

                <div style={{ padding: '32px', marginTop: '-40px' }}>
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #f8fafc'
                  }}>
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#1e293b', letterSpacing: '-0.025em', margin: 0 }}>Autoría y Soporte</h2>
                      <p style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: '500', marginTop: '4px' }}>Panel de Especialistas Programados</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', borderRadius: '12px', transition: 'background-color 0.2s' }}>
                        <div style={{ backgroundColor: '#f0f9ff', padding: '10px', borderRadius: '12px', color: '#1871B9' }}>
                          <Hospital size={18} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '10px', fontWeight: '900', color: '#1871B9', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px 0' }}>Coordinador CERETE</p>
                          <p style={{ fontSize: '14px', fontWeight: '700', color: '#334155', margin: 0 }}>Dr. Diego Cabanillas</p>
                          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', wordBreak: 'break-all' }}>diego.cabanillas@essalud.gob.pe</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', borderRadius: '12px' }}>
                        <div style={{ backgroundColor: '#f5f3ff', padding: '10px', borderRadius: '12px', color: '#7c3aed' }}>
                          <Database size={18} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '10px', fontWeight: '900', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px 0' }}>Ingeniero de Sistemas</p>
                          <p style={{ fontSize: '14px', fontWeight: '700', color: '#334155', margin: 0 }}>Amaro Vilela Vargas</p>
                          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', wordBreak: 'break-all' }}>amaro.vilela@essalud.gob.pe</p>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          backgroundColor: '#10b981',
                          borderRadius: '50%',
                          boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)'
                        }}></div>
                        <span style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>SOPORTE INFORMÁTICO RALL</span>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#cbd5e1' }}>v2.4.0</span>
                    </div>
                  </div>

                  <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
                    <button
                      onClick={() => setShowAuthorship(false)}
                      style={{
                        padding: '12px 32px',
                        backgroundColor: '#1e293b',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: '800',
                        borderRadius: '12px',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.2s'
                      }}
                    >
                      CONTINUAR
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )
        }
      </AnimatePresence >

      {/* MODAL CALENDARIO DEL PROFESIONAL - REDISEÑO PREMIUM */}
      < AnimatePresence >
        {selectedProfCalendar && (() => {
          const prof = selectedProfCalendar;
          const [dashY, dashM] = dashboardDate.split('-').map(Number);
          const mesStr = `${String(dashM).padStart(2, '0')}/${dashY}`;

          const schedule = {};
          reportData.forEach(d => {
            if (d.PROFESIONAL !== prof.name || val(d.PRO) <= 0) return;
            const p = d.PERIODO?.split('/');
            if (!p || p.length < 3) return;
            if (`${p[1]}/${p[2]}` !== mesStr) return;
            const day = parseInt(p[0]);
            if (!schedule[day]) schedule[day] = new Set();
            schedule[day].add(String(d.TURNO));
          });

          // Cálculo preciso de estadísticas analizando el rango horario
          let tM = 0;
          let tT = 0;
          reportData.forEach(d => {
            if (d.PROFESIONAL !== prof.name || val(d.PRO) <= 0) return;
            const p = d.PERIODO?.split('/');
            if (!p || p.length < 3) return;
            if (`${p[1]}/${p[2]}` !== mesStr) return;

            // Lógica basada en la hora de inicio (HORA_INI)
            const horaIni = parseInt(String(d.HORA_INI || '').split(':')[0]);
            if (!isNaN(horaIni)) {
              if (horaIni < 13) tM++;
              else tT++;
            } else {
              // Fallback por si HORA_INI está vacío
              const turnoRaw = String(d.TURNO).toUpperCase();
              if (turnoRaw.includes('M') || turnoRaw.startsWith('08') || turnoRaw.startsWith('07')) tM++;
              else if (turnoRaw.includes('T') || turnoRaw.startsWith('13') || turnoRaw.startsWith('14')) tT++;
            }
          });
          const totalTurnos = tM + tT;

          const diasEnMes = new Date(dashY, dashM, 0).getDate();
          const primerDia = new Date(dashY, dashM - 1, 1).getDay();
          const celdas = [];
          for (let i = 0; i < primerDia; i++) celdas.push(null);
          for (let d = 1; d <= diasEnMes; d++) celdas.push(d);
          while (celdas.length % 7 !== 0) celdas.push(null);

          const nombreMes = new Date(dashY, dashM - 1, 1)
            .toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
            .replace(/^\w/, c => c.toUpperCase());

          return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(12px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
              onClick={() => setSelectedProfCalendar(null)}>
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={e => e.stopPropagation()}
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '32px',
                  padding: '32px',
                  width: '440px',
                  maxWidth: '95vw',
                  boxShadow: '0 30px 60px -12px rgba(0,0,0,0.45)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.4)'
                }}
              >
                {/* Elementos decorativos de fondo */}
                <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(24, 113, 185, 0.08) 0%, transparent 70%)', borderRadius: '50%' }}></div>

                {/* Botón cerrar */}
                <button onClick={() => setSelectedProfCalendar(null)}
                  style={{ position: 'absolute', top: '24px', right: '24px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', transition: 'all 0.2s', zIndex: 10 }}>
                  <X size={18} strokeWidth={2.5} />
                </button>

                {/* Encabezado */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px', position: 'relative' }}>
                  <div style={{ position: 'relative' }}>
                    <img src={`/${prof.dni}.png`} alt={prof.name}
                      style={{ width: '72px', height: '72px', borderRadius: '24px', objectFit: 'cover', boxShadow: '0 8px 16px rgba(24, 113, 185, 0.2)', border: '2px solid white' }}
                      onError={e => { e.target.onerror = null; e.target.src = `https://i.pravatar.cc/150?u=${prof.name}`; }}
                    />
                    <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '20px', height: '20px', background: '#10b981', border: '3px solid white', borderRadius: '50%' }}></div>
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.25rem', margin: 0, lineHeight: 1.1 }}>{prof.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      <span style={{ color: '#1871B9', fontWeight: 800, fontSize: '10px', textTransform: 'uppercase', background: 'rgba(24, 113, 185, 0.08)', padding: '2px 8px', borderRadius: '6px' }}>{prof.especialidad}</span>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <span style={{ color: '#0f172a', fontWeight: 900, fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{nombreMes}</span>
                </div>

                {/* Footer / Stats (Movido arriba para mejor visibilidad) */}
                <div style={{ marginBottom: '32px', padding: '20px', background: '#f8fafc', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#1e293b' }}>{totalTurnos}</p>
                    <p style={{ margin: 0, fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total Turnos</p>
                  </div>
                  <div style={{ height: '24px', width: '1px', background: '#e2e8f0' }}></div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#1871B9' }}>{tM}</p>
                    <p style={{ margin: 0, fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Mañana (M)</p>
                  </div>
                  <div style={{ height: '24px', width: '1px', background: '#e2e8f0' }}></div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#F59E0B' }}>{tT}</p>
                    <p style={{ margin: 0, fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Tarde (T)</p>
                  </div>
                </div>

                {/* Grid del Calendario */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '8px' }}>
                  {['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'].map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', paddingBottom: '8px' }}>{d}</div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                  {celdas.map((day, i) => {
                    const shifts = day ? schedule[day] : null;
                    const isToday = day && String(day) === String(new Date(dashboardDate + 'T12:00:00').getDate());
                    const isDouble = shifts && shifts.size > 1;
                    const hasShifts = shifts && shifts.size > 0;

                    // Lógica de colores premium con prioridad en los turnos
                    let bg = day ? '#f8fafc' : 'transparent';
                    let color = day ? '#1e293b' : 'transparent';
                    let shadow = 'none';
                    let border = day ? '1px solid rgba(0,0,0,0.03)' : 'none';

                    if (isDouble) {
                      bg = '#10B981'; // Verde para doble turno
                      color = 'white';
                      shadow = '0 6px 12px -2px rgba(16, 185, 129, 0.25)';
                    } else if (hasShifts) {
                      bg = '#bae6fd'; // Celeste para un turno
                      color = '#000000'; // Letras negras
                    }

                    // Resaltar el día actual solo con el borde y sombra
                    if (isToday) {
                      border = '3px solid #1871B9';
                      shadow = '0 10px 15px -3px rgba(24, 113, 185, 0.3)';
                    }

                    return (
                      <div key={i} style={{
                        height: '46px',
                        borderRadius: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: bg,
                        color: color,
                        fontWeight: 900,
                        fontSize: '13px',
                        position: 'relative',
                        boxShadow: shadow,
                        border: border,
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: day ? 'scale(1)' : 'scale(0.95)',
                      }}>
                        <span style={{ marginBottom: shifts ? '2px' : '0', opacity: day ? 1 : 0 }}>{day}</span>
                        {day && shifts && (() => {
                          const shiftArray = Array.from(shifts);
                          const hasM = shiftArray.some(s => {
                            const h = parseInt(s.split(':')[0]);
                            return (!isNaN(h) && h < 13) || s.toUpperCase().includes('M');
                          });
                          const hasT = shiftArray.some(s => {
                            const h = parseInt(s.split(':')[0]);
                            return (!isNaN(h) && h >= 13) || s.toUpperCase().includes('T');
                          });
                          return (
                            <div style={{ display: 'flex', gap: '2px' }}>
                              {hasM && (
                                <div style={{
                                  fontSize: '8px',
                                  background: isDouble ? 'rgba(255,255,255,0.35)' : '#1871B9',
                                  color: 'white',
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '3px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}>M</div>
                              )}
                              {hasT && (
                                <div style={{
                                  fontSize: '8px',
                                  background: isDouble ? 'rgba(255,255,255,0.35)' : '#F59E0B',
                                  color: 'white',
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '3px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}>T</div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => generarPDFProgramacionMes(mesStr, prof.name)}
                  style={{
                    width: '100%',
                    marginTop: '24px',
                    padding: '14px',
                    background: 'linear-gradient(135deg, #1871B9, #0ea5e9)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '16px',
                    fontWeight: 800,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: '0 10px 20px -5px rgba(24, 113, 185, 0.3)',
                    cursor: 'pointer'
                  }}
                >
                  <FileText size={18} />
                  EXPORTAR PROGRAMACIÓN A PDF
                </motion.button>

                {/* Mensaje de ayuda */}
                <p style={{ textAlign: 'center', fontSize: '10px', color: '#94a3b8', fontWeight: 700, marginTop: '24px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  Hacer clic fuera para cerrar
                </p>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence >
    </div >
  );
};

export default App;
