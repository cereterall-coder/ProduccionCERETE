import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Users, Play, Plus, Trash2, Edit2, RefreshCw, Database,
  Search, CheckCircle2, AlertCircle, X, LayoutDashboard,
  ArrowRight, UserPlus, Filter, Info, FileText, BarChart3,
  Calendar, Hospital, Stethoscope, ChevronRight, ChevronDown, Table as TableIcon,
  Copyright, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logoCerete from './assets/logo_cerete.png';


const API_BASE = 'http://localhost:8000';

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
    return now.toISOString().slice(0, 10); // "YYYY-MM-DD" para input date
  });

  const [filters, setFilters] = useState({ centro: 'all', servicio: 'all', profesional: 'all', mes: 'all', field: 'PRO' });
  const [form, setForm] = useState({ ITEM: '', ESPECIALIDAD: '', NOMBRES_Y_APELLIDOS: '', DNI: '', ACTIVO: true });
  const [editingId, setEditingId] = useState(null);
  const [showAuthorship, setShowAuthorship] = useState(false);
  const [selectedProfCalendar, setSelectedProfCalendar] = useState(null); // modal calendario
  const [activeProcess, setActiveProcess] = useState('horas'); // sub-pestañas de Consolidación
  const [importingCitados, setImportingCitados] = useState(false);
  const [processingCitados, setProcessingCitados] = useState(false);
  const [citadosData, setCitadosData] = useState([]);
  const [selectedProfCitados, setSelectedProfCitados] = useState('all');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [loadingCitados, setLoadingCitados] = useState(false);
  const [mesesCitados, setMesesCitados] = useState([]);
  const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const [mesCitados, setMesCitados] = useState(currentMonth);

  useEffect(() => {
    fetchData();
    fetchReportData();
  }, []);

  const fetchCitadosData = async (mes) => {
    setLoadingCitados(true);
    try {
      // Si hay carpetas por mes, usar el endpoint por mes
      const url = mes
        ? `${API_BASE}/citados-data-mes?mes=${mes}`
        : `${API_BASE}/citados-data`;
      const res = await axios.get(url);
      setCitadosData(res.data);
    } catch (err) { console.error('No se pudo cargar citados:', err); }
    finally { setLoadingCitados(false); }
  };

  const fetchMesesCitados = async () => {
    try {
      const res = await axios.get(`${API_BASE}/citados-meses`);
      const meses = res.data;
      setMesesCitados(meses);
      // Determinar mes a cargar: mes actual si existe, sino el ultimo disponible
      const target = meses.includes(currentMonth)
        ? currentMonth
        : meses.length > 0 ? meses[meses.length - 1] : null;
      if (target) {
        setMesCitados(target);
        fetchCitadosData(target);
      } else {
        // Fallback al archivo plano
        fetchCitadosData(null);
      }
    } catch (err) {
      console.error(err);
      fetchCitadosData(null);
    }
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
      const data = res.data;
      setReportData(data);
      if (data.length > 0) {
        const monthsSet = new Set(data.map(d => {
          const p = d.PERIODO?.split('/');
          return (p && p.length >= 3) ? `${p[1]}/${p[2]}` : null;
        }).filter(Boolean));

        if (monthsSet.size > 0) {
          // Ordenar cronológicamente y tomar el MÁS RECIENTE
          const sortedMonths = [...monthsSet].sort((a, b) => {
            const [mA, yA] = a.split('/').map(Number);
            const [mB, yB] = b.split('/').map(Number);
            return yA !== yB ? yA - yB : mA - mB;
          });
          const latestMonth = sortedMonths[sortedMonths.length - 1];
          setFilters(f => ({ ...f, mes: latestMonth }));
        }
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
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

  const val = (v) => {
    if (!v) return 0;
    const num = parseInt(v);
    return isNaN(num) ? 0 : num;
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
  }, [reportData, filters.mes, filters.field, activeReport]);

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

      const serviceName = d.SERVICIO || 'SIN SERVICIO';
      const centerName = d.CENTRO || 'SIN CENTRO';
      const monthIdx = dMonth - 1;

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
  }, [reportData, activeReport]);

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
  }, [reportData, filters.mes, filters.centro, activeReport]);

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
          assignments: [],
          totalCit: 0,
          totalPro: 0
        };
      }
      profs[name].assignments.push({ centro: d.CENTRO, turno: d.TURNO, cit: val(d.CIT), pro: val(d.PRO), ate: val(d.ATE) });
      profs[name].totalCit += val(d.CIT);
      profs[name].totalPro += val(d.PRO);
    });

    const sortedList = Object.values(profs).map(p => ({
      ...p,
      assignments: p.assignments.sort((a, b) => {
        const hA = parseInt(String(a.turno).split(':')[0]) || 0;
        const hB = parseInt(String(b.turno).split(':')[0]) || 0;
        return hA - hB;
      })
    })).sort((a, b) => a.name.localeCompare(b.name));

    return {
      stats: {
        totalPros: Object.keys(profs).length,
        totalCit: data.reduce((acc, d) => acc + val(d.CIT), 0),
        totalPro: data.reduce((acc, d) => acc + val(d.PRO), 0),
        totalAte: data.reduce((acc, d) => acc + val(d.ATE), 0)
      },
      list: sortedList
    };
  }, [reportData, especialidades, dashboardDate]);

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
    })
  }), [reportData]);

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
        body: resumen.map(r => [r.centro, r.total]),
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

      const [anio, mesNum] = mesCitados.split('-');
      const nombreArchivo = `${profesional.replace(/\s+/g, '_')}_${mesNum}_${anio}.pdf`;
      doc.save(nombreArchivo);
    };

    if (selectedProfCitados === 'all') {
      // Generar un PDF por cada profesional
      profListCitados.forEach(prof => {
        const filas = filteredCitados.filter(r => r.PROFESIONAL === prof);
        if (filas.length > 0) crearPDF(prof, filas);
      });
    } else {
      crearPDF(selectedProfCitados, filteredCitados);
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
        ACTIVO: item.ACTIVO !== undefined ? item.ACTIVO : true
      });
      setEditingId(item.ITEM);
    } else {
      setForm({ ITEM: '', ESPECIALIDAD: '', NOMBRES_Y_APELLIDOS: '', DNI: '', ACTIVO: true });
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
          <button onClick={() => setActiveTab('reports')} className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}><BarChart3 size={20} /> <span>Monitoreo</span></button>
          <button
            onClick={() => {
              setActiveTab('reportes');
              if (citadosData.length === 0) fetchMesesCitados();
            }}
            className={`nav-item ${activeTab === 'reportes' ? 'active' : ''}`}
          ><FileText size={20} /> <span>Reportes</span></button>
        </nav>

        <div className="mt-auto flex justify-center pb-6">
          <button
            onClick={() => setShowAuthorship(true)}
            className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all duration-300 group relative"
            title="Información de Autoría"
          >
            <Copyright size={20} className="group-hover:rotate-12 transition-transform" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border-2 border-white animate-pulse"></div>
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
                          src={`/${prof.dni}.png`}
                          alt={prof.name}
                          className="prof-avatar"
                          onError={(e) => { e.target.onerror = null; e.target.src = `https://i.pravatar.cc/150?u=${prof.name}`; }}
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
                          </tr>
                        </thead>
                        <tbody>
                          {prof.assignments.map((as, aIdx) => (
                            <tr key={aIdx}>
                              <td className="font-bold text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px]" title={as.centro}>
                                {as.centro}
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
                          <div className="specialist-avatar">
                            {item.NOMBRES_Y_APELLIDOS.split(' ').map(n => n[0]).slice(0, 2).join('')}
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
                { id: 'citados', icon: FileText, label: 'Citados' }
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
              <div className="grid grid-cols-2 gap-6">
                <div className="glass-card p-8">
                  <div className="w-12 h-12 bg-blue-600/10 text-blue-500 rounded-xl flex items-center justify-center mx-auto mb-6"><Database size={24} /></div>
                  <h4 className="text-lg font-black mb-2">1. Unificado</h4>
                  <p className="text-slate-500 text-xs mb-8">Une archivos TXT de <strong>Horas Efectivas</strong> en un solo JSON maestro.</p>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleImportTxt} disabled={importing}
                    className="btn-primary w-full justify-center"
                  >
                    {importing ? 'Sincronizando...' : 'Generar Unificado'}
                  </motion.button>
                </div>
                <div className="glass-card p-8">
                  <div className="w-12 h-12 bg-emerald-600/10 text-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-6"><Play size={24} /></div>
                  <h4 className="text-lg font-black mb-2">2. Sincronizar</h4>
                  <p className="text-slate-500 text-xs mb-8">Cruza datos unificados con especialistas activos.</p>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleProcess} disabled={processing}
                    className="btn-primary btn-emerald w-full justify-center"
                  >
                    {processing ? 'Procesando...' : 'Ejecutar Cruce'}
                  </motion.button>
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
                        {uniqueLists.centros.map(c => <option key={c} value={c}>{c}</option>)}
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
                          <td className="cell-total text-center font-black">{row.total}</td>
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
                                  <span className="text-[10px] font-bold text-slate-700">{child.center}</span>
                                  <span className="text-[8px] font-black text-[#F15A24] uppercase tracking-tighter">Turno: {child.turno}</span>
                                </div>
                              ) : (
                                <span className="text-[10px] font-black text-slate-500">{child.name || child.center}</span>
                              )}
                            </td>
                            <td className="cell-total border-r border-white/5 text-center text-[10px] font-bold">
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
              </table>
            </div>

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
                    <FileText size={14} />
                    {selectedProfCitados === 'all' ? 'PDF por profesional' : 'Generar PDF'}
                  </motion.button>
                </div>
              </header>

              {/* SPINNER o GRILLA */}
              {loadingCitados ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '16px' }}>
                  <div style={{ width: '40px', height: '40px', border: '4px solid #E2E8F0', borderTop: '4px solid #1871B9', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <p style={{ color: '#94A3B8', fontWeight: 700, fontSize: '13px' }}>Cargando datos de citados...</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #E2E8F0', background: 'white', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.04)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr>
                        {COLS.map(col => (
                          <th key={col.key} style={{ background: '#F8FAFC', color: '#1871B9', padding: '10px 12px', fontWeight: 800, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '2px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 10, whiteSpace: 'nowrap', textAlign: 'left' }}>
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCitados.length === 0 ? (
                        <tr>
                          <td colSpan={COLS.length} style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8', fontWeight: 700 }}>
                            Sin datos. Ejecuta primero el proceso de Citados en Consolidación.
                          </td>
                        </tr>
                      ) : filteredCitados.map((row, i) => (
                        <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#F8FAFC', borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EFF6FF'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'white' : '#F8FAFC'}
                        >
                          {COLS.map(col => (
                            <td key={col.key} style={{ padding: '8px 12px', color: '#374151', fontWeight: col.key === 'ESTADO_CITA' ? 800 : 500, whiteSpace: 'nowrap', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {col.key === 'ESTADO_CITA' ? (
                                <span style={{
                                  padding: '2px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 800,
                                  background: row[col.key] === 'ATENDIDA' ? '#D1FAE5' : row[col.key] === 'PENDIENTE' ? '#FEF3C7' : '#FEE2E2',
                                  color: row[col.key] === 'ATENDIDA' ? '#065F46' : row[col.key] === 'PENDIENTE' ? '#92400E' : '#991B1B'
                                }}>{row[col.key] || '—'}</span>
                              ) : col.key === 'ULTCIE10ATEN' ? (
                                <span style={{ fontWeight: 700, color: '#1871B9', fontFamily: 'monospace' }}>
                                  {row[col.key] ? row[col.key].split(' - ')[0].trim() : '—'}
                                </span>
                              ) : (row[col.key] || '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          );
        })()}
      </main>

      {/* FORM MODAL - FORCED INLINE STYLES FOR LAYOUT */}
      <AnimatePresence>
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
        {showAuthorship && (
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
        )}
      </AnimatePresence>

      {/* MODAL CALENDARIO DEL PROFESIONAL - REDISEÑO PREMIUM */}
      <AnimatePresence>
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

                {/* Mensaje de ayuda */}
                <p style={{ textAlign: 'center', fontSize: '10px', color: '#94a3b8', fontWeight: 700, marginTop: '24px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  Hacer clic fuera para cerrar
                </p>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div >
  );
};

export default App;
