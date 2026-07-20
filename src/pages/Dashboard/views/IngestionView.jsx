import { useState, useEffect, useRef } from 'react';
import { UploadCloud, CheckCircle2, RefreshCw, Loader2, Download, FileSpreadsheet, Info, Trash2, AlertTriangle } from 'lucide-react';
import { uploadFile, checkPipelineStatus, getIngestionHistory, retryFailedIngestion, deleteIngestionHistory } from '../../../services/ingestion';

const IngestionView = () => {
  const fileInputRef = useRef(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pipelineTaskId, setPipelineTaskId] = useState(null);
  const [pipelineState, setPipelineState] = useState(null);
  const [pipelineStages, setPipelineStages] = useState(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [showSuccessCelebration, setShowSuccessCelebration] = useState(false);

  const [fileToDelete, setFileToDelete] = useState(null);
  const [confirmText, setConfirmText] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchHistory = async () => {
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
      'Año', 'Mes', 'Canal', 'Departamento', 'Categoria', 'Sku', 'Descripcion',
      'Empresa', 'Marca', 'Unidades Vendidas', 'Facturación'
    ];
    
    const sampleRow = [
      '2026', '6', 'Autoservicio', 'Bebidas', 'Gaseosas', '7790070411122', 'Gaseosa Cola 2.25L',
      'Coca-Cola Company', 'Coca-Cola', '1500', '450000.00'
    ];
    
    const csvContent = [
      headers.join(','),
      sampleRow.map(field => `"${field}"`).join(',')
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
      intervalId = setInterval(async () => {
        const res = await checkPipelineStatus(pipelineTaskId);
        setUploadProgress(res.progress);
        setPipelineState(res.stage);
        setPipelineStages(res.stages);
        
        if (res.status === 'SUCCESS') {
          setPipelineTaskId(null);
          setUploading(false);
          setShowSuccessCelebration(true);
          fetchHistory();
        }
      }, 1200);
    }
    return () => clearInterval(intervalId);
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
      startIngestion(file);
    } else {
      alert("Por favor, suba únicamente archivos CSV o de Excel.");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      startIngestion(file);
    }
  };

  const triggerBrowse = () => {
    fileInputRef.current.click();
  };

  const startIngestion = async (file) => {
    setUploading(true);
    setUploadProgress(0);
    setPipelineState('VALIDATING');
    setPipelineStages({ validation: 'RUNNING', hashing: 'PENDING', insertion: 'PENDING' });
    
    const { taskId } = await uploadFile(file);
    setPipelineTaskId(taskId);
  };

  const handleRetry = async (fileId) => {
    setLoading(true);
    await retryFailedIngestion(fileId);
    await fetchHistory();
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (loading && history.length === 0) {
    return (
      <div className="view-loading">
        <Loader2 className="spinner" size={32} />
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
      minHeight: '550px',
      padding: '0 0.5rem 0.5rem 0.5rem'
    }}>

      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'stretch' }}>
        <div 
          className={`card upload-box-card ${isDragOver ? 'drag-over' : ''} ${uploading ? 'upload-disabled' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem 1.5rem',
            textAlign: 'center',
            minHeight: '210px'
          }}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange}
            accept=".csv,.xlsx,.xls"
            style={{ display: 'none' }}
            disabled={uploading}
          />
          <UploadCloud size={36} className="upload-icon" style={{ color: '#38bdf8', marginBottom: '0.35rem' }} />
          <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '700', color: '#f8fafc' }}>Arrastra tu archivo aquí</h3>
          <p style={{ margin: '0.15rem 0 0.5rem 0', fontSize: '0.7rem', color: '#64748b' }}>
            Soporta formatos CSV y planillas de Excel (.xlsx, .xls) hasta 20MB
          </p>
          <button className="btn-secondary" onClick={triggerBrowse} disabled={uploading} style={{ padding: '0.35rem 0.9rem', fontSize: '0.75rem' }}>
            Seleccionar Archivo
          </button>
        </div>

        {uploading && pipelineStages && (
          <div className="card pipeline-monitor-card" style={{ flex: 1.2, padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div className="pipeline-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: '700', color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Pipeline de Carga Activo</h3>
              <span className="badge progress-badge" style={{ background: '#38bdf8', color: '#0f172a', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '700' }}>
                {uploadProgress}%
              </span>
            </div>
            
            <div className="pipeline-steps" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, justifyContent: 'center' }}>
              <div className={`pipeline-step ${pipelineStages.validation}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
                <div className="step-icon-wrapper" style={{ marginTop: '0.15rem' }}>
                  {pipelineStages.validation === 'SUCCESS' ? <CheckCircle2 className="success-icon" size={14} /> : 
                   pipelineStages.validation === 'RUNNING' ? <Loader2 className="spinner" size={14} /> : 
                   <div className="circle-dot"></div>}
                </div>
                <div className="step-info">
                  <h4 style={{ margin: 0, fontSize: '0.75rem', fontWeight: '600' }}>Validación de Estructura</h4>
                  <p style={{ margin: '0.05rem 0 0 0', fontSize: '0.62rem', color: '#64748b' }}>Control de columnas obligatorias y codificación.</p>
                </div>
              </div>

              <div className={`pipeline-step ${pipelineStages.hashing}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
                <div className="step-icon-wrapper" style={{ marginTop: '0.15rem' }}>
                  {pipelineStages.hashing === 'SUCCESS' ? <CheckCircle2 className="success-icon" size={14} /> : 
                   pipelineStages.hashing === 'RUNNING' ? <Loader2 className="spinner" size={14} /> : 
                   <div className="circle-dot"></div>}
                </div>
                <div className="step-info">
                  <h4 style={{ margin: 0, fontSize: '0.75rem', fontWeight: '600' }}>Verificación de Duplicados</h4>
                  <p style={{ margin: '0.05rem 0 0 0', fontSize: '0.62rem', color: '#64748b' }}>Cálculo Hash SHA256 contra registro histórico.</p>
                </div>
              </div>

              <div className={`pipeline-step ${pipelineStages.insertion}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
                <div className="step-icon-wrapper" style={{ marginTop: '0.15rem' }}>
                  {pipelineStages.insertion === 'SUCCESS' ? <CheckCircle2 className="success-icon" size={14} /> : 
                   pipelineStages.insertion === 'RUNNING' ? <Loader2 className="spinner" size={14} /> : 
                   <div className="circle-dot"></div>}
                </div>
                <div className="step-info">
                  <h4 style={{ margin: 0, fontSize: '0.75rem', fontWeight: '600' }}>Procesamiento e Inserción</h4>
                  <p style={{ margin: '0.05rem 0 0 0', fontSize: '0.62rem', color: '#64748b' }}>Aplicación de reglas RLS multi-tenant en MySQL.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '6.4fr 3.6fr', 
        gap: '1.25rem',
        flex: 1,
        minHeight: 0
      }}>
        
        <div className="card table-card history-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.25rem', height: '100%', minHeight: 0 }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Historial de Ingesta de la Organización
          </h3>
          <div className="table-wrapper custom-scrollbar" style={{ overflowY: 'auto', flex: 1, marginTop: '0.5rem' }}>
            <table className="custom-table" style={{ width: '100%', fontSize: '0.78rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.25rem' }}>Archivo</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem 0.25rem' }}>Tamaño</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem 0.25rem' }}>Fecha de Carga</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem 0.25rem' }}>Registros</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem 0.25rem' }}>Estado</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem 0.25rem' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {history.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td className="name-cell" style={{ textAlign: 'left', padding: '0.55rem 0.25rem', color: '#38bdf8', fontWeight: '600' }}>{log.name}</td>
                    <td style={{ textAlign: 'center', padding: '0.55rem 0.25rem' }}>{formatBytes(log.size)}</td>
                    <td style={{ textAlign: 'center', padding: '0.55rem 0.25rem' }}>{log.date}</td>
                    <td style={{ textAlign: 'center', padding: '0.55rem 0.25rem', fontWeight: '700', color: '#f8fafc' }}>
                      {log.status === 'FAILED' ? '-' : log.records.toLocaleString('es-AR')}
                    </td>
                    <td style={{ textAlign: 'center', padding: '0.55rem 0.25rem' }}>
                      <span className={`status-badge ${log.status.toLowerCase()}`} style={{
                        background: log.status === 'SUCCESS' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                        color: log.status === 'SUCCESS' ? '#34d399' : '#f43f5e',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        display: 'inline-block'
                      }}>
                        {log.status === 'SUCCESS' ? 'Completado' : 'Fallido'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '0.55rem 0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', width: '165px', margin: '0 auto' }}>
                        {log.status === 'FAILED' ? (
                          <>
                            <button className="action-btn retry-btn" onClick={() => handleRetry(log.id)} title="Intentar Cargar Nuevamente" style={{
                              background: 'rgba(56, 189, 248, 0.1)',
                              border: '1px solid rgba(56, 189, 248, 0.2)',
                              color: '#38bdf8',
                              padding: '0.2rem 0.35rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.2rem',
                              width: 'calc(50% - 0.175rem)',
                              flexShrink: 0
                            }}>
                              <RefreshCw size={11} /> Reintentar
                            </button>
                            <button 
                              className="action-btn delete-btn" 
                              onClick={() => handleDeleteClick(log)} 
                              title="Eliminar Registro" 
                              style={{
                                background: 'rgba(244, 63, 94, 0.08)',
                                border: '1px solid rgba(244, 63, 94, 0.15)',
                                color: '#f43f5e',
                                padding: '0.2rem 0.35rem',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.2rem',
                                width: 'calc(50% - 0.175rem)',
                                flexShrink: 0
                              }}
                            >
                              <Trash2 size={11} /> Eliminar
                            </button>
                          </>
                        ) : (
                          <button 
                            className="action-btn delete-btn" 
                            onClick={() => handleDeleteClick(log)} 
                            title="Eliminar Registro" 
                            style={{
                              background: 'rgba(244, 63, 94, 0.08)',
                              border: '1px solid rgba(244, 63, 94, 0.15)',
                              color: '#f43f5e',
                              padding: '0.2rem 0.35rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.2rem',
                              width: '100%'
                            }}
                          >
                            <Trash2 size={11} /> Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.9rem', height: '100%', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSpreadsheet size={22} style={{ color: '#38bdf8' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Formato Requerido</h3>
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.4' }}>
            El archivo a subir debe ser plano, codificado en UTF-8 y contener las siguientes columnas exactas en su cabecera:
          </p>

          <div 
            className="custom-scrollbar" 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '0.55rem 0.85rem', 
              marginTop: '0.15rem',
              overflowY: 'auto',
              maxHeight: '190px',
              paddingRight: '0.2rem'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#38bdf8', background: 'rgba(56,189,248,0.08)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontFamily: 'monospace', alignSelf: 'flex-start' }}>Año</span>
              <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>Año de venta (ej: 2026)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#38bdf8', background: 'rgba(56,189,248,0.08)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontFamily: 'monospace', alignSelf: 'flex-start' }}>Mes</span>
              <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>Mes (1 al 12)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#38bdf8', background: 'rgba(56,189,248,0.08)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontFamily: 'monospace', alignSelf: 'flex-start' }}>Canal</span>
              <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>Canal (Autoservicio, etc)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#38bdf8', background: 'rgba(56,189,248,0.08)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontFamily: 'monospace', alignSelf: 'flex-start' }}>Departamento</span>
              <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>Depto (Bebidas, etc)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#38bdf8', background: 'rgba(56,189,248,0.08)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontFamily: 'monospace', alignSelf: 'flex-start' }}>Categoria</span>
              <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>Categoría de producto</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#38bdf8', background: 'rgba(56,189,248,0.08)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontFamily: 'monospace', alignSelf: 'flex-start' }}>Sku</span>
              <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>Código EAN de barra</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#38bdf8', background: 'rgba(56,189,248,0.08)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontFamily: 'monospace', alignSelf: 'flex-start' }}>Descripcion</span>
              <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>Nombre descriptivo</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#38bdf8', background: 'rgba(56,189,248,0.08)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontFamily: 'monospace', alignSelf: 'flex-start' }}>Empresa</span>
              <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>Empresa fabricante</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#38bdf8', background: 'rgba(56,189,248,0.08)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontFamily: 'monospace', alignSelf: 'flex-start' }}>Marca</span>
              <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>Marca comercial</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#38bdf8', background: 'rgba(56,189,248,0.08)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontFamily: 'monospace', alignSelf: 'flex-start' }}>Unidades Vendidas</span>
              <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>Cantidad física vendida</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#38bdf8', background: 'rgba(56,189,248,0.08)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontFamily: 'monospace', alignSelf: 'flex-start' }}>Facturación</span>
              <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>Monto total en pesos</span>
            </div>
          </div>

          <button onClick={handleDownloadTemplate} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', marginTop: 'auto', marginBottom: '0.5rem', padding: '0.55rem', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>
            <Download size={15} /> Descargar Plantilla (.CSV)
          </button>

          <div style={{ 
            background: 'rgba(255, 255, 255, 0.02)', 
            border: '1px solid rgba(255, 255, 255, 0.05)', 
            borderRadius: '8px', 
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#38bdf8', fontSize: '0.8rem', fontWeight: '700' }}>
              <Info size={13} />
              Recomendaciones de Carga
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.72rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li>Los decimales en <strong>Facturación</strong> deben usar punto (.) como separador.</li>
              <li>Evite tildes o caracteres especiales en el archivo CSV.</li>
              <li>El archivo debe estar libre de filas vacías.</li>
            </ul>
          </div>
        </div>

      </div>

      {fileToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000,
          animation: 'fade-in 0.2s ease-out'
        }} onClick={() => setFileToDelete(null)}>
          <div style={{
            background: 'rgba(30, 41, 59, 0.98)',
            border: '1px solid rgba(244, 63, 94, 0.2)',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '480px',
            width: '90%',
            textAlign: 'left',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(244, 63, 94, 0.1)',
            animation: 'scale-up 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            position: 'relative'
          }} onClick={(e) => e.stopPropagation()}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
              <div style={{ background: 'rgba(244, 63, 94, 0.1)', padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={24} style={{ color: '#ef4444' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#f8fafc' }}>Acción de Alto Riesgo</h3>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Se requiere doble confirmación de seguridad</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                Está por eliminar permanentemente del sistema el archivo:
                <strong style={{ display: 'block', color: '#38bdf8', fontSize: '0.88rem', fontFamily: 'monospace', marginTop: '0.25rem', background: 'rgba(255,255,255,0.03)', padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {fileToDelete.name}
                </strong>
              </p>

              {fileToDelete.status === 'SUCCESS' ? (
                <div style={{ 
                  background: 'rgba(239, 68, 68, 0.06)', 
                  border: '1px solid rgba(239, 68, 68, 0.15)', 
                  borderRadius: '8px', 
                  padding: '0.85rem',
                  fontSize: '0.75rem',
                  color: '#fca5a5',
                  lineHeight: '1.5'
                }}>
                  <strong style={{ color: '#ef4444', display: 'block', marginBottom: '0.25rem' }}>⚠️ Advertencia Crítica de Datos:</strong>
                  Este lote insertó <strong>{fileToDelete.records.toLocaleString('es-AR')}</strong> registros exitosos en las tablas de ventas mensuales. Su eliminación revertirá la transacción e impactará directamente la precisión de las predicciones de IA.
                </div>
              ) : (
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px solid rgba(255, 255, 255, 0.05)', 
                  borderRadius: '8px', 
                  padding: '0.8rem',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  lineHeight: '1.5'
                }}>
                  Este archivo falló durante el pipeline de carga. Al eliminarlo, se quitará únicamente el log de error en el panel de auditoría histórica.
                </div>
              )}
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', userSelect: 'none' }}>
              <input 
                type="checkbox" 
                checked={acknowledged} 
                onChange={(e) => setAcknowledged(e.target.checked)} 
                style={{ marginTop: '0.2rem', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                Entiendo que esta acción es permanente y eliminará irreversiblemente todos los registros comerciales vinculados.
              </span>
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Escriba el nombre exacto del archivo para autorizar la eliminación:
              </span>
              <input 
                type="text" 
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Copie y pegue el nombre del archivo aquí"
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: confirmText === fileToDelete.name ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '0.6rem 0.75rem',
                  color: '#f8fafc',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                disabled={deleting}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button 
                className="btn-secondary" 
                onClick={() => setFileToDelete(null)}
                style={{ flex: 1, padding: '0.6rem', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmDelete}
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  borderRadius: '8px',
                  border: 'none',
                  background: (acknowledged && confirmText === fileToDelete.name) ? 'linear-gradient(90deg, #ef4444, #dc2626)' : 'rgba(255,255,255,0.03)',
                  color: (acknowledged && confirmText === fileToDelete.name) ? '#fff' : '#64748b',
                  cursor: (acknowledged && confirmText === fileToDelete.name && !deleting) ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  boxShadow: (acknowledged && confirmText === fileToDelete.name) ? '0 4px 12px rgba(239, 68, 68, 0.2)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
                disabled={!acknowledged || confirmText !== fileToDelete.name || deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="spinner" size={14} /> Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 size={13} /> Confirmar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessCelebration && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000,
          animation: 'fade-in 0.3s ease-out'
        }} onClick={() => setShowSuccessCelebration(false)}>
          
          {Array.from({ length: 35 }).map((_, i) => {
            const randomLeft = Math.random() * 100;
            const randomDelay = Math.random() * 1.5;
            const randomDuration = 2 + Math.random() * 2;
            const randomColor = ['#38bdf8', '#34d399', '#f43f5e', '#fb923c', '#e9d5ff'][Math.floor(Math.random() * 5)];
            const randomSize = 6 + Math.random() * 8;
            return (
              <div 
                key={i} 
                style={{
                  position: 'absolute',
                  top: '-20px',
                  left: `${randomLeft}%`,
                  width: `${randomSize}px`,
                  height: `${randomSize * 1.5}px`,
                  backgroundColor: randomColor,
                  opacity: 0.8,
                  borderRadius: '2px',
                  animation: `confetti-fall ${randomDuration}s linear ${randomDelay}s infinite`,
                  pointerEvents: 'none',
                  zIndex: 1000
                }}
              />
            );
          })}

          <div style={{
            background: 'rgba(30, 41, 59, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '2.5rem',
            maxWidth: '440px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 30px rgba(52, 211, 153, 0.15)',
            animation: 'scale-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem',
            position: 'relative'
          }} onClick={(e) => e.stopPropagation()}>
            
            <div style={{ position: 'relative', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg className="checkmark-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                display: 'block',
                strokeWidth: '4',
                stroke: '#10b981',
                strokeMiterlimit: '10',
                boxShadow: 'inset 0px 0px 0px #10b981',
                animation: 'checkmark-fill .4s ease-in-out .4s forwards, checkmark-scale .3s ease-in-out .9s both'
              }}>
                <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" style={{
                  strokeDasharray: '166',
                  strokeDashoffset: '166',
                  strokeWidth: '4',
                  strokeMiterlimit: '10',
                  stroke: '#10b981',
                  fill: 'none',
                  animation: 'checkmark-draw 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards'
                }}/>
                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" style={{
                  transformOrigin: '50% 50%',
                  strokeDasharray: '48',
                  strokeDashoffset: '48',
                  strokeWidth: '4',
                  strokeLinecap: 'round',
                  stroke: '#fff',
                  animation: 'checkmark-draw 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards'
                }}/>
              </svg>
            </div>

            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800', color: '#34d399', letterSpacing: '0.01em' }}>¡Carga Exitosa!</h2>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                El archivo de ventas semanales ha sido validado, verificado y registrado en el pipeline correctamente.
              </p>
            </div>

            <button 
              className="btn-primary" 
              onClick={() => setShowSuccessCelebration(false)}
              style={{
                width: '100%',
                padding: '0.65rem',
                fontSize: '0.85rem',
                fontWeight: '700',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(90deg, #38bdf8, #0ea5e9)',
                color: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(14, 165, 233, 0.25)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
            >
              Listo
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes checkmark-draw {
          100% { stroke-dashoffset: 0; }
        }
        @keyframes checkmark-scale {
          0%, 100% { transform: none; }
          50% { transform: scale3d(1.1, 1.1, 1); }
        }
        @keyframes checkmark-fill {
          100% { box-shadow: inset 0px 0px 0px 40px #10b981; }
        }
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 0.8; }
          100% { transform: translateY(500px) rotate(720deg); opacity: 0; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-up {
          from { transform: scale(0.9) translateY(20px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>

    </div>
  );
};

export default IngestionView;
