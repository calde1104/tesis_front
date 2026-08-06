import { useState, useEffect } from 'react';
import { Loader2, Award, Building2, TrendingUp, TrendingDown, GlassWater, Utensils, Droplet, Folder, X } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart as RechartsPie, Pie
} from 'recharts';
import { getMarketShareOverview, getPriceGap, getMarketShareComposition, getShareOfAssortment, getCategoriesSummary } from '../../../services/marketShare';
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
    <div className="filter-group" style={{ position: 'relative', zIndex: isOpen ? 9999 : 1 }} onClick={(e) => e.stopPropagation()}>
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
            background: 'rgba(15, 23, 42, 0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(14, 165, 233, 0.3)',
            borderRadius: '8px',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 10000,
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
  const [categoriesSummary, setCategoriesSummary] = useState([]);
  const [hoveredData, setHoveredData] = useState(null);
  const [showAllSoa, setShowAllSoa] = useState(false);
  const [soaComposition, setSoaComposition] = useState([]);
  const [soaValue, setSoaValue] = useState(null);
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

      const targetCategory = category || (brand && filterOptions?.brandCategories?.[brand]?.[0] ? filterOptions.brandCategories[brand][0] : '');
      const compFilters = { department, category: targetCategory, brand };

      const shareRes = await getMarketShareOverview({ department, category: targetCategory, brand, years, months });
      if (!isMounted) return;

      const validShareRes = Array.isArray(shareRes) ? shareRes : [];
      setShareData(validShareRes);
      if (validShareRes.length > 0) {
        const currentCatName = category || (brand ? 'Marca Filtrada' : 'General');
        setCategoryShares(prev => ({ ...prev, [currentCatName]: validShareRes[validShareRes.length - 1]['Nuestra Empresa'] }));
      }

      const numericYears = years ? years.map(y => Number(y)).filter(Boolean) : [];
      const numericMonths = months ? months.map(m => Number(m)).filter(Boolean) : [];

      const latestDataYear = validShareRes.length > 0 && validShareRes[validShareRes.length - 1].year
        ? validShareRes[validShareRes.length - 1].year
        : 2025;
      const latestDataMonth = validShareRes.length > 0 && validShareRes[validShareRes.length - 1].monthNum
        ? validShareRes[validShareRes.length - 1].monthNum
        : 12;

      const selYear = numericYears.length > 0 ? Math.max(...numericYears) : latestDataYear;
      const selMonth = numericMonths.length > 0 ? Math.max(...numericMonths) : latestDataMonth;

      const pPrice = getPriceGap({ department, category: targetCategory, brand, years, months }).then(res => {
        if (isMounted) {
          setPriceGap(res || []);
          if (res && res.length > 0) {
            const currentCatName = category || (brand ? 'Marca Filtrada' : 'General');
            const avgGap = parseFloat((res.reduce((acc, curr) => acc + curr.gap, 0) / res.length).toFixed(1));
            setCategoryPriceGaps(prev => ({ ...prev, [currentCatName]: avgGap }));
          }
        }
      });

      const pSoa = getShareOfAssortment(selYear, selMonth, compFilters).then(rawSoaData => {
        if (isMounted) {
          let soaCompRes = Array.isArray(rawSoaData) ? rawSoaData : [];
          let calculatedSoa = typeof rawSoaData === 'number' ? rawSoaData : null;

          const currentEmpresaId = getEmpresaId();
          const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
          const currentEmpresaNombre = storedUser.empresaNombre || storedUser.nombre || storedUser.empresa || 'A.G.DEHEZA';

          const isMatchingOurCompany = (entry) => {
            if (!entry) return false;
            if (entry.empresaId && String(entry.empresaId) === String(currentEmpresaId)) return true;
            if (!entry.name) return false;
            const entryUpper = entry.name.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const targetUpper = currentEmpresaNombre.toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (entryUpper === targetUpper) return true;
            if (entryUpper.includes('DEHEZA') && targetUpper.includes('DEHEZA')) return true;
            return false;
          };

          if (brand) {
            let ourEntry = soaCompRes.find(c => c.name && c.name.toUpperCase() === brand.toUpperCase());
            calculatedSoa = ourEntry ? ourEntry.share : 0;
          } else {
            let ourEntry = soaCompRes.find(isMatchingOurCompany);
            calculatedSoa = ourEntry ? ourEntry.share : 0;
          }

          setSoaComposition(soaCompRes);
          setSoaValue(calculatedSoa);
        }
      });

      const pComp = getMarketShareComposition(selYear, selMonth, { department, category: targetCategory }).then(res => {
        if (isMounted) {
          setComposition(Array.isArray(res) ? res : []);
        }
      });

      const pSummary = getCategoriesSummary(selYear, selMonth, department).then(res => {
        if (isMounted) {
          setCategoriesSummary(Array.isArray(res) ? res : []);
        }
      });

      await Promise.all([pPrice, pSoa, pComp, pSummary]);
      if (isMounted) {
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

  const departmentOptions = [
    { value: '', label: 'Todos los departamentos' },
    ...((category && filterOptions?.categories
      ? [Object.keys(filterOptions.categories).find(d => filterOptions.categories[d]?.includes(category))].filter(Boolean)
      : (brand && filterOptions?.brandDepartments?.[brand]
        ? filterOptions.brandDepartments[brand]
        : (filterOptions?.departments || [])
      )
    ).map(dept => ({ value: dept, label: dept })))
  ];

  const categoryOptions = [
    { value: '', label: 'Todas las categorías' },
    ...((brand && filterOptions?.brandCategories?.[brand]
      ? filterOptions.brandCategories[brand]
      : (department && filterOptions?.categories?.[department]
        ? filterOptions.categories[department]
        : (filterOptions ? Array.from(new Set(Object.values(filterOptions.categories).flat())) : [])
      )
    ).map(cat => ({ value: cat, label: cat })))
  ];

  const brandOptions = [
    { value: '', label: 'Todas las marcas' },
    ...((category && filterOptions?.categoryBrands?.[category]
      ? filterOptions.categoryBrands[category]
      : (department && filterOptions?.deptBrands?.[department]
        ? filterOptions.deptBrands[department]
        : (filterOptions?.brands || [])
      )
    ).map(b => ({ value: b, label: b })))
  ];

  const monthOptions = [
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
  ];

  const lastPoint = shareData.length > 0 ? shareData[shareData.length - 1] : null;
  const currentShare = lastPoint ? lastPoint['Nuestra Empresa'] : 0.63;
  const prevPoint = shareData.length > 1 ? shareData[shareData.length - 2] : null;
  const prevShare = prevPoint ? prevPoint['Nuestra Empresa'] : currentShare;
  const shareDiff = parseFloat((currentShare - prevShare).toFixed(2));

  const currentEmpresaId = getEmpresaId();
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentEmpresaNombre = storedUser.empresaNombre || storedUser.nombre || storedUser.empresa || 'A.G.DEHEZA';

  const rawSourceComp = soaComposition;
  
  const mappedComp = rawSourceComp.map((comp) => {
    const compName = comp.name || comp.brandName || comp.nombreMarca || comp.marcaNombre || 'Empresa Competidora';
    const isTarget = brand
      ? (compName.toUpperCase().trim() === brand.toUpperCase().trim())
      : ((comp.empresaId && String(comp.empresaId) === String(currentEmpresaId)) ||
         (compName.toUpperCase().trim() === currentEmpresaNombre.toUpperCase().trim()) ||
         comp.isOurCompany);
    return {
      empresaId: comp.empresaId,
      name: compName,
      share: comp.share !== undefined ? comp.share : 0,
      isOurCompany: Boolean(isTarget)
    };
  });

  const compMap = new Map();
  mappedComp.forEach(item => {
    const normKey = item.name.toUpperCase().trim();
    if (compMap.has(normKey)) {
      const existing = compMap.get(normKey);
      if (item.isOurCompany) existing.isOurCompany = true;
      existing.share = Math.max(existing.share, item.share);
    } else {
      compMap.set(normKey, { ...item });
    }
  });

  const fullNaturalList = Array.from(compMap.values())
    .sort((a, b) => b.share - a.share)
    .map((comp, idx) => {
      const brandDisplayName = (brand && comp.isOurCompany) ? brand : comp.name;
      return {
        ...comp,
        displayName: brandDisplayName,
        rankPosition: idx + 1,
        color: comp.isOurCompany ? 'linear-gradient(90deg, #0284c7, #38bdf8)' : idx === 0 ? '#94a3b8' : '#64748b',
        icon: comp.isOurCompany ? <Award size={14} style={{ color: '#38bdf8' }} /> : <Building2 size={14} style={{ color: '#cbd5e1' }} />
      };
    });

  // Asegurar que nuestra empresa esté en la lista si no vino en el backend
  const hasOurComp = fullNaturalList.some(c => c.isOurCompany);
  if (!hasOurComp && fullNaturalList.length > 0) {
    const targetName = brand || currentEmpresaNombre;
    fullNaturalList.push({
      empresaId: currentEmpresaId,
      name: targetName,
      displayName: targetName,
      share: soaValue || 0,
      isOurCompany: true,
      rankPosition: fullNaturalList.length + 1,
      color: 'linear-gradient(90deg, #0284c7, #38bdf8)',
      icon: <Award size={14} style={{ color: '#38bdf8' }} />
    });
  }

  const rankingList = fullNaturalList;

  const activeCategories = category 
    ? [category] 
    : (brand && filterOptions?.brandCategories?.[brand]
        ? filterOptions.brandCategories[brand]
        : (filterOptions && filterOptions.categories
            ? (department ? (filterOptions.categories[department] || []) : Array.from(new Set(Object.values(filterOptions.categories).flat())))
            : []));

  const leaderCompany = rankingList.length > 0 ? rankingList[0] : null;

  const somLeader = composition && composition.length > 0 
    ? [...composition].sort((a, b) => b.share - a.share)[0] 
    : null;

  const summaryForActive = (categoriesSummary && categoriesSummary.length > 0)
    ? categoriesSummary.filter(cs => activeCategories.length === 0 || activeCategories.includes(cs.categoria))
    : [];

  const tableData = (summaryForActive.length > 0)
    ? summaryForActive.map(catSumm => {
        const cat = catSumm.categoria;
        const leader = catSumm.rankingCompetencia && catSumm.rankingCompetencia.length > 0 
          ? catSumm.rankingCompetencia[0] 
          : null;
        
        const isLider = leader ? catSumm.nuestraCuota >= leader.cuota : true;
        
        const defaultAvgGap = Array.isArray(priceGap) && priceGap.length > 0 
          ? parseFloat((priceGap.reduce((acc, curr) => acc + curr.gap, 0) / priceGap.length).toFixed(1))
          : 0;
        const rowGap = categoryPriceGaps[cat] !== undefined ? categoryPriceGaps[cat] : defaultAvgGap;

        const formattedOurShare = catSumm.nuestraCuota !== null ? parseFloat(Number(catSumm.nuestraCuota).toFixed(2)) : '-';
        const formattedLeaderCuota = leader && leader.cuota !== undefined && leader.cuota !== null ? parseFloat(Number(leader.cuota).toFixed(2)) : 0;

        return {
          category: cat,
          ourShare: formattedOurShare,
          leaderShare: leader 
            ? (isLider ? `${currentEmpresaNombre} (${formattedOurShare}%)` : `${leader.empresaNombre} (${formattedLeaderCuota}%)`)
            : 'Sin datos',
          priceGap: rowGap !== null ? rowGap : '-',
          status: isLider ? 'Líder' : 'Seguidor',
          trend: 'none',
          composition: (catSumm.rankingCompetencia || []).map(item => ({
            empresaNombre: item.empresaNombre || item.name || 'Empresa',
            cuota: Number(item.cuota !== undefined ? item.cuota : item.share) || 0
          }))
        };
      })
    : activeCategories.map((cat) => {
        const isCurrentFilter = category === cat || (brand && filterOptions?.brandCategories?.[brand]?.includes(cat));
        const hasRealData = categoryShares[cat] !== undefined || (isCurrentFilter && activeCategories.length === 1);

        const rawRowShare = hasRealData ? (categoryShares[cat] !== undefined ? categoryShares[cat] : currentShare) : null;
        const rowShare = rawRowShare !== null ? parseFloat(Number(rawRowShare).toFixed(2)) : null;
        
        const rawSomLeaderShare = somLeader && somLeader.share !== undefined ? parseFloat(Number(somLeader.share).toFixed(2)) : 0;
        const isLider = hasRealData && somLeader ? ((somLeader.empresaId && somLeader.empresaId === currentEmpresaId) || rowShare >= rawSomLeaderShare) : false;

        const defaultAvgGap = Array.isArray(priceGap) && priceGap.length > 0 
          ? parseFloat((priceGap.reduce((acc, curr) => acc + curr.gap, 0) / priceGap.length).toFixed(1))
          : 0;
        const rowGap = hasRealData ? (categoryPriceGaps[cat] !== undefined ? categoryPriceGaps[cat] : defaultAvgGap) : null;

        return {
          category: cat,
          ourShare: rowShare !== null ? rowShare : '-',
          leaderShare: hasRealData && somLeader
            ? (isLider 
              ? `${currentEmpresaNombre} (${rowShare}%)` 
              : (somLeader.name ? `${somLeader.name} (${rawSomLeaderShare}%)` : 'Sin datos'))
            : 'Ver Detalles',
          priceGap: rowGap !== null ? rowGap : '-',
          status: hasRealData ? (isLider ? 'Líder' : 'Seguidor') : '-',
          trend: hasRealData ? (shareDiff >= 0 ? 'up' : 'down') : 'none',
          composition: (composition || []).map(item => ({
            empresaNombre: item.empresaNombre || item.name || 'Empresa',
            cuota: Number(item.cuota !== undefined ? item.cuota : item.share) || 0
          }))
        };
      });

  return (
    <div className="view-container market-view" style={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: '0.65rem',
      height: 'calc(100vh - 120px)',
      maxHeight: 'calc(100vh - 120px)',
      overflow: 'hidden',
      padding: '0 0.25rem 0.25rem 0.25rem'
    }}>

      <div className="card filters-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.6rem 1rem', marginBottom: 0, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '0.82rem', color: '#f8fafc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Filtros de Búsqueda</h3>
          {(department || category || brand || years.length > 0 || months.length > 0) && (
            <button 
              className="btn-secondary" 
              onClick={handleClearFilters}
              style={{
                padding: '0.2rem 0.5rem',
                fontSize: '0.72rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                borderRadius: '5px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <X size={12} /> Limpiar Filtros
            </button>
          )}
        </div>
        <div className="filters-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(5, 1fr)', 
          gap: '0.75rem',
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
            options={monthOptions}
          />
          <CustomSelect
            label="Departamento"
            value={department}
            onChange={handleDepartmentChange}
            placeholder="Todos los departamentos"
            options={departmentOptions}
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

      {loading ? (
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: '#94a3b8' }}>
          <Loader2 className="spinner" size={28} style={{ animation: 'spin 1s linear infinite', color: '#38bdf8', marginBottom: '0.75rem' }} />
          <p style={{ margin: 0, fontSize: '0.85rem' }}>Cargando información competitiva del mercado...</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid',
          gridTemplateRows: '1.15fr 0.85fr', 
          gap: '0.65rem',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden'
        }}>
        
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', minHeight: 0 }}>
            
            <div className="card" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', height: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.88rem', color: '#f8fafc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Cuota de Mercado (SOM)</h3>
                  <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.68rem', color: '#64748b' }}>
                    {category ? `Categoría: ${category}` : department ? `Departamento: ${department}` : 'Evolución histórica consolidada de la empresa'}
                    {(years.length > 0 || months.length > 0) && (
                      <span style={{ color: '#38bdf8', marginLeft: '0.3rem', fontWeight: '600' }}>
                        • {years.length > 0 ? `Año: ${years.join(', ')}` : ''} {months.length > 0 ? `Mes: ${months.map(m => monthOptions.find(opt => opt.value === m)?.label || m).join(', ')}` : ''}
                      </span>
                    )}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#38bdf8', display: 'block', lineHeight: 1 }}>{currentShare}%</span>
                  <span style={{ fontSize: '0.62rem', color: shareDiff >= 0 ? '#34d399' : '#f43f5e', display: 'flex', alignItems: 'center', gap: '0.15rem', justifyContent: 'flex-end', fontWeight: '600', marginTop: '0.15rem' }}>
                    {shareDiff >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />} 
                    {shareDiff >= 0 ? `+${shareDiff}%` : `${shareDiff}%`} vs mes anterior
                  </span>
                </div>
              </div>
              
              <div className="chart-container" style={{ flex: 1, minHeight: '120px', height: '135px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={shareData} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="month" stroke="#475569" tick={{fill: '#64748b', fontSize: 8}} />
                    <YAxis stroke="#475569" tick={{fill: '#64748b', fontSize: 8}} domain={['auto', 'auto']} tickFormatter={(val) => `${val}%`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '6px', fontSize: '0.7rem' }}
                      labelStyle={{ color: '#f8fafc', fontWeight: '600' }}
                      itemStyle={{ color: '#38bdf8' }}
                      formatter={(val) => [`${val}%`, 'Cuota de Mercado']}
                    />
                    <Line type="monotone" dataKey="Nuestra Empresa" stroke="#38bdf8" strokeWidth={2.5} dot={{ fill: '#38bdf8', r: 2.5 }} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.4rem', fontSize: '0.65rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#38bdf8', fontWeight: '600' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#38bdf8' }} />
                  Nuestra Empresa ({currentEmpresaNombre})
                </span>
              </div>
            </div>

            <div className="card" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', height: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.88rem', color: '#f8fafc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {brand ? 'Share of Assortment por Marca (SOA)' : 'Share of Assortment (SOA)'}
                  </h3>
                  <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.68rem', color: '#64748b' }}>
                    {brand ? 'Referencias activas (SKUs) por marca en el catálogo del mercado' : 'Referencias activas (SKUs) en el catálogo del mercado'}
                  </p>
                  <div style={{ marginTop: '0.2rem', fontSize: '0.65rem', display: 'flex', alignItems: 'center' }}>
                    <span style={{ 
                      background: 'rgba(56, 189, 248, 0.1)', 
                      color: '#38bdf8', 
                      border: '1px solid rgba(56, 189, 248, 0.25)', 
                      borderRadius: '4px', 
                      padding: '0.1rem 0.4rem',
                      fontWeight: '600'
                    }}>
                      {(() => {
                        const monthLabel = months.length > 0
                          ? months.map(m => monthOptions.find(o => o.value.toString() === m.toString())?.label || `Mes ${m}`).join(', ')
                          : '';
                        const yearLabel = years.length > 0 ? years.join(', ') : '';
                        
                        const realLatestYear = shareData.length > 0 && shareData[shareData.length - 1].year
                          ? shareData[shareData.length - 1].year
                          : (filterOptions?.years && filterOptions.years.length > 0 
                              ? filterOptions.years[filterOptions.years.length - 1] 
                              : 2025);

                        if (monthLabel && yearLabel) {
                          return `Surtido en ${monthLabel} ${yearLabel}`;
                        } else if (monthLabel) {
                          return `Surtido en ${monthLabel} ${realLatestYear} (Último disponible)`;
                        } else if (yearLabel) {
                          return `Surtido promedio en ${yearLabel}`;
                        }
                        return `Snapshot más reciente (${realLatestYear})`;
                      })()}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#38bdf8', display: 'block', lineHeight: 1 }}>
                    {soaValue !== null ? `${soaValue}%` : '0%'}
                  </span>
                  <span style={{ fontSize: '0.62rem', color: '#94a3b8', display: 'block', marginTop: '0.15rem' }}>
                    Surtido ({brand || (category ? `${currentEmpresaNombre} en ${category}` : currentEmpresaNombre)})
                  </span>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.1rem', flex: 1, minHeight: 0, overflowY: 'auto' }} className="custom-scrollbar">
                {(() => {
                  const maxShare = Math.max(...rankingList.map(r => r.share || 0), 1);
                  
                  let displayedList = [];
                  if (showAllSoa) {
                    displayedList = rankingList;
                  } else {
                    // Modo colapsado (Top 5 con anclaje de conveniencia de nuestra empresa si no está en Top 5)
                    const top5 = rankingList.slice(0, 5);
                    const isOurInTop5 = top5.some(c => c.isOurCompany);
                    if (isOurInTop5 || rankingList.length <= 5) {
                      displayedList = top5;
                    } else {
                      const top4 = rankingList.slice(0, 4);
                      const ourEntry = rankingList.find(c => c.isOurCompany);
                      displayedList = ourEntry ? [...top4, ourEntry] : top5;
                    }
                  }

                  return (
                    <>
                      {displayedList.map((item, idx) => {
                        const barWidthPct = maxShare > 0 ? Math.min(100, (item.share / maxShare) * 100) : 0;
                        return (
                          <div 
                            key={`${item.name}-${idx}`} 
                            style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: '0.15rem',
                              padding: item.isOurCompany ? '0.25rem 0.45rem' : '0.15rem 0.35rem',
                              background: item.isOurCompany ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                              border: item.isOurCompany ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                              borderRadius: '5px',
                              boxShadow: item.isOurCompany ? '0 0 8px rgba(56, 189, 248, 0.12)' : 'none',
                              transition: 'all 0.3s ease'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: item.isOurCompany ? '700' : '400' }}>
                              <span style={{ color: item.isOurCompany ? '#38bdf8' : '#cbd5e1', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                {item.icon}
                                <span style={{ opacity: 0.6, fontSize: '0.65rem' }}>#{item.rankPosition}</span>
                                {item.displayName || item.name}
                              </span>
                              <span style={{ color: item.isOurCompany ? '#38bdf8' : '#94a3b8', fontWeight: item.isOurCompany ? '800' : '600' }}>{item.share}%</span>
                            </div>
                            <div style={{ height: item.isOurCompany ? '5px' : '3.5px', background: 'rgba(255,255,255,0.03)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${barWidthPct}%`, height: '100%', background: item.color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
                            </div>
                          </div>
                        );
                      })}

                      {rankingList.length > 5 && (
                        <button
                          onClick={() => setShowAllSoa(!showAllSoa)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#38bdf8',
                            fontSize: '0.65rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            padding: '0.2rem 0',
                            marginTop: '0.1rem',
                            textAlign: 'center',
                            transition: 'opacity 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.2rem'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        >
                          {showAllSoa ? 'Ver menos (Top 5)' : `Ver todos (${rankingList.length} en total) →`}
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>

              <div style={{
                marginTop: 'auto',
                background: 'rgba(14, 165, 233, 0.03)',
                border: '1px dashed rgba(14, 165, 233, 0.2)',
                borderRadius: '6px',
                padding: '0.4rem 0.6rem',
                fontSize: '0.65rem',
                color: '#cbd5e1',
                lineHeight: '1.3'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#38bdf8', fontWeight: '700', marginBottom: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.6rem' }}>
                  <Award size={11} />
                  Insight de Catálogo
                </div>
                <span>
                  SOA: <strong>{soaValue !== null ? `${soaValue}%` : 'N/D'}</strong>. Posición: <strong>{rankingList.length > 0 && rankingList[0].isOurCompany ? 'Líder absoluto' : `Seguidor de ${leaderCompany?.name || 'Mercado'}`}</strong>.
                </span>
              </div>
            </div>

          </div>

          <div className="market-grid-row">
            
            <div className="card" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', height: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.88rem', color: '#f8fafc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Variación de Precio por Producto (%)</h3>
                  <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.68rem', color: '#64748b' }}>
                    Variación porcentual vs período anterior
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.6rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#34d399' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34d399' }} />
                    Rebaja (-%)
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#64748b' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#64748b' }} />
                    Sin cambio (0%)
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#f43f5e' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#f43f5e' }} />
                    Aumento (+%)
                  </span>
                </div>
              </div>
              
              <div className="chart-container" style={{ flex: 1, minHeight: '110px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {priceGap && priceGap.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={priceGap.slice(0, 12)} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis dataKey="shortLabel" stroke="#475569" tick={{fill: '#38bdf8', fontSize: 9, fontWeight: '600'}} interval={0} />
                      <YAxis stroke="#475569" tick={{fill: '#94a3b8', fontSize: 8}} tickFormatter={(val) => `${val}%`} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const gapColor = data.gap > 0 ? '#f43f5e' : data.gap < 0 ? '#34d399' : '#94a3b8';
                            return (
                              <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem 0.7rem', borderRadius: '6px', fontSize: '0.7rem', color: '#f8fafc', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}>
                                <p style={{ margin: 0, fontWeight: '700', color: '#38bdf8', fontSize: '0.75rem' }}>{data.productName || data.label}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
                                  <span style={{ color: gapColor, fontWeight: '700', fontSize: '0.8rem' }}>
                                    {data.gap > 0 ? `+${data.gap}%` : `${data.gap}%`}
                                  </span>
                                  <span style={{ color: '#64748b', fontSize: '0.65rem' }}>
                                    {data.gap === 0 ? 'Sin cambio vs Período Anterior' : 'vs Período Anterior'}
                                  </span>
                                </div>
                                {data.unitPrice > 0 && (
                                  <p style={{ margin: '0.2rem 0 0 0', color: '#94a3b8', fontSize: '0.65rem' }}>
                                    Precio Unitario: <strong style={{ color: '#cbd5e1' }}>₲ {data.unitPrice.toLocaleString('es-PY')}</strong>
                                  </p>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="gap" minPointSize={2} radius={[2, 2, 0, 0]}>
                        {priceGap.slice(0, 12).map((entry, index) => {
                          const barFill = entry.gap > 0 ? '#f43f5e' : entry.gap < 0 ? '#34d399' : '#64748b';
                          return <Cell key={`cell-${index}`} fill={barFill} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ 
                    padding: '0.6rem 0.8rem', 
                    borderRadius: '6px', 
                    background: 'rgba(56, 189, 248, 0.04)', 
                    border: '1px dashed rgba(56, 189, 248, 0.2)', 
                    color: '#cbd5e1', 
                    fontSize: '0.7rem', 
                    textAlign: 'center', 
                    lineHeight: '1.4' 
                  }}>
                    <span style={{ color: '#38bdf8', fontWeight: '700', display: 'block', marginBottom: '0.2rem' }}>
                      Sin variación de precio calculable
                    </span>
                    Se requieren al menos 2 meses consecutivos de ventas por producto para comparar variaciones.
                  </div>
                )}
              </div>
            </div>

            <div className="card" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', height: '100%', boxSizing: 'border-box' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.88rem', color: '#f8fafc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Detalle de Competitividad</h3>
                <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.68rem', color: '#64748b' }}>
                  Cuotas por empresa, brecha y estado por categoría
                </p>
              </div>
              
              <div className="table-wrapper custom-scrollbar" style={{ overflowY: 'auto', flex: 1, maxHeight: '115px' }}>
                <table className="custom-table" style={{ width: '100%', fontSize: '0.72rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '0.3rem 0.2rem', fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase' }}>Categoría</th>
                      <th style={{ textAlign: 'center', padding: '0.3rem 0.2rem', fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase' }}>Cuota</th>
                      <th style={{ textAlign: 'left', padding: '0.3rem 0.2rem', fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase' }}>Líder</th>
                      <th style={{ textAlign: 'center', padding: '0.3rem 0.2rem', fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase' }}>Var. Precio</th>
                      <th style={{ textAlign: 'center', padding: '0.3rem 0.2rem', fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row) => {
                      const isLider = row.status === 'Líder';
                      return (
                        <tr 
                          key={row.category} 
                          style={{ 
                            borderBottom: '1px solid rgba(255,255,255,0.02)',
                            background: hoveredData?.category === row.category ? 'rgba(14, 165, 233, 0.05)' : 'transparent',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            const x = Math.max(10, Math.min(window.innerWidth - 340, e.clientX - 330));
                            const y = Math.max(10, Math.min(window.innerHeight - 260, e.clientY - 110));
                            setHoveredData({ category: row.category, composition: row.composition, x, y });
                          }}
                          onMouseMove={(e) => {
                            const x = Math.max(10, Math.min(window.innerWidth - 340, e.clientX - 330));
                            const y = Math.max(10, Math.min(window.innerHeight - 260, e.clientY - 110));
                            setHoveredData(prev => prev ? { ...prev, x, y } : null);
                          }}
                          onMouseLeave={() => setHoveredData(null)}
                        >
                          <td style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.2rem' }}>
                            {getCategoryIcon(row.category)}
                            <span style={{ fontWeight: '600', cursor: 'pointer', color: hoveredData?.category === row.category ? '#38bdf8' : 'inherit' }}>{row.category}</span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: '700', color: '#f8fafc', padding: '0.25rem 0.2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.15rem' }}>
                              <span>{row.ourShare}%</span>
                              {row.trend === 'up' ? <TrendingUp size={10} style={{ color: '#34d399' }} /> : (row.trend === 'down' ? <TrendingDown size={10} style={{ color: '#f43f5e' }} /> : null)}
                            </div>
                          </td>
                          <td style={{ textAlign: 'left', color: isLider ? '#38bdf8' : '#cbd5e1', fontWeight: isLider ? '600' : '400', padding: '0.25rem 0.2rem' }}>
                            {row.leaderShare}
                          </td>
                          <td style={{ textAlign: 'center', padding: '0.25rem 0.2rem' }}>
                            <span style={{
                              color: row.priceGap > 0 ? '#f43f5e' : (row.priceGap < 0 ? '#34d399' : '#64748b'),
                              background: row.priceGap > 0 ? 'rgba(244,63,94,0.08)' : (row.priceGap < 0 ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.05)'),
                              padding: '0.08rem 0.3rem',
                              borderRadius: '3px',
                              fontWeight: '700',
                              fontSize: '0.65rem'
                            }}>
                              {row.priceGap > 0 ? `+${row.priceGap}%` : `${row.priceGap}%`}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', padding: '0.25rem 0.2rem' }}>
                            <span style={{
                              background: isLider ? 'rgba(52, 211, 153, 0.1)' : 'rgba(56, 189, 248, 0.08)',
                              color: isLider ? '#34d399' : '#38bdf8',
                              border: `1px solid ${isLider ? 'rgba(52, 211, 153, 0.2)' : 'rgba(56, 189, 248, 0.15)'}`,
                              padding: '0.08rem 0.45rem',
                              borderRadius: '12px',
                              fontSize: '0.62rem',
                              fontWeight: '700'
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
      )}

      {hoveredData && hoveredData.composition && hoveredData.composition.length > 0 && (
        <div style={{
          position: 'fixed',
          top: `${hoveredData.y}px`,
          left: `${hoveredData.x}px`,
          zIndex: 999999,
          background: 'rgba(11, 15, 25, 0.98)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(14, 165, 233, 0.4)',
          borderRadius: '12px',
          padding: '0.85rem 1rem',
          width: '360px',
          minHeight: '220px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.85), 0 0 25px rgba(14, 165, 233, 0.2)',
          pointerEvents: 'none'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#38bdf8', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.04em' }}>
              Composición por Empresa - {hoveredData.category}
            </span>
            <span style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Participación</span>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '130px', height: '130px', flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={hoveredData.composition.slice(0, 5)}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="cuota"
                    stroke="none"
                  >
                    {hoveredData.composition.slice(0, 5).map((entry, index) => {
                      const distinctColors = ['#38bdf8', '#a855f7', '#fb923c', '#f43f5e', '#facc15'];
                      let fillColor = entry.empresaNombre && entry.empresaNombre.toUpperCase().includes(currentEmpresaNombre.toUpperCase())
                        ? '#34d399' // Verde esmeralda para nuestra empresa
                        : distinctColors[index % distinctColors.length];
                      return <Cell key={`cell-${index}`} fill={fillColor} />;
                    })}
                  </Pie>
                </RechartsPie>
              </ResponsiveContainer>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem', overflow: 'hidden' }}>
              {hoveredData.composition.slice(0, 5).map((entry, index) => {
                const distinctColors = ['#38bdf8', '#a855f7', '#fb923c', '#f43f5e', '#facc15'];
                const isOurComp = entry.empresaNombre && entry.empresaNombre.toUpperCase().includes(currentEmpresaNombre.toUpperCase());
                const color = isOurComp ? '#34d399' : distinctColors[index % distinctColors.length];

                const pctFormatted = parseFloat(Number(entry.cuota).toFixed(2));

                return (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ 
                        color: isOurComp ? '#34d399' : '#cbd5e1', 
                        fontWeight: isOurComp ? '700' : '500',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {entry.empresaNombre}
                      </span>
                    </div>
                    <span style={{ fontWeight: '700', color: isOurComp ? '#34d399' : '#f8fafc', flexShrink: 0 }}>
                      {pctFormatted}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MarketView;
