import { useState, useEffect } from 'react';
import { Loader2, Award, Building2, TrendingUp, TrendingDown, GlassWater, Utensils, Droplet, Folder, X } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { getMarketShareOverview, getPriceGap, getMarketShareComposition } from '../../../services/marketShare';
import { getSalesFilters } from '../../../services/sales';
import { getEmpresaId } from '../../../services/api';

const getCategoryIcon = (catName) => {
  const name = catName ? catName.toLowerCase() : '';
  if (name.includes('aceite') || name.includes('fideo') || name.includes('arroz') || name.includes('salsa') || name.includes('almacen')) {
    return <Utensils size={13} style={{ color: '#fb923c' }} />;
  }
  if (name.includes('cerveza') || name.includes('vino') || name.includes('gaseosa') || name.includes('agua') || name.includes('bebida') || name.includes('whisky')) {
    return <GlassWater size={13} style={{ color: '#38bdf8' }} />;
  }
  if (name.includes('jabón') || name.includes('desinfectante') || name.includes('suavizante') || name.includes('limpieza')) {
    return <Droplet size={13} style={{ color: '#2dd4bf' }} />;
  }
  return <Folder size={13} style={{ color: '#94a3b8' }} />;
};

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
        const currentArr = Array.isArray(value) ? value : [];
        if (currentArr.includes(optVal)) {
          newValue = currentArr.filter(item => item !== optVal);
        } else {
          newValue = [...currentArr, optVal];
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
      <label>{label}</label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: `1px solid ${isOpen ? '#0ea5e9' : 'rgba(255, 255, 255, 0.1)'}`,
          borderRadius: '8px',
          color: '#f8fafc',
          padding: '0.5rem 0.75rem',
          fontSize: '0.85rem',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.2s ease',
          userSelect: 'none',
          boxShadow: isOpen ? '0 0 12px rgba(14, 165, 233, 0.45)' : 'none'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOptionLabel}
        </span>
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
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
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

const MarketView = () => {
  const [shareData, setShareData] = useState([]);
  const [priceGap, setPriceGap] = useState([]);
  const [composition, setComposition] = useState([]);
  const [loading, setLoading] = useState(true);

  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [years, setYears] = useState([]);
  const [months, setMonths] = useState([]);
  const [filterOptions, setFilterOptions] = useState(null);

  useEffect(() => {
    const fetchFilters = async () => {
      const filters = await getSalesFilters();
      setFilterOptions(filters);
    };
    fetchFilters();
  }, []);

  const [categoryShares, setCategoryShares] = useState({});
  const [categoryPriceGaps, setCategoryPriceGaps] = useState({});

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      const shareRes = await getMarketShareOverview({ department, category, brand, years, months });
      const priceRes = await getPriceGap({ department, category, brand, years, months });

      const lastPoint = shareRes && shareRes.length > 0 ? shareRes[shareRes.length - 1] : null;
      const targetAnio = years.length > 0 ? parseInt(years[years.length - 1]) : (lastPoint ? lastPoint.year : 2025);
      const targetMes = months.length > 0 ? parseInt(months[months.length - 1]) : (lastPoint ? lastPoint.monthNum : 12);

      const compRes = await getMarketShareComposition(targetAnio, targetMes, { department, category, brand });

      const catSharesMap = {};
      const catGapsMap = {};

      const catsToFetch = category 
        ? [category] 
        : (filterOptions && filterOptions.categories
            ? (department ? (filterOptions.categories[department] || []) : Array.from(new Set(Object.values(filterOptions.categories).flat())))
            : ['ACEITES', 'MAYONESAS']);

      if (!category && catsToFetch.length > 0) {
        await Promise.all(catsToFetch.map(async (catName) => {
          const [catOverview, catPrice] = await Promise.all([
            getMarketShareOverview({ department, category: catName, brand, years, months }),
            getPriceGap({ department, category: catName, brand, years, months })
          ]);
          if (catOverview && catOverview.length > 0) {
            catSharesMap[catName] = catOverview[catOverview.length - 1]['Nuestra Empresa'];
          }
          if (catPrice && catPrice.length > 0) {
            catGapsMap[catName] = parseFloat((catPrice.reduce((acc, curr) => acc + curr.gap, 0) / catPrice.length).toFixed(1));
          }
        }));
      }

      if (isMounted) {
        setShareData(shareRes);
        setPriceGap(priceRes);
        setComposition(compRes);
        setCategoryShares(catSharesMap);
        setCategoryPriceGaps(catGapsMap);
        setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [department, category, brand, years, months, filterOptions]);

  const handleDepartmentChange = (e) => {
    setDepartment(e.target.value);
    setCategory('');
    setBrand('');
  };

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setBrand('');
  };

  const handleBrandChange = (e) => {
    setBrand(e.target.value);
  };

  const handleYearsChange = (e) => {
    setYears(e.target.value);
  };

  const handleMonthsChange = (e) => {
    setMonths(e.target.value);
  };

  const handleClearFilters = () => {
    setDepartment('');
    setCategory('');
    setBrand('');
    setYears([]);
    setMonths([]);
  };

  const deptOptions = [
    { value: '', label: 'Todos los departamentos' },
    ...(filterOptions?.departments?.map(d => ({ value: d, label: d })) || [])
  ];

  const categoryOptions = [
    { value: '', label: 'Todas las categorías' },
    ...(department
      ? (filterOptions?.categories[department]?.map(c => ({ value: c, label: c })) || [])
      : (filterOptions ? Array.from(new Set(Object.values(filterOptions.categories).flat())).map(c => ({ value: c, label: c })) : [])
    )
  ];

  const brandOptions = [
    { value: '', label: 'Todas las marcas' },
    ...(filterOptions?.brands?.map(b => ({ value: b, label: b })) || [])
  ];

  const lastPoint = shareData.length > 0 ? shareData[shareData.length - 1] : null;
  const currentShare = lastPoint ? lastPoint['Nuestra Empresa'] : 0.63;
  const prevPoint = shareData.length > 1 ? shareData[shareData.length - 2] : null;
  const prevShare = prevPoint ? prevPoint['Nuestra Empresa'] : currentShare;
  const shareDiff = parseFloat((currentShare - prevShare).toFixed(2));

  const currentEmpresaId = getEmpresaId();
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentEmpresaNombre = storedUser.empresaNombre || storedUser.nombre || storedUser.empresa || 'A.G.DEHEZA';

  let processedComposition = [];
  if (composition.length > 0) {
    const mappedComp = composition.map((comp) => {
      const isOurCompany = (comp.empresaId && String(comp.empresaId) === String(currentEmpresaId)) ||
                           (comp.name && comp.name.toUpperCase() === currentEmpresaNombre.toUpperCase());
      return {
        empresaId: comp.empresaId,
        name: comp.name,
        share: comp.share,
        isOurCompany
      };
    });

    const isOurCompanyInTop5 = mappedComp.slice(0, 5).some(c => c.isOurCompany);

    if (isOurCompanyInTop5) {
      processedComposition = mappedComp.slice(0, 5);
    } else {
      const ourCompIndex = mappedComp.findIndex(c => c.isOurCompany);
      const top4 = mappedComp.slice(0, 4);
      const ourCompEntry = ourCompIndex !== -1 
        ? mappedComp[ourCompIndex] 
        : { empresaId: currentEmpresaId, name: currentEmpresaNombre, share: currentShare, isOurCompany: true };
      processedComposition = [...top4, ourCompEntry];
    }
  }

  const rankingList = processedComposition.map((comp, idx) => ({
    ...comp,
    displayName: comp.isOurCompany ? `${comp.name} (Nosotros)` : comp.name,
    color: comp.isOurCompany ? 'linear-gradient(90deg, #0284c7, #38bdf8)' : idx === 0 ? '#94a3b8' : '#64748b',
    icon: comp.isOurCompany ? <Award size={14} style={{ color: '#38bdf8' }} /> : <Building2 size={14} style={{ color: '#cbd5e1' }} />
  }));

  const activeCategories = category 
    ? [category] 
    : (filterOptions && filterOptions.categories
        ? (department ? (filterOptions.categories[department] || []) : Array.from(new Set(Object.values(filterOptions.categories).flat())))
        : ['WHISKYS']);

  const leaderCompany = composition.length > 0 ? composition[0] : null;

  const tableData = activeCategories.map((cat) => {
    const isLider = leaderCompany && (
      (leaderCompany.empresaId && String(leaderCompany.empresaId) === String(currentEmpresaId)) ||
      (leaderCompany.name && leaderCompany.name.toUpperCase() === currentEmpresaNombre.toUpperCase())
    );

    const rowShare = categoryShares[cat] !== undefined ? categoryShares[cat] : currentShare;

    const defaultAvgGap = priceGap.length > 0 
      ? parseFloat((priceGap.reduce((acc, curr) => acc + curr.gap, 0) / priceGap.length).toFixed(1))
      : 0;
    const rowGap = categoryPriceGaps[cat] !== undefined ? categoryPriceGaps[cat] : defaultAvgGap;

    return {
      category: cat,
      ourShare: rowShare,
      leaderShare: isLider ? 'Nuestra Empresa' : (leaderCompany ? `${leaderCompany.name} (${leaderCompany.share}%)` : '-'),
      priceGap: rowGap,
      status: isLider ? 'Líder' : 'Seguidor',
      trend: shareDiff >= 0 ? 'up' : 'down'
    };
  });

  if (loading) {
    return (
      <div className="view-loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '600px', color: '#94a3b8' }}>
        <Loader2 className="spinner" size={32} style={{ animation: 'spin 1s linear infinite', color: '#38bdf8', marginBottom: '1rem' }} />
        <p>Cargando información competitiva del mercado...</p>
      </div>
    );
  }

  return (
    <div className="view-container market-view" style={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      height: 'calc(100vh - 200px)',
      minHeight: '600px',
      padding: '0 0.5rem 0.5rem 0.5rem'
    }}>

      <div className="card filters-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '0.85rem 1.25rem', marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#f8fafc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Filtros de Búsqueda</h3>
          {(department || category || brand || years.length > 0 || months.length > 0) && (
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
            >
              <X size={14} /> Limpiar Filtros
            </button>
          )}
        </div>
        <div className="filters-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(5, 1fr)', 
          gap: '1rem',
          alignItems: 'center'
        }}>
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
              ...(filterOptions?.months.map(m => ({ value: m.value.toString(), label: m.label })) || [])
            ]}
          />
          <CustomSelect
            label="Departamento"
            value={department}
            onChange={handleDepartmentChange}
            placeholder="Todos los departamentos"
            options={deptOptions}
          />
          <CustomSelect
            label="Categoría"
            value={category}
            onChange={handleCategoryChange}
            placeholder="Todas las categorías"
            options={categoryOptions}
          />
          <CustomSelect
            label="Marca"
            value={brand}
            onChange={handleBrandChange}
            placeholder="Todas las marcas"
            options={brandOptions}
          />
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '4.2fr 5.8fr', 
        gap: '1.25rem',
        flex: 1,
        minHeight: 0
      }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
          
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Cuota de Mercado</h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                  {category ? `Participación en la categoría ${category}` : department ? `Participación en el departamento ${department}` : 'Evolución histórica consolidada de la empresa'}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.45rem', fontWeight: '800', color: '#38bdf8', display: 'block', lineHeight: 1 }}>{currentShare}%</span>
                <span style={{ fontSize: '0.68rem', color: shareDiff >= 0 ? '#34d399' : '#f43f5e', display: 'flex', alignItems: 'center', gap: '0.15rem', justifyContent: 'flex-end', fontWeight: '600', marginTop: '0.25rem' }}>
                  {shareDiff >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />} 
                  {shareDiff >= 0 ? `+${shareDiff}%` : `${shareDiff}%`} vs mes anterior
                </span>
              </div>
            </div>
            
            <div className="chart-container" style={{ height: '180px', minHeight: '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={shareData} margin={{ top: 5, right: 5, left: -32, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="month" stroke="#475569" tick={{fill: '#64748b', fontSize: 9}} />
                  <YAxis stroke="#475569" tick={{fill: '#64748b', fontSize: 9}} domain={['auto', 'auto']} tickFormatter={(val) => `${val}%`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '8px', fontSize: '0.75rem' }}
                    labelStyle={{ color: '#f8fafc', fontWeight: '600' }}
                    itemStyle={{ color: '#38bdf8' }}
                    formatter={(val) => [`${val}%`, 'Cuota de Mercado']}
                  />
                  <Line type="monotone" dataKey="Nuestra Empresa" stroke="#38bdf8" strokeWidth={3} dot={{ fill: '#38bdf8', r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.75rem', fontSize: '0.68rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#38bdf8', fontWeight: '600' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8' }} />
                Nuestra Empresa ({currentEmpresaNombre})
              </span>
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, minHeight: 0 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Share of Assortment (SOA)</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>Distribución de referencias (SKUs) en el catálogo total del mercado</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.85rem' }}>
              {rankingList.map((item) => (
                <div key={item.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: item.isOurCompany ? '700' : '400' }}>
                    <span style={{ color: item.isOurCompany ? '#38bdf8' : '#cbd5e1', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {item.icon}
                      {item.displayName || item.name}
                    </span>
                    <span style={{ color: item.isOurCompany ? '#f8fafc' : '#94a3b8', fontWeight: '600' }}>{item.share}%</span>
                  </div>
                  <div style={{ height: '5px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, item.share * 100)}%`, height: '100%', background: item.color, borderRadius: '3px' }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 'auto',
              background: 'rgba(14, 165, 233, 0.03)',
              border: '1px dashed rgba(14, 165, 233, 0.2)',
              borderRadius: '8px',
              padding: '0.75rem',
              fontSize: '0.72rem',
              color: '#cbd5e1',
              lineHeight: '1.4'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8', fontWeight: '700', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Award size={13} />
                Insight de Mercado
              </div>
              <span>
                Nuestra Empresa posee un <strong>{currentShare}%</strong> de cuota de mercado promedio. Se posiciona como <strong>{rankingList.length > 0 && rankingList[0].isOurCompany ? 'Líder absoluto de la categoría' : `Seguidor de ${leaderCompany?.name || 'Mercado'} (${leaderCompany?.share || 0}%)`}</strong>.
              </span>
            </div>
          </div>

        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
          
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Price Gap vs Competidores</h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                  Brecha porcentual de precio unitario por producto frente al promedio del mercado
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.65rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#34d399' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }} />
                  Más Competitivo (-%)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#f43f5e' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f43f5e' }} />
                  Más Caro / Premium (+%)
                </span>
              </div>
            </div>
            
            <div className="chart-container" style={{ height: '180px', minHeight: '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priceGap.slice(0, 12)} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="shortLabel" stroke="#475569" tick={{fill: '#38bdf8', fontSize: 10, fontWeight: '600'}} interval={0} />
                  <YAxis stroke="#475569" tick={{fill: '#94a3b8', fontSize: 9}} tickFormatter={(val) => `${val}%`} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.75rem', color: '#f8fafc', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}>
                            <p style={{ margin: 0, fontWeight: '700', color: '#38bdf8', fontSize: '0.8rem' }}>{data.productName || data.label}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
                              <span style={{ color: data.gap > 0 ? '#f43f5e' : '#34d399', fontWeight: '700', fontSize: '0.85rem' }}>
                                {data.gap > 0 ? `+${data.gap}%` : `${data.gap}%`}
                              </span>
                              <span style={{ color: '#64748b', fontSize: '0.7rem' }}>vs Promedio Mercado</span>
                            </div>
                            {data.unitPrice > 0 && (
                              <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.7rem' }}>
                                Precio Unitario: <strong style={{ color: '#cbd5e1' }}>₲ {data.unitPrice.toLocaleString('es-PY')}</strong>
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="gap" radius={[3, 3, 0, 0]}>
                    {priceGap.slice(0, 12).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.gap > 0 ? '#f43f5e' : '#34d399'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, minHeight: 0 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Detalle de Competitividad</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                Cuotas, brecha y estado estratégico por categoría
              </p>
            </div>
            
            <div className="table-wrapper custom-scrollbar" style={{ overflowY: 'auto', flex: 1, marginTop: '0.5rem' }}>
              <table className="custom-table" style={{ width: '100%', fontSize: '0.78rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.25rem', fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>Categoría</th>
                    <th style={{ textAlign: 'center', padding: '0.5rem 0.25rem', fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>Nuestra Cuota</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.25rem', fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>Líder de Categoría</th>
                    <th style={{ textAlign: 'center', padding: '0.5rem 0.25rem', fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>Price Gap Promedio</th>
                    <th style={{ textAlign: 'center', padding: '0.5rem 0.25rem', fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row) => {
                    const isLider = row.status === 'Líder';
                    return (
                      <tr key={row.category} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.25rem' }}>
                          {getCategoryIcon(row.category)}
                          <span style={{ fontWeight: '600' }}>{row.category}</span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '700', color: '#f8fafc', padding: '0.45rem 0.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                            <span>{row.ourShare}%</span>
                            {row.trend === 'up' ? <TrendingUp size={11} style={{ color: '#34d399' }} /> : <TrendingDown size={11} style={{ color: '#f43f5e' }} />}
                          </div>
                        </td>
                        <td style={{ textAlign: 'left', color: isLider ? '#38bdf8' : '#cbd5e1', fontWeight: isLider ? '600' : '400', padding: '0.45rem 0.25rem' }}>
                          {row.leaderShare}
                        </td>
                        <td style={{ textAlign: 'center', padding: '0.45rem 0.25rem' }}>
                          <span style={{
                            color: row.priceGap > 0 ? '#f43f5e' : '#34d399',
                            background: row.priceGap > 0 ? 'rgba(244,63,94,0.08)' : 'rgba(52,211,153,0.08)',
                            padding: '0.15rem 0.4rem',
                            borderRadius: '5px',
                            fontWeight: '700',
                            fontSize: '0.72rem'
                          }}>
                            {row.priceGap > 0 ? `+${row.priceGap}%` : `${row.priceGap}%`}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', padding: '0.45rem 0.25rem' }}>
                          <span style={{
                            background: isLider ? 'rgba(56,189,248,0.08)' : 'rgba(148,163,184,0.08)',
                            color: isLider ? '#38bdf8' : '#94a3b8',
                            border: `1px solid ${isLider ? 'rgba(56,189,248,0.15)' : 'rgba(148,163,184,0.15)'}`,
                            padding: '0.1rem 0.45rem',
                            borderRadius: '10px',
                            fontSize: '0.68rem',
                            fontWeight: '600'
                          }}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default MarketView;
