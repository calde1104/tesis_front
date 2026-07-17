import { useState, useEffect } from 'react';
import { Download, Loader2, ArrowLeft, ArrowRight, Coins, Target, Scale, X } from 'lucide-react';
import { getSalesFilters, getSalesSummary, getSalesList, triggerSalesExport, checkExportStatus } from '../../../services/sales';

const deptBrands = {
  'Alimentos': ['Molinos', 'Vicentin', 'Arcor'],
  'Bebidas': ['Quilmes', 'Coca-Cola', 'Otros'],
  'Limpieza': ['Unilever', 'Otros'],
  'Cuidado Personal': []
};

const categoryBrands = {
  'Aceites': ['Vicentin'],
  'Fideos': ['Molinos'],
  'Arroz': ['Molinos'],
  'Salsas': ['Arcor'],
  'Cervezas': ['Quilmes'],
  'Vinos': ['Otros'],
  'Gaseosas': ['Coca-Cola'],
  'Aguas': ['Coca-Cola'],
  'Jabón Líquido': ['Unilever'],
  'Desinfectantes': ['Unilever'],
  'Suavizantes': ['Unilever'],
  'Limpiadores Multiuso': ['Otros']
};

// Componente selector personalizado para evitar barras de desplazamiento estándar
const CustomSelect = ({ label, value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClose = () => setIsOpen(false);
    if (isOpen) {
      window.addEventListener('click', handleClose);
    }
    return () => window.removeEventListener('click', handleClose);
  }, [isOpen]);

  const selectedOptionLabel = options.find(opt => opt.value === value)?.label || placeholder;

  return (
    <div className="filter-group" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
      <label>{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: `1px solid ${isOpen ? '#0ea5e9' : 'rgba(255, 255, 255, 0.1)'}`,
          borderRadius: '8px',
          color: '#f8fafc',
          padding: '0.6rem 0.8rem',
          fontSize: '0.9rem',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.2s ease',
          userSelect: 'none',
          boxShadow: isOpen ? '0 0 12px rgba(14, 165, 233, 0.45)' : 'none'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedOptionLabel}</span>
        <span style={{ 
          fontSize: '0.65rem', 
          color: '#64748b', 
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease'
        }}>
          ▼
        </span>
      </div>

      {isOpen && (
        <div 
          className="custom-scrollbar"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.35rem',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            maxHeight: '220px',
            overflowY: 'auto',
            zIndex: 100,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
          }}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange({ target: { value: opt.value } });
                setIsOpen(false);
              }}
              style={{
                padding: '0.55rem 0.8rem',
                fontSize: '0.88rem',
                color: value === opt.value ? '#38bdf8' : '#cbd5e1',
                background: value === opt.value ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                userSelect: 'none',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (value !== opt.value) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.color = '#f8fafc';
                }
              }}
              onMouseLeave={(e) => {
                if (value !== opt.value) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#cbd5e1';
                }
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SalesView = ({ formatCurrency }) => {
  const [filterOptions, setFilterOptions] = useState(null);
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [search, setSearch] = useState('');
  
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');

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
      const res = await getSalesSummary({ department, category, brand, search });
      setSummary(res);
      setLoadingSummary(false);
    };

    fetchSummary();
  }, [department, category, brand, search]);

  useEffect(() => {
    const fetchSales = async () => {
      setLoadingTable(true);
      const res = await getSalesList({ department, category, brand, search, sortBy, sortOrder }, page, 8);
      setSalesData(res.data);
      setTotalPages(res.totalPages);
      setTotalItems(res.totalItems);
      setLoadingTable(false);
    };

    fetchSales();
  }, [department, category, brand, search, sortBy, sortOrder, page]);

  const handleDepartmentChange = (e) => {
    const nextDept = e.target.value;
    setDepartment(nextDept);
    let nextCat = category;
    if (nextDept && category && filterOptions) {
      const allowedCats = filterOptions.categories[nextDept] || [];
      if (!allowedCats.includes(category)) {
        setCategory('');
        nextCat = '';
      }
    }
    
    if (brand) {
      if (nextCat) {
        const allowedBrands = categoryBrands[nextCat] || [];
        if (!allowedBrands.includes(brand)) setBrand('');
      } else if (nextDept) {
        const allowedBrands = deptBrands[nextDept] || [];
        if (!allowedBrands.includes(brand)) setBrand('');
      }
    }
    
    setPage(1);
  };

  const handleCategoryChange = (e) => {
    const nextCat = e.target.value;
    setCategory(nextCat);
    
    if (brand && nextCat) {
      const allowedBrands = categoryBrands[nextCat] || [];
      if (!allowedBrands.includes(brand)) setBrand('');
    }
    
    setPage(1);
  };

  const handleBrandChange = (e) => {
    setBrand(e.target.value);
    setPage(1);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      if (sortOrder === 'desc') {
        setSortOrder('asc');
      } else {
        setSortBy('');
        setSortOrder('desc');
      }
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setDepartment('');
    setCategory('');
    setBrand('');
    setSortBy('');
    setSortOrder('desc');
    setPage(1);
  };

  const handleExport = async () => {
    setDownloadUrl(null);
    setExportProgress(0);
    setExportStatus('RUNNING');
    
    const { taskId } = await triggerSalesExport({ department, category, brand });
    setExportTaskId(taskId);
  };

  const handleDownload = () => {
    const csvHeader = 'SKU;Producto;Contenido Neto;Unidad Medida;Categoria;Marca;Unidades;Facturacion;Precio Promedio\n';
    const csvRows = salesData.map(item => 
      `${item.sku};${item.name};${item.netContent};${item.unit};${item.category};${item.brand};${item.units};${item.revenue};${item.avgPrice}`
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Filtros de Búsqueda</h3>
          {(search || department || category || brand || sortBy) && (
            <button 
              className="btn-secondary" 
              onClick={handleClearFilters}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
              }}
            >
              <X size={14} /> Limpiar Filtros
            </button>
          )}
        </div>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Buscar Producto / SKU</label>
            <input 
              type="text" 
              value={search} 
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Escribí nombre o SKU..."
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#f8fafc',
                padding: '0.6rem 0.8rem',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#0ea5e9';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(14, 165, 233, 0.45)';
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.85)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)';
              }}
            />
          </div>

          <CustomSelect
            label="Departamento"
            value={department}
            onChange={handleDepartmentChange}
            placeholder="Todos los Departamentos"
            options={[
              { value: '', label: 'Todos los Departamentos' },
              ...(filterOptions?.departments.map(dept => ({ value: dept, label: dept })) || [])
            ]}
          />

          <CustomSelect
            label="Categoría"
            value={category}
            onChange={handleCategoryChange}
            placeholder="Todas las Categorías"
            options={[
              { value: '', label: 'Todas las Categorías' },
              ...(department 
                ? (filterOptions?.categories[department]?.map(cat => ({ value: cat, label: cat })) || [])
                : (filterOptions ? Array.from(new Set(Object.values(filterOptions.categories).flat())).map(cat => ({ value: cat, label: cat })) : [])
              )
            ]}
          />

          <CustomSelect
            label="Marca"
            value={brand}
            onChange={handleBrandChange}
            placeholder="Todas las Marcas"
            options={[
              { value: '', label: 'Todas las Marcas' },
              ...(filterOptions?.brands
                .filter(b => {
                  if (category) {
                    const allowedBrands = categoryBrands[category] || [];
                    return allowedBrands.includes(b);
                  }
                  if (department) {
                    const allowedBrands = deptBrands[department] || [];
                    return allowedBrands.includes(b);
                  }
                  return true;
                })
                .map(b => ({ value: b, label: b })) || []
              )
            ]}
          />
        </div>
      </div>

      <div className="kpi-cards" style={{ marginBottom: '1.25rem', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="card kpi-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div className="kpi-header" style={{ justifyContent: 'center', width: '100%' }}>
            <span className="kpi-label">Facturación Acumulada</span>
          </div>
          <div className="kpi-value" style={{ margin: '0.5rem 0' }}>
            {loadingSummary ? '...' : formatCurrency(summary?.totalRevenue || 0)}
          </div>
          <div className="kpi-footer" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Total en período filtrado</span>
          </div>
        </div>

        <div className="card kpi-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div className="kpi-header" style={{ justifyContent: 'center', width: '100%' }}>
            <span className="kpi-label">Unidades Vendidas</span>
          </div>
          <div className="kpi-value" style={{ margin: '0.5rem 0' }}>
            {loadingSummary ? '...' : `${summary?.totalUnits.toLocaleString('es-AR') || 0} un.`}
          </div>
          <div className="kpi-footer" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Volumen físico de ventas</span>
          </div>
        </div>

        <div className="card kpi-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div className="kpi-header" style={{ justifyContent: 'center', width: '100%' }}>
            <span className="kpi-label">Margen Comercial Promedio</span>
          </div>
          <div className="kpi-value" style={{ margin: '0.5rem 0' }}>
            {loadingSummary ? '...' : `${summary?.averageMargin || 0}%`}
          </div>
          <div className="kpi-footer" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.15)', padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '700' }}>
              Margen Saludable
            </span>
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
                  <th 
                    className="center-col" 
                    style={{ width: '8%', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                    onClick={() => handleSort('sku')}
                  >
                    SKU
                    <span style={{ marginLeft: '4px', opacity: sortBy === 'sku' ? 1 : 0.25, fontSize: '0.75rem' }}>
                      {sortBy === 'sku' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </th>
                  <th style={{ width: '22%', whiteSpace: 'nowrap' }}>Producto</th>
                  <th style={{ width: '15%', whiteSpace: 'nowrap' }}>Categoría</th>
                  <th style={{ width: '11%', whiteSpace: 'nowrap' }}>Marca</th>
                  <th className="center-col" style={{ width: '10%', whiteSpace: 'nowrap' }}>Presentación</th>
                  <th 
                    className="number-col" 
                    style={{ width: '10%', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                    onClick={() => handleSort('units')}
                  >
                    Unidades
                    <span style={{ marginLeft: '4px', opacity: sortBy === 'units' ? 1 : 0.25, fontSize: '0.75rem' }}>
                      {sortBy === 'units' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </th>
                  <th 
                    className="number-col" 
                    style={{ width: '12%', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                    onClick={() => handleSort('revenue')}
                  >
                    Facturación
                    <span style={{ marginLeft: '4px', opacity: sortBy === 'revenue' ? 1 : 0.25, fontSize: '0.75rem' }}>
                      {sortBy === 'revenue' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </th>
                  <th 
                    className="number-col" 
                    style={{ width: '12%', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                    onClick={() => handleSort('avgPrice')}
                  >
                    Precio Promedio
                    <span style={{ marginLeft: '4px', opacity: sortBy === 'avgPrice' ? 1 : 0.25, fontSize: '0.75rem' }}>
                      {sortBy === 'avgPrice' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {salesData.length > 0 ? (
                  salesData.map((item, idx) => (
                    <tr key={idx}>
                      <td className="sku-cell center-col">{item.sku}</td>
                      <td className="name-cell">{item.name}</td>
                      <td>{item.category}</td>
                      <td>{item.brand}</td>
                      <td className="center-col" style={{ color: '#cbd5e1' }}>{item.netContent} {item.unit}</td>
                      <td className="number-col">{item.units.toLocaleString('es-AR')}</td>
                      <td className="number-col">{formatCurrency(item.revenue)}</td>
                      <td className="number-col font-bold" style={{ color: '#38bdf8' }}>
                        {formatCurrency(item.avgPrice)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="no-data-cell">No se encontraron productos para los filtros seleccionados</td>
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
