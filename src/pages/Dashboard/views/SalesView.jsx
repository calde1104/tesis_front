import { useState, useEffect } from 'react';
import { Download, Loader2, ArrowLeft, ArrowRight, Coins, Target, Scale, X } from 'lucide-react';
import { getSalesFilters, getSalesSummary, getSalesList, triggerSalesExport, checkExportStatus } from '../../../services/sales';


// Componente selector personalizado para evitar barras de desplazamiento estándar
const CustomSelect = ({ label, value, onChange, options, placeholder, direction = 'down', isMulti = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClose = () => setIsOpen(false);
    if (isOpen) {
      window.addEventListener('click', handleClose);
    }
    return () => window.removeEventListener('click', handleClose);
  }, [isOpen]);

  let selectedOptionLabel = placeholder;
  if (isMulti) {
    if (Array.isArray(value) && value.length > 0) {
      const numericSelectedCount = value.filter(val => val !== '').length;
      const totalNumericCount = options.filter(opt => opt.value !== '').length;

      if (numericSelectedCount === totalNumericCount) {
        selectedOptionLabel = placeholder;
      } else {
        selectedOptionLabel = value
          .map(val => options.find(opt => opt.value.toString() === val.toString())?.label)
          .filter(Boolean)
          .join(', ');
      }
    } else {
      selectedOptionLabel = placeholder;
    }
  } else {
    selectedOptionLabel = options.find(opt => opt.value === value)?.label || placeholder;
  }

  const handleOptionClick = (optVal) => {
    if (isMulti) {
      let newValue;
      if (optVal === '') {
        newValue = [];
      } else {
        const exist = value.includes(optVal);
        if (exist) {
          newValue = value.filter(v => v !== optVal);
        } else {
          newValue = [...value, optVal];
        }
      }
      onChange({ target: { value: newValue } });
    } else {
      onChange({ target: { value: optVal } });
      setIsOpen(false);
    }
  };

  return (
    <div className="filter-group" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
      <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.35rem', letterSpacing: '0.05em' }}>{label}</label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: `1px solid ${isOpen ? '#0ea5e9' : 'rgba(255, 255, 255, 0.1)'}`,
          borderRadius: '8px',
          color: '#f8fafc',
          padding: '0.55rem 0.75rem',
          fontSize: '0.85rem',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '38px',
          boxSizing: 'border-box',
          transition: 'all 0.2s ease',
          userSelect: 'none',
          boxShadow: isOpen ? '0 0 12px rgba(14, 165, 233, 0.45)' : 'none'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85%' }}>{selectedOptionLabel}</span>
        <span style={{
          fontSize: '0.6rem',
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
            bottom: direction === 'up' ? '100%' : undefined,
            top: direction === 'down' ? '100%' : undefined,
            left: 0,
            right: 0,
            marginBottom: direction === 'up' ? '0.35rem' : undefined,
            marginTop: direction === 'down' ? '0.35rem' : undefined,
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 100,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
          }}
        >
          {options.map((opt) => {
            const isChecked = isMulti
              ? (opt.value === '' ? (!value || value.length === 0) : value.includes(opt.value))
              : value === opt.value;

            return (
              <div
                key={opt.value}
                onClick={() => handleOptionClick(opt.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.82rem',
                  color: isChecked ? '#38bdf8' : '#cbd5e1',
                  background: isChecked ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  userSelect: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  if (!isChecked) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.color = '#f8fafc';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isChecked) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#cbd5e1';
                  }
                }}
              >
                {isMulti && (
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                    style={{
                      accentColor: '#38bdf8',
                      cursor: 'pointer'
                    }}
                  />
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {opt.label}
                </span>
              </div>
            );
          })}
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
  const [years, setYears] = useState([]);
  const [months, setMonths] = useState([]);

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
      const res = await getSalesSummary({ department, category, brand, search, years, months });
      setSummary(res);
      setLoadingSummary(false);
    };

    fetchSummary();
  }, [department, category, brand, search, years, months]);

  useEffect(() => {
    const fetchSales = async () => {
      setLoadingTable(true);
      const res = await getSalesList({ department, category, brand, search, sortBy, sortOrder, years, months }, page, 8);
      setSalesData(res.data);
      setTotalPages(res.totalPages);
      setTotalItems(res.totalItems);
      setLoadingTable(false);
    };

    fetchSales();
  }, [department, category, brand, search, sortBy, sortOrder, page, years, months]);

  const handleDepartmentChange = (e) => {
    const nextDept = e.target.value;
    setDepartment(nextDept);
    if (nextDept && category && filterOptions) {
      const allowedCats = filterOptions.categories[nextDept] || [];
      if (!allowedCats.includes(category)) {
        setCategory('');
      }
    }
    setBrand('');
    setPage(1);
  };

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setBrand('');
    setPage(1);
  };

  const handleBrandChange = (e) => {
    setBrand(e.target.value);
    setPage(1);
  };

  const handleYearsChange = (e) => {
    setYears(e.target.value);
    setMonths([]);
    setPage(1);
  };

  const handleMonthsChange = (e) => {
    setMonths(e.target.value);
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
    setYears([]);
    setMonths([]);
    setSortBy('');
    setSortOrder('desc');
    setPage(1);
  };

  const handleExport = async () => {
    setDownloadUrl(null);
    setExportProgress(0);
    setExportStatus('RUNNING');

    const { taskId } = await triggerSalesExport({ department, category, brand, search, years, months });
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

      <div className="card filters-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Filtros de Búsqueda</h3>
          {(search || department || category || brand || sortBy || years.length > 0 || months.length > 0) && (
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
        <div className="filters-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
          <div className="filter-group" style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.35rem', letterSpacing: '0.05em' }}>Buscar Producto / SKU</label>
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
                padding: '0.55rem 0.75rem',
                fontFamily: 'inherit',
                fontSize: '0.85rem',
                outline: 'none',
                height: '38px',
                boxSizing: 'border-box',
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
            label="Año"
            isMulti={true}
            value={years}
            onChange={handleYearsChange}
            placeholder="Todos los Años"
            options={[
              { value: '', label: 'Todos los Años' },
              ...(filterOptions?.years.map(yr => ({ value: yr.toString(), label: yr.toString() })) || [])
            ]}
          />

          <CustomSelect
            label="Mes"
            isMulti={true}
            value={months}
            onChange={handleMonthsChange}
            placeholder="Todos los Meses"
            options={[
              { value: '', label: 'Todos los Meses' },
              ...((() => {
                let allowedMonthNums = null;
                if (years && years.length > 0 && filterOptions?.yearMonths) {
                  const allowedSet = new Set();
                  years.forEach(yr => {
                    const mList = filterOptions.yearMonths[yr] || [];
                    mList.forEach(m => allowedSet.add(m));
                  });
                  allowedMonthNums = Array.from(allowedSet);
                }
                const allMonths = filterOptions?.months || [];
                return allowedMonthNums
                  ? allMonths.filter(m => allowedMonthNums.includes(m.value))
                  : allMonths;
              })().map(m => ({ value: m.value.toString(), label: m.label })))
            ]}
          />

          <CustomSelect
            label="Departamento"
            value={department}
            onChange={handleDepartmentChange}
            placeholder="Todos los Departamentos"
            options={[
              { value: '', label: 'Todos los Departamentos' },
              ...((category && filterOptions?.categories
                ? [Object.keys(filterOptions.categories).find(d => filterOptions.categories[d]?.includes(category))].filter(Boolean)
                : (brand && filterOptions?.brandDepartments?.[brand]
                  ? filterOptions.brandDepartments[brand]
                  : (filterOptions?.departments || [])
                )
              ).map(dept => ({ value: dept, label: dept })))
            ]}
          />

          <CustomSelect
            label="Categoría"
            value={category}
            onChange={handleCategoryChange}
            placeholder="Todas las Categorías"
            options={[
              { value: '', label: 'Todas las Categorías' },
              ...((brand && filterOptions?.brandCategories?.[brand]
                ? filterOptions.brandCategories[brand]
                : (department && filterOptions?.categories?.[department]
                  ? filterOptions.categories[department]
                  : (filterOptions ? Array.from(new Set(Object.values(filterOptions.categories).flat())) : [])
                )
              ).map(cat => ({ value: cat, label: cat })))
            ]}
          />

          <CustomSelect
            label="Marca"
            value={brand}
            onChange={handleBrandChange}
            placeholder="Todas las Marcas"
            options={[
              { value: '', label: 'Todas las Marcas' },
              ...((category && filterOptions?.categoryBrands?.[category]
                ? filterOptions.categoryBrands[category]
                : (department && filterOptions?.deptBrands?.[department]
                  ? filterOptions.deptBrands[department]
                  : (filterOptions?.brands || [])
                )
              ).map(b => ({ value: b, label: b })))
            ]}
          />
        </div>
      </div>

      <div className="kpi-cards" style={{ marginBottom: '1.25rem', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="card kpi-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div className="kpi-header" style={{ justifyContent: 'center', width: '100%' }}>
            <span className="kpi-label">Facturación Acumulada</span>
          </div>
          <div className="kpi-value" style={{ margin: '0.5rem 0', color: '#f8fafc' }}>
            {loadingSummary ? '...' : formatCurrency(summary?.totalRevenue || 0)}
          </div>
          <div className="kpi-footer" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: '500' }}>Total en período filtrado</span>
          </div>
        </div>

        <div className="card kpi-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div className="kpi-header" style={{ justifyContent: 'center', width: '100%' }}>
            <span className="kpi-label">Unidades Vendidas</span>
          </div>
          <div className="kpi-value" style={{ margin: '0.5rem 0', color: '#f8fafc' }}>
            {loadingSummary ? '...' : `${summary?.totalUnits.toLocaleString('es-PY') || 0} un.`}
          </div>
          <div className="kpi-footer" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: '500' }}>Volumen físico de ventas</span>
          </div>
        </div>

        <div className="card kpi-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div className="kpi-header" style={{ justifyContent: 'center', width: '100%' }}>
            <span className="kpi-label">Precio Unitario Promedio (ASP)</span>
          </div>
          <div className="kpi-value" style={{ margin: '0.5rem 0', color: '#f8fafc' }}>
            {loadingSummary ? '...' : formatCurrency(summary?.averagePrice || 0)}
          </div>
          <div className="kpi-footer" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: '500' }}>Precio Lista Promedio</span>
          </div>
        </div>
      </div>

      <div className="card table-card">
        <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <h3 style={{ margin: 0 }}>Ventas a Nivel de SKU</h3>
            <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.15)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700' }}>
              {totalItems} registros encontrados
            </span>
          </div>

          <div className="view-actions" style={{ display: 'flex', alignItems: 'center' }}>
            {exportStatus === 'RUNNING' ? (
              <div className="export-status-panel card" style={{ padding: '0.35rem 0.75rem', gap: '0.5rem', display: 'flex', alignItems: 'center', borderRadius: '6px', fontSize: '0.75rem', margin: 0 }}>
                <Loader2 size={13} className="spinner" />
                <span>Generando ({exportProgress}%)</span>
                <div className="progress-bar-mini" style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div className="progress-fill-mini" style={{ width: `${exportProgress}%`, height: '100%', background: '#38bdf8' }}></div>
                </div>
              </div>
            ) : exportStatus === 'SUCCESS' ? (
              <button onClick={handleDownload} className="btn-success" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', borderRadius: '6px' }}>
                <Download size={14} /> Descargar Reporte
              </button>
            ) : (
              <button className="btn-primary" onClick={handleExport} style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', borderRadius: '6px' }}>
                <Download size={14} /> Exportar Selección
              </button>
            )}
          </div>
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
                    style={{ width: '10%', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                    onClick={() => handleSort('date')}
                  >
                    Fecha
                    <span style={{ marginLeft: '4px', opacity: sortBy === 'date' ? 1 : 0.25, fontSize: '0.75rem' }}>
                      {sortBy === 'date' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </th>
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
                    Precio Unitario
                    <span style={{ marginLeft: '4px', opacity: sortBy === 'avgPrice' ? 1 : 0.25, fontSize: '0.75rem' }}>
                      {sortBy === 'avgPrice' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {salesData.length > 0 ? (
                  salesData.map((item, idx) => {
                    const monthNamesEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                    const dateFormatted = item.month && item.year
                      ? `${monthNamesEs[item.month - 1] || item.month} ${item.year}`
                      : 'Consolidado';

                    return (
                      <tr key={idx}>
                        <td className="center-col" style={{ color: '#38bdf8', fontWeight: '600' }}>{dateFormatted}</td>
                        <td className="sku-cell center-col">{item.sku}</td>
                        <td className="name-cell">{item.name}</td>
                        <td>{item.category}</td>
                        <td>{item.brand}</td>
                        <td className="number-col">{item.units.toLocaleString('es-AR')}</td>
                        <td className="number-col">{formatCurrency(item.revenue)}</td>
                        <td className="number-col font-bold" style={{ color: '#38bdf8' }}>
                          {formatCurrency(item.avgPrice)}
                        </td>
                      </tr>
                    );
                  })
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
