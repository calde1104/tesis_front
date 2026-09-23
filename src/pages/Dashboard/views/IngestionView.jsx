import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { UploadCloud, CheckCircle2, RefreshCw, Loader2, Download, FileSpreadsheet, Info, Trash2, AlertTriangle, Calendar, MoreVertical } from 'lucide-react';
import { uploadFile, checkPipelineStatus, getIngestionHistory, retryFailedIngestion, deleteIngestionHistory } from '../../../services/ingestion';
import { clearSalesFiltersCache } from '../../../services/sales';
import { clearMarketShareCache } from '../../../services/marketShare';
import { sanitizeIsoDate } from '../../../utils/security';

const IngestionView = () => {
  const fileInputRef = useRef(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pipelineTaskId, setPipelineTaskId] = useState(null);
  const [pipelineState, setPipelineState] = useState(null);
  const [pipelineStages, setPipelineStages] = useState(null);

  const [frequency, setFrequency] = useState(null); // 'MENSUAL' | 'SEMANAL' | null
  const [frequencyError, setFrequencyError] = useState(false);
  const [periodoDesde, setPeriodoDesde] = useState(`${new Date().getFullYear()}-01-01`);
  const [periodoHasta, setPeriodoHasta] = useState(`${new Date().getFullYear()}-12-31`);

  const [isDragOver, setIsDragOver] = useState(false);
  const [showSuccessCelebration, setShowSuccessCelebration] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [fileToDelete, setFileToDelete] = useState(null);
  const [confirmText, setConfirmText] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [activeActionMenuId, setActiveActionMenuId] = useState(null);

  useEffect(() => {
    const handleClickOutside = () => setActiveActionMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchHistory = async () => {
    clearSalesFiltersCache();
    clearMarketShareCache();
    const historyRes = await getIngestionHistory();
    setHistory(historyRes);
    setLoading(false);
  };

  const handleDeleteClick = (log) => {
    setFileToDelete(log);
    setConfirmText("");
    setAcknowledged(false);
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    setDeleting(true);
    await deleteIngestionHistory(fileToDelete.id);
    await fetchHistory();
    setDeleting(false);
    setFileToDelete(null);
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'sku', 'anio', 'mes', 'unidades_vendidas', 'monto_facturado'
    ];
    
    const sampleRow1 = [
      '7790272000022', '2026', '6', '2800', '980000.00'
    ];

    const sampleRow2 = [
      '7791866001913', '2026', '6', '5100', '459000.00'
    ];
    
    const csvContent = [
      headers.join(','),
      sampleRow1.join(','),
      sampleRow2.join(',')
    ].join('\n');
    
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_ingesta_ventas.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    let intervalId;
    if (pipelineTaskId) {
      setUploadProgress(25);
      setPipelineStages({ validation: 'RUNNING', hashing: 'PENDING', insertion: 'PENDING' });

      const t1 = setTimeout(() => {
        setUploadProgress(65);
        setPipelineStages({ validation: 'SUCCESS', hashing: 'RUNNING', insertion: 'PENDING' });
      }, 500);

      const t2 = setTimeout(() => {
        setUploadProgress(90);
        setPipelineStages({ validation: 'SUCCESS', hashing: 'SUCCESS', insertion: 'RUNNING' });
      }, 1000);

      // El servidor puede tardar en registrar el archivo en el historial. Se
      // tolera esa demora, pero acotada: sin un limite, un archivo que nunca
      // aparece dejaria la pantalla girando para siempre.
      const MAX_SONDEOS_SIN_CONFIRMAR = 10;
      let sondeosSinConfirmar = 0;

      intervalId = setInterval(async () => {
        const res = await checkPipelineStatus(pipelineTaskId);

        if (res.status === 'UNKNOWN') {
          sondeosSinConfirmar += 1;
          if (sondeosSinConfirmar >= MAX_SONDEOS_SIN_CONFIRMAR) {
            clearInterval(intervalId);
            clearTimeout(t1);
            clearTimeout(t2);
            setUploading(false);
            setSelectedFile(null);
            setPipelineTaskId(null);
            setShowSuccessCelebration(false);
            setShowErrorAlert(true);
            setErrorMessage('No pudimos confirmar el estado de la ingesta. El archivo puede haberse procesado igual: revisá el historial antes de volver a subirlo.');
            fetchHistory();
          }
          return;
        }

        if (res.status === 'SUCCESS' || res.status === 'FAILED') {
          clearInterval(intervalId);
          clearTimeout(t1);
          clearTimeout(t2);

          if (res.status === 'SUCCESS') {
            setUploadProgress(100);
            setPipelineStages({ validation: 'SUCCESS', hashing: 'SUCCESS', insertion: 'SUCCESS' });
            
            setTimeout(() => {
              setUploading(false);
              setSelectedFile(null);
              setPipelineTaskId(null);
              setShowSuccessCelebration(true);
              setShowErrorAlert(false);
              fetchHistory();
            }, 600);
          } else {
            setUploadProgress(100);
            setPipelineStages({ validation: 'SUCCESS', hashing: 'SUCCESS', insertion: 'FAILED' });
            
            setTimeout(() => {
              setUploading(false);
              setSelectedFile(null);
              setPipelineTaskId(null);
              setShowSuccessCelebration(false);
              setShowErrorAlert(true);
              setErrorMessage('La ingesta fue rechazada por el servidor. Verificá que los SKUs existan o que las ventas de ese período no hayan sido cargadas previamente.');
              fetchHistory();
            }, 1000);
          }
        }
      }, 1200);

      return () => {
        clearInterval(intervalId);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [pipelineTaskId]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setSelectedFile(file);
      setFrequencyError(false);
      setShowErrorAlert(false);
    } else {
      setShowErrorAlert(true);
      setErrorMessage("Por favor, suba únicamente archivos CSV o de Excel (.csv, .xlsx, .xls).");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFrequencyError(false);
      setShowErrorAlert(false);
    }
  };

  const triggerBrowse = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const startIngestion = async (file) => {
    if (!frequency) {
      setFrequencyError(true);
      return;
    }

    setShowErrorAlert(false);
    setShowSuccessCelebration(false);
    setUploading(true);
    setUploadProgress(0);
    setPipelineState('VALIDATING');
    setPipelineStages({ validation: 'RUNNING', hashing: 'PENDING', insertion: 'PENDING' });
    
    try {
      const { taskId } = await uploadFile(file, frequency, periodoDesde, periodoHasta);
      setPipelineTaskId(taskId);
    } catch (err) {
      setUploading(false);
      setShowErrorAlert(true);
      setErrorMessage(err.message || "Ocurrió un error al enviar el archivo al servidor.");
    }
  };

  const handleRetry = async (fileId) => {
    setLoading(true);
    await retryFailedIngestion(fileId);
    await fetchHistory();
  };

  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes) || Number(bytes) === 0) return '-';
    const numBytes = Number(bytes);
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(numBytes) / Math.log(k));
    return parseFloat((numBytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (loading && history.length === 0) {
    return (
      <div className="view-loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '500px', color: '#94a3b8' }}>
        <Loader2 className="spinner" size={32} style={{ animation: 'spin 1s linear infinite', color: '#38bdf8', marginBottom: '1rem' }} />
        <p>Conectando al pipeline de ingesta...</p>
      </div>
    );
  }

  return (
    <div className="view-container ingestion-view" style={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      height: 'calc(100vh - 175px)',
      minHeight: '430px', 
      padding: '0 0.5rem 0.5rem 0.5rem'
    }}>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange}
        accept=".csv,.xlsx,.xls"
        style={{ display: 'none' }}
      />

      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'stretch' }}>
        
        {!selectedFile && !uploading && (
          <div 
            className={`card upload-box-card ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerBrowse}
            style={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              minHeight: '220px',
              cursor: 'pointer',
              border: '2px dashed rgba(56, 189, 248, 0.25)',
              background: isDragOver ? 'rgba(14, 165, 233, 0.08)' : 'rgba(15, 23, 42, 0.4)',
              transition: 'all 0.2s ease',
              borderRadius: '12px'
            }}
          >
            <UploadCloud size={44} style={{ color: '#38bdf8', marginBottom: '0.75rem' }} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#f8fafc' }}>
              Arrastrá tu archivo de ventas aquí
            </h3>
            <p style={{ margin: '0.35rem 0 1.25rem 0', fontSize: '0.8rem', color: '#64748b' }}>
              o hacé clic para explorar tus archivos (Soporta planillas CSV y Excel .xlsx, .xls hasta 50MB)
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <button 
                className="btn-primary" 
                type="button" 
                onClick={(e) => { e.stopPropagation(); triggerBrowse(); }} 
                style={{ 
                  padding: '0.55rem 1.5rem', 
                  fontSize: '0.85rem', 
                  fontWeight: '700',
                  margin: '0 auto'
                }}
              >
                Seleccionar Archivo
              </button>
            </div>
          </div>
        )}

        {selectedFile && !uploading && (
          <div className="card" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.65)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '0.85rem 1.1rem', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileSpreadsheet size={28} style={{ color: '#38bdf8' }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#f8fafc', fontWeight: '700' }}>{selectedFile.name}</h4>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tamaño: {formatBytes(selectedFile.size)}</span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedFile(null)}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#f87171',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Cambiar Archivo
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calendar size={14} style={{ color: '#38bdf8' }} /> Frecuencia del Archivo <span style={{ color: '#f43f5e' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '1rem', maxWidth: '400px' }}>
                  <button
                    type="button"
                    onClick={() => { setFrequency('MENSUAL'); setFrequencyError(false); }}
                    style={{
                      flex: 1,
                      padding: '0.55rem 1rem',
                      borderRadius: '8px',
                      border: `1px solid ${frequency === 'MENSUAL' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                      background: frequency === 'MENSUAL' ? 'rgba(14, 165, 233, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                      color: frequency === 'MENSUAL' ? '#38bdf8' : '#94a3b8',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.2s ease',
                      boxShadow: frequency === 'MENSUAL' ? '0 0 12px rgba(56, 189, 248, 0.3)' : 'none'
                    }}
                  >
                    {frequency === 'MENSUAL' && <CheckCircle2 size={15} />} Mensual
                  </button>

                  <button
                    type="button"
                    onClick={() => { setFrequency('SEMANAL'); setFrequencyError(false); }}
                    style={{
                      flex: 1,
                      padding: '0.55rem 1rem',
                      borderRadius: '8px',
                      border: `1px solid ${frequency === 'SEMANAL' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                      background: frequency === 'SEMANAL' ? 'rgba(14, 165, 233, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                      color: frequency === 'SEMANAL' ? '#38bdf8' : '#94a3b8',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.2s ease',
                      boxShadow: frequency === 'SEMANAL' ? '0 0 12px rgba(56, 189, 248, 0.3)' : 'none'
                    }}
                  >
                    {frequency === 'SEMANAL' && <CheckCircle2 size={15} />} Semanal
                  </button>
                </div>
                {frequencyError && (
                  <span style={{ color: '#f43f5e', fontSize: '0.73rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertTriangle size={13} /> Por favor seleccioná la frecuencia (Mensual o Semanal).
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calendar size={14} style={{ color: '#38bdf8' }} /> Período de Ventas Incluido
                </label>
                <div style={{ display: 'flex', gap: '1.25rem', maxWidth: '550px' }}>
                  
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '600' }}>Período Desde</span>
                    <input 
                      type="date" 
                      value={periodoDesde} 
                      onChange={(e) => setPeriodoDesde(sanitizeIsoDate(e.target.value) || e.target.value)}
                      onClick={(e) => e.target.showPicker && e.target.showPicker()}
                      style={{
                        width: '100%',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        colorScheme: 'dark'
                      }}
                    />
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '600' }}>Período Hasta</span>
                    <input 
                      type="date" 
                      value={periodoHasta} 
                      onChange={(e) => setPeriodoHasta(sanitizeIsoDate(e.target.value) || e.target.value)}
                      onClick={(e) => e.target.showPicker && e.target.showPicker()}
                      style={{
                        width: '100%',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        colorScheme: 'dark'
                      }}
                    />
                  </div>

                </div>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button 
                className="btn-primary" 
                type="button" 
                onClick={() => startIngestion(selectedFile)}
                style={{ 
                  padding: '0.65rem 1.65rem', 
                  fontSize: '0.88rem', 
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderRadius: '8px',
                  boxShadow: '0 0 15px rgba(56, 189, 248, 0.35)',
                  cursor: 'pointer'
                }}
              >
                <UploadCloud size={18} /> Confirmar e Iniciar Ingesta
              </button>
            </div>

          </div>
        )}

        {uploading && pipelineStages && (
          <div className="card pipeline-monitor-card" style={{ flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderRadius: '12px' }}>
            <div className="pipeline-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#f8fafc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Pipeline de Ingesta en Tiempo Real
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                  Procesando {selectedFile ? selectedFile.name : 'planilla de ventas'}
                </p>
              </div>
              <span className="pipeline-badge" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Loader2 className="spinner" size={12} style={{ animation: 'spin 1s linear infinite' }} />
                {uploadProgress}%
              </span>
            </div>

            <div className="progress-bar-bg" style={{ height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
              <div className="progress-bar-fill" style={{ width: `${uploadProgress}%`, height: '100%', background: 'linear-gradient(90deg, #0284c7, #38bdf8)', borderRadius: '3px', transition: 'width 0.3s ease' }} />
            </div>

            <div className="pipeline-stages" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '0.5rem' }}>
              <div className={`stage-step ${pipelineStages.validation.toLowerCase()}`} style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '0.65rem', borderRadius: '8px', textAlign: 'center' }}>
                <span className="step-num" style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', display: 'block' }}>Etapa 1</span>
                <span className="step-title" style={{ fontSize: '0.78rem', color: '#f8fafc', fontWeight: '600' }}>Validación UTF-8</span>
              </div>
              <div className={`stage-step ${pipelineStages.hashing.toLowerCase()}`} style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '0.65rem', borderRadius: '8px', textAlign: 'center' }}>
                <span className="step-num" style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', display: 'block' }}>Etapa 2</span>
                <span className="step-title" style={{ fontSize: '0.78rem', color: '#f8fafc', fontWeight: '600' }}>Hash SHA-256</span>
              </div>
              <div className={`stage-step ${pipelineStages.insertion.toLowerCase()}`} style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '0.65rem', borderRadius: '8px', textAlign: 'center' }}>
                <span className="step-num" style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', display: 'block' }}>Etapa 3</span>
                <span className="step-title" style={{ fontSize: '0.78rem', color: '#f8fafc', fontWeight: '600' }}>Registro en BD</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {showSuccessCelebration && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '8px',
          padding: '0.75rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#34d399',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
            <CheckCircle2 size={18} />
            <span>¡Archivo recibido e ingresado correctamente en la base de datos!</span>
          </div>
          <button 
            onClick={() => setShowSuccessCelebration(false)} 
            style={{ background: 'transparent', border: 'none', color: '#34d399', cursor: 'pointer', fontWeight: '700' }}
          >
            ✕
          </button>
        </div>
      )}

      {showErrorAlert && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '0.75rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#f87171',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
            <AlertTriangle size={18} />
            <span>{errorMessage || 'La ingesta falló. Podés consultar el historial para ver detalles o reintentar.'}</span>
          </div>
          <button 
            onClick={() => setShowErrorAlert(false)} 
            style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: '700' }}
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '6.5fr 3.5fr', 
        gap: '1.25rem',
        flex: 1,
        minHeight: 0
      }}>
        
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', height: '100%' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#f8fafc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Historial de Ingesta de la Organización
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
              Planillas procesadas y selladas en la base de datos MySQL
            </p>
          </div>

          <div className="table-wrapper custom-scrollbar" style={{ overflowY: 'auto', flex: 1 }}>
            <table className="custom-table" style={{ width: '100%', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.25rem' }}>Archivo</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem 0.25rem' }}>Frecuencia</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem 0.25rem' }}>Tamaño</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem 0.25rem' }}>Fecha de Carga</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem 0.25rem' }}>Registros</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem 0.25rem' }}>Estado</th>
                  <th style={{ width: '40px', padding: '0.5rem 0.25rem' }}></th>
                </tr>
              </thead>
              <tbody>
                {history.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td className="name-cell" style={{ textAlign: 'left', padding: '0.55rem 0.25rem', color: '#38bdf8', fontWeight: '600' }}>{log.name}</td>
                    <td style={{ textAlign: 'center', padding: '0.55rem 0.25rem' }}>
                      <span style={{
                        background: log.frequency === 'SEMANAL' ? 'rgba(129, 140, 248, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                        color: log.frequency === 'SEMANAL' ? '#818cf8' : '#38bdf8',
                        border: `1px solid ${log.frequency === 'SEMANAL' ? 'rgba(129, 140, 248, 0.25)' : 'rgba(56, 189, 248, 0.25)'}`,
                        padding: '0.1rem 0.45rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: '600',
                        display: 'inline-block'
                      }}>
                        {log.frequency === 'SEMANAL' ? 'Semanal' : 'Mensual'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '0.55rem 0.25rem', color: '#cbd5e1' }}>{formatBytes(log.size)}</td>
                    <td style={{ textAlign: 'center', padding: '0.55rem 0.25rem', color: '#cbd5e1' }}>{log.date}</td>
                    <td style={{ textAlign: 'center', padding: '0.55rem 0.25rem', fontWeight: '700', color: '#f8fafc' }}>
                      {log.status === 'FAILED' ? '-' : log.records.toLocaleString('es-AR')}
                    </td>
                    <td style={{ textAlign: 'center', padding: '0.55rem 0.25rem' }}>
                      <span className={`status-badge ${log.status.toLowerCase()}`} style={{
                        background: log.status === 'SUCCESS' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                        color: log.status === 'SUCCESS' ? '#34d399' : '#f43f5e',
                        border: `1px solid ${log.status === 'SUCCESS' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`,
                        padding: '0.15rem 0.6rem',
                        borderRadius: '12px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        display: 'inline-block'
                      }}>
                        {log.status === 'SUCCESS' ? 'Completado' : 'Fallido'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '0.55rem 0.25rem', position: 'relative', width: '40px' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveActionMenuId(activeActionMenuId === log.id ? null : log.id);
                        }}
                        style={{
                          background: activeActionMenuId === log.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                          border: 'none',
                          borderRadius: '6px',
                          color: activeActionMenuId === log.id ? '#f8fafc' : '#64748b',
                          padding: '0.25rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        title="Opciones de archivo"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {activeActionMenuId === log.id && (
                        <div 
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 2px)',
                            right: '0.5rem',
                            background: '#0f172a',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '8px',
                            padding: '0.35rem',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
                            zIndex: 100,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.2rem',
                            minWidth: '135px'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {log.status === 'FAILED' && (
                            <button
                              onClick={() => {
                                setActiveActionMenuId(null);
                                handleRetry(log.id);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                padding: '0.4rem 0.6rem',
                                borderRadius: '6px',
                                border: 'none',
                                background: 'transparent',
                                color: '#38bdf8',
                                fontSize: '0.78rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                textAlign: 'left',
                                width: '100%',
                                transition: 'background 0.15s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <RefreshCw size={13} /> Re-intentar
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setActiveActionMenuId(null);
                              handleDeleteClick(log);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              padding: '0.4rem 0.6rem',
                              borderRadius: '6px',
                              border: 'none',
                              background: 'transparent',
                              color: '#f87171',
                              fontSize: '0.78rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              textAlign: 'left',
                              width: '100%',
                              transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <Trash2 size={13} /> Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', height: '100%' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#f8fafc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileSpreadsheet size={16} style={{ color: '#38bdf8' }} /> Formato Requerido
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
              Estructura oficial de columnas requerida en el archivo de ventas
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.6)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.15)', fontSize: '0.74rem' }}>
            <div><span style={{ color: '#38bdf8', fontWeight: '700' }}>SKU</span> <span style={{ color: '#f43f5e', fontSize: '0.65rem' }}>*</span> <br/><span style={{ color: '#94a3b8' }}>Código EAN / SKU de producto</span></div>
            <div><span style={{ color: '#38bdf8', fontWeight: '700' }}>Año</span> <span style={{ color: '#f43f5e', fontSize: '0.65rem' }}>*</span> <br/><span style={{ color: '#94a3b8' }}>Año de venta (ej. 2026)</span></div>
            <div><span style={{ color: '#38bdf8', fontWeight: '700' }}>Mes</span> <span style={{ color: '#f43f5e', fontSize: '0.65rem' }}>*</span> <br/><span style={{ color: '#94a3b8' }}>Número de mes (1 al 12)</span></div>
            <div><span style={{ color: '#38bdf8', fontWeight: '700' }}>Unidades Vendidas</span> <span style={{ color: '#f43f5e', fontSize: '0.65rem' }}>*</span> <br/><span style={{ color: '#94a3b8' }}>Volumen en unidades físicas</span></div>
            <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#38bdf8', fontWeight: '700' }}>Monto Facturado</span> <span style={{ color: '#f43f5e', fontSize: '0.65rem' }}>*</span> <br/><span style={{ color: '#94a3b8' }}>Importe facturado (moneda local)</span></div>
          </div>

          <button 
            className="btn-secondary" 
            onClick={handleDownloadTemplate}
            style={{ 
              marginTop: 'auto',
              padding: '0.5rem 0.85rem', 
              fontSize: '0.78rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <Download size={14} /> Descargar Plantilla (.CSV)
          </button>
        </div>

      </div>

      {fileToDelete && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '440px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f87171' }}>
              <AlertTriangle size={24} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#f8fafc' }}>
                Confirmar Eliminación de Ingesta
              </h3>
            </div>

            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Estás a punto de eliminar la ingesta de <strong style={{ color: '#f8fafc' }}>{fileToDelete.name}</strong> del historial de la organización.
            </p>

            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '8px', padding: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.78rem', color: '#fca5a5', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={acknowledged} 
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  style={{ marginTop: '0.15rem', accentColor: '#ef4444' }}
                />
                <span>Entiendo que este archivo se marcará como ELIMINADO en el historial de auditoría de MySQL.</span>
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>
                Escribí <strong style={{ color: '#f8fafc' }}>ELIMINAR</strong> para confirmar:
              </label>
              <input 
                type="text" 
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="ELIMINAR"
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
              <button 
                type="button" 
                onClick={() => setFileToDelete(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#cbd5e1',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>

              <button 
                type="button" 
                onClick={handleConfirmDelete}
                disabled={!acknowledged || confirmText.trim().toUpperCase() !== 'ELIMINAR' || deleting}
                style={{
                  background: (!acknowledged || confirmText.trim().toUpperCase() !== 'ELIMINAR' || deleting)
                    ? 'rgba(239, 68, 68, 0.2)'
                    : '#ef4444',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.45rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: (!acknowledged || confirmText.trim().toUpperCase() !== 'ELIMINAR' || deleting) ? 'not-allowed' : 'pointer',
                  opacity: (!acknowledged || confirmText.trim().toUpperCase() !== 'ELIMINAR' || deleting) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                {deleting && <Loader2 className="spinner" size={13} style={{ animation: 'spin 1s linear infinite' }} />}
                Eliminar Definitivamente
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default IngestionView;
