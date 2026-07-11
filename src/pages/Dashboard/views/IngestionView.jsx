import { useState, useEffect, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, RefreshCw, Loader2, Database, Cpu } from 'lucide-react';
import { uploadFile, checkPipelineStatus, getIngestionHistory, getSystemHealth, retryFailedIngestion } from '../../../services/ingestion';

const IngestionView = () => {
  const fileInputRef = useRef(null);
  const [history, setHistory] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pipelineTaskId, setPipelineTaskId] = useState(null);
  const [pipelineState, setPipelineState] = useState(null); // 'VALIDATING', 'HASHING', 'INSERTING', 'SUCCESS', null
  const [pipelineStages, setPipelineStages] = useState(null);

  const [isDragOver, setIsDragOver] = useState(false);

  const fetchHistoryAndHealth = async () => {
    const [historyRes, healthRes] = await Promise.all([
      getIngestionHistory(),
      getSystemHealth()
    ]);
    setHistory(historyRes);
    setHealth(healthRes);
    setLoading(false);
  };

  useEffect(() => {
    fetchHistoryAndHealth();
    
    const healthInterval = setInterval(async () => {
      const healthRes = await getSystemHealth();
      setHealth(healthRes);
    }, 5000);

    return () => clearInterval(healthInterval);
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
          fetchHistoryAndHealth();
        }
      }, 1200); // ligeramente más lento para que se note la transición de etapas
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
      startIngestion(file.name, file.size);
    } else {
      alert("Por favor, suba únicamente archivos CSV o de Excel.");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      startIngestion(file.name, file.size);
    }
  };

  const triggerBrowse = () => {
    fileInputRef.current.click();
  };

  const startIngestion = async (name, size) => {
    setUploading(true);
    setUploadProgress(0);
    setPipelineState('VALIDATING');
    setPipelineStages({ validation: 'RUNNING', hashing: 'PENDING', insertion: 'PENDING' });
    
    const { taskId } = await uploadFile(name, size);
    setPipelineTaskId(taskId);
  };

  const handleRetry = async (fileId) => {
    setLoading(true);
    await retryFailedIngestion(fileId);
    await fetchHistoryAndHealth();
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
    <div className="view-container ingestion-view">

      <div className="ingestion-layout-grid">
        
        <div className="ingestion-left-col">
          <div 
            className={`card upload-box-card ${isDragOver ? 'drag-over' : ''} ${uploading ? 'upload-disabled' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              disabled={uploading}
            />
            <UploadCloud size={48} className="upload-icon" />
            <h3>Arrastra tu archivo aquí</h3>
            <p>Soporta formatos CSV y planillas de Excel (.xlsx, .xls) hasta 20MB</p>
            <button className="btn-secondary" onClick={triggerBrowse} disabled={uploading}>
              Seleccionar Archivo
            </button>
          </div>

          {uploading && pipelineStages && (
            <div className="card pipeline-monitor-card">
              <div className="pipeline-header">
                <h3>Pipeline de Carga Activo</h3>
                <span className="badge progress-badge">{uploadProgress}%</span>
              </div>
              
              <div className="pipeline-steps">
                <div className={`pipeline-step ${pipelineStages.validation}`}>
                  <div className="step-icon-wrapper">
                    {pipelineStages.validation === 'SUCCESS' ? <CheckCircle2 className="success-icon" size={18} /> : 
                     pipelineStages.validation === 'RUNNING' ? <Loader2 className="spinner" size={18} /> : 
                     <div className="circle-dot"></div>}
                  </div>
                  <div className="step-info">
                    <h4>Validación de Estructura</h4>
                    <p>Verificando columnas obligatorias, formatos y codificación de caracteres.</p>
                  </div>
                </div>

                <div className={`pipeline-step ${pipelineStages.hashing}`}>
                  <div className="step-icon-wrapper">
                    {pipelineStages.hashing === 'SUCCESS' ? <CheckCircle2 className="success-icon" size={18} /> : 
                     pipelineStages.hashing === 'RUNNING' ? <Loader2 className="spinner" size={18} /> : 
                     <div className="circle-dot"></div>}
                  </div>
                  <div className="step-info">
                    <h4>Verificación de Duplicados</h4>
                    <p>Comparando hash MD5/SHA256 para evitar cargas duplicadas de la misma semana.</p>
                  </div>
                </div>

                <div className={`pipeline-step ${pipelineStages.insertion}`}>
                  <div className="step-icon-wrapper">
                    {pipelineStages.insertion === 'SUCCESS' ? <CheckCircle2 className="success-icon" size={18} /> : 
                     pipelineStages.insertion === 'RUNNING' ? <Loader2 className="spinner" size={18} /> : 
                     <div className="circle-dot"></div>}
                  </div>
                  <div className="step-info">
                    <h4>Procesamiento e Inserción</h4>
                    <p>Corriendo scripts RLS de Multi-tenant y guardando en MySQL.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="ingestion-right-col">
          <div className="card health-card">
            <h3>Salud del Pipeline</h3>
            
            <div className="health-metrics-grid">
              <div className="health-item">
                <div className="health-icon-wrapper db-theme">
                  <Database size={24} />
                </div>
                <div className="health-details">
                  <span className="health-label">Latencia Base de Datos</span>
                  <span className="health-value">{health?.dbLatency || 15} ms</span>
                  <span className="health-status-badge good">Excelente</span>
                </div>
              </div>

              <div className="health-item">
                <div className="health-icon-wrapper cpu-theme">
                  <Cpu size={24} />
                </div>
                <div className="health-details">
                  <span className="health-label">Carga de Cómputo CPU</span>
                  <span className="health-value">{health?.computeLoad || 42}%</span>
                  <span className="health-status-badge good">Estable</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="card table-card history-card">
        <h3>Historial de Ingesta de la Organización</h3>
        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Archivo</th>
                <th>Tamaño</th>
                <th>Fecha de Carga</th>
                <th className="number-col">Registros</th>
                <th>Estado</th>
                <th className="center-col">Acción</th>
              </tr>
            </thead>
            <tbody>
              {history.map((log) => (
                <tr key={log.id}>
                  <td className="name-cell">{log.name}</td>
                  <td>{formatBytes(log.size)}</td>
                  <td>{log.date}</td>
                  <td className="number-col">{log.status === 'FAILED' ? '-' : log.records.toLocaleString('es-AR')}</td>
                  <td>
                    <span className={`status-badge ${log.status.toLowerCase()}`}>
                      {log.status === 'SUCCESS' ? 'Completado' : 'Fallido'}
                    </span>
                  </td>
                  <td className="center-col">
                    {log.status === 'FAILED' ? (
                      <button className="action-btn retry-btn" onClick={() => handleRetry(log.id)} title="Intentar Cargar Nuevamente">
                        <RefreshCw size={14} /> Reintentar
                      </button>
                    ) : (
                      <span className="action-placeholder">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default IngestionView;
