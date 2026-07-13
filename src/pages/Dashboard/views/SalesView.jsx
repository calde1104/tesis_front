import { useState, useEffect } from 'react';
import { Download, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { getSalesFilters, getSalesSummary, getSalesList, triggerSalesExport, checkExportStatus } from '../../../services/sales';

const SalesView = ({ formatCurrency }) => {
  const [filterOptions, setFilterOptions] = useState(null);
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState('');
  
  const [summary, setSummary] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loadingTable, setLoadingTable] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const [exportTaskId, setExportTaskId] = useState(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState(null); // 'RUNNING', 'SUCCESS', null
  const [downloadUrl, setDownloadUrl] = useState(null);

  useEffect(() => {
    const fetchFilters = async () => {
      const filters = await getSalesFilters();
      setFilterOptions(filters);
    };
    fetchFilters();
  }, []);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoadingSummary(true);
      const res = await getSalesSummary({ department, category });
      setSummary(res);
      setLoadingSummary(false);
    };

    fetchSummary();
  }, [department, category]);

  useEffect(() => {
    const fetchSales = async () => {
      setLoadingTable(true);
      const res = await getSalesList({ department, category }, page, 8);
      setSalesData(res.data);
      setTotalPages(res.totalPages);
      setTotalItems(res.totalItems);
      setLoadingTable(false);
    };

    fetchSales();
  }, [department, category, page]);

  const handleDepartmentChange = (e) => {
    setDepartment(e.target.value);
    setCategory('');
    setPage(1);
  };

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setPage(1);
  };

  const handleExport = async () => {
    setDownloadUrl(null);
    setExportProgress(0);
    setExportStatus('RUNNING');
    
    const { taskId } = await triggerSalesExport({ department, category });
    setExportTaskId(taskId);
  };

  const handleDownload = () => {
    const csvHeader = 'SKU;Producto;Contenido Neto;Unidad Medida;Categoria;Unidades;Facturacion;Precio Promedio\n';
    const csvRows = salesData.map(item => 
      `${item.sku};${item.name};${item.netContent};${item.unit};${item.category};${item.units};${item.revenue};${item.avgPrice}`
    ).join('\n');
    
    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reporte_ventas_${department || 'general'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    let intervalId;
    if (exportTaskId && exportStatus === 'RUNNING') {
      intervalId = setInterval(async () => {
        const status = await checkExportStatus(exportTaskId);
        setExportProgress(status.progress);
        if (status.status === 'SUCCESS') {
          setExportStatus('SUCCESS');
          setDownloadUrl(status.downloadUrl);
          setExportTaskId(null);
        }
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [exportTaskId, exportStatus]);

  return (
    <div className="view-container">
      <div className="view-header" style={{ justifyContent: 'flex-end', marginBottom: '0.25rem' }}>
        <div className="view-actions">
          {exportStatus === 'RUNNING' ? (
            <div className="export-status-panel card">
              <Loader2 size={16} className="spinner" />
              <span>Generando reporte ({exportProgress}%)</span>
              <div className="progress-bar-mini">
                <div className="progress-fill-mini" style={{ width: `${exportProgress}%` }}></div>
              </div>
            </div>
          ) : exportStatus === 'SUCCESS' ? (
            <button onClick={handleDownload} className="btn-success">
              <Download size={18} /> Descargar Reporte
            </button>
          ) : (
            <button className="btn-primary" onClick={handleExport}>
              <Download size={18} /> Exportar Selección
            </button>
          )}
        </div>
      </div>

      <div className="card filters-card">
        <h3>Filtros de Búsqueda</h3>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Departamento</label>
            <select value={department} onChange={handleDepartmentChange}>
              <option value="">Todos los Departamentos</option>
              {filterOptions?.departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Categoría</label>
            <select 
              value={category} 
              onChange={handleCategoryChange}
              disabled={!department}
            >
              <option value="">Todas las Categorías</option>
              {department && filterOptions?.categories[department]?.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="kpi-cards">
        <div className="card kpi-card">
          <div className="kpi-info">
            <h3>Facturación Acumulada</h3>
            {loadingSummary ? (
              <div className="skeleton-text">Cargando...</div>
            ) : (
              <h2>{formatCurrency(summary?.totalRevenue || 0)}</h2>
            )}
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-info">
            <h3>Unidades Vendidas</h3>
            {loadingSummary ? (
              <div className="skeleton-text">Cargando...</div>
            ) : (
              <h2>{summary?.totalUnits.toLocaleString('es-AR')} un.</h2>
            )}
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-info">
            <h3>Margen Promedio</h3>
            {loadingSummary ? (
              <div className="skeleton-text">Cargando...</div>
            ) : (
              <h2>{summary?.averageMargin}%</h2>
            )}
          </div>
        </div>
      </div>

      <div className="card table-card">
        <div className="table-header">
          <h3>Ventas a Nivel de SKU</h3>
          <span className="badge">{totalItems} productos encontrados</span>
        </div>
        
        <div className="table-wrapper">
          {loadingTable ? (
            <div className="table-loading">
              <Loader2 className="spinner" size={32} />
              <p>Actualizando lista de SKUs...</p>
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Presentación</th>
                  <th className="number-col">Unidades</th>
                  <th className="number-col">Facturación</th>
                  <th className="number-col">Precio Promedio</th>
                </tr>
              </thead>
              <tbody>
                {salesData.length > 0 ? (
                  salesData.map((item, idx) => (
                    <tr key={idx}>
                      <td className="sku-cell">{item.sku}</td>
                      <td className="name-cell">{item.name}</td>
                      <td>{item.category}</td>
                      <td style={{ color: '#cbd5e1' }}>{item.netContent} {item.unit}</td>
                      <td className="number-col">{item.units.toLocaleString('es-AR')}</td>
                      <td className="number-col">{formatCurrency(item.revenue)}</td>
                      <td className="number-col font-bold" style={{ color: '#38bdf8' }}>
                        {formatCurrency(item.avgPrice)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="no-data-cell">No se encontraron productos para los filtros seleccionados</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="table-pagination">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              className="pagination-btn"
            >
              <ArrowLeft size={16} /> Anterior
            </button>
            <span className="page-info">Página {page} de {totalPages}</span>
            <button 
              disabled={page === totalPages} 
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              className="pagination-btn"
            >
              Siguiente <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesView;
