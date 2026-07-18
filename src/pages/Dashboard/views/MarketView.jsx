import { useState, useEffect } from 'react';
import { Loader2, Award, DollarSign, Activity, Building2, TrendingUp, TrendingDown, GlassWater, Utensils, Droplet, Folder } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { getMarketShareOverview, getPriceGap } from '../../../services/marketShare';
import { getSalesFilters } from '../../../services/sales';

const deptBrands = {
  'Alimentos': ['Vicentin', 'Molinos', 'Arcor', 'Otros'],
  'Bebidas': ['Quilmes', 'Coca-Cola', 'Otros'],
  'Limpieza': ['Unilever', 'Otros'],
  'Cuidado Personal': ['Unilever']
};

const categoryBrands = {
  'Aceites': ['Vicentin', 'Otros'],
  'Fideos': ['Molinos', 'Otros'],
  'Arroz': ['Molinos', 'Otros'],
  'Salsas': ['Arcor', 'Otros'],
  'Cervezas': ['Quilmes', 'Otros'],
  'Vinos': ['Otros'],
  'Gaseosas': ['Coca-Cola', 'Otros'],
  'Aguas': ['Coca-Cola', 'Otros'],
  'Jabón Líquido': ['Unilever'],
  'Suavizantes': ['Unilever'],
  'Desinfectantes': ['Unilever'],
  'Limpiadores Multiuso': ['Otros']
};

const categoryDept = {
  'Aceites': 'Alimentos', 'Fideos': 'Alimentos', 'Arroz': 'Alimentos', 'Salsas': 'Alimentos', 'Lácteos': 'Alimentos', 'Fiambres': 'Alimentos', 'Carnes': 'Alimentos',
  'Cervezas': 'Bebidas', 'Vinos': 'Bebidas', 'Aperitivos': 'Bebidas', 'Gaseosas': 'Bebidas', 'Aguas': 'Bebidas', 'Jugos': 'Bebidas',
  'Jabón Líquido': 'Limpieza', 'Suavizantes': 'Limpieza', 'Desinfectantes': 'Limpieza', 'Limpiadores Multiuso': 'Limpieza',
  'Cabello': 'Cuidado Personal', 'Higiene': 'Cuidado Personal', 'Oral': 'Cuidado Personal'
};

const getCategoryIcon = (catName) => {
  const name = catName ? catName.toLowerCase() : '';
  if (name.includes('aceite') || name.includes('fideo') || name.includes('arroz') || name.includes('salsa') || name.includes('almacen')) {
    return <Utensils size={13} style={{ color: '#fb923c' }} />;
  }
  if (name.includes('cerveza') || name.includes('vino') || name.includes('gaseosa') || name.includes('agua') || name.includes('bebida')) {
    return <GlassWater size={13} style={{ color: '#38bdf8' }} />;
  }
  if (name.includes('jabón') || name.includes('desinfectante') || name.includes('suavizante') || name.includes('limpieza')) {
    return <Droplet size={13} style={{ color: '#2dd4bf' }} />;
  }
  return <Folder size={13} style={{ color: '#94a3b8' }} />;
};

const marketCompetitivenessData = [
  { category: 'Aceites', ourShare: 33.5, leaderShare: 'Nuestra Empresa', priceGap: -3.8, status: 'Líder', trend: 'up' },
  { category: 'Fideos', ourShare: 28.0, leaderShare: 'Competidor A (31.2%)', priceGap: 5.2, status: 'Seguidor', trend: 'stable' },
  { category: 'Arroz', ourShare: 36.5, leaderShare: 'Nuestra Empresa', priceGap: -6.5, status: 'Líder', trend: 'up' },
  { category: 'Salsas', ourShare: 22.4, leaderShare: 'Competidor B (29.0%)', priceGap: 8.4, status: 'Desafiante', trend: 'down' },
  { category: 'Cervezas', ourShare: 42.0, leaderShare: 'Nuestra Empresa', priceGap: -1.2, status: 'Líder', trend: 'up' },
  { category: 'Vinos', ourShare: 19.8, leaderShare: 'Competidor A (34.0%)', priceGap: 12.0, status: 'Seguidor', trend: 'down' },
  { category: 'Gaseosas', ourShare: 34.5, leaderShare: 'Nuestra Empresa', priceGap: 2.5, status: 'Líder', trend: 'stable' },
  { category: 'Aguas', ourShare: 31.0, leaderShare: 'Competidor A (33.5%)', priceGap: -1.5, status: 'Desafiante', trend: 'up' }
];

const CustomSelect = ({ label, value, onChange, options, placeholder, direction = 'down' }) => {
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
          transition: 'all 0.2s ease',
          userSelect: 'none',
          boxShadow: isOpen ? '0 0 12px rgba(14, 165, 233, 0.45)' : 'none'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedOptionLabel}</span>
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
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange({ target: { value: opt.value } });
                setIsOpen(false);
              }}
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.82rem',
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

const MarketView = () => {
  const [shareData, setShareData] = useState([]);
  const [priceGap, setPriceGap] = useState([]);
  const [loading, setLoading] = useState(true);

  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [filterOptions, setFilterOptions] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const [shareRes, priceRes, filtersRes] = await Promise.all([
        getMarketShareOverview(),
        getPriceGap(),
        getSalesFilters()
      ]);
      setShareData(shareRes);
      setPriceGap(priceRes);
      setFilterOptions(filtersRes);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleDepartmentChange = (e) => {
    const val = e.target.value;
    setDepartment(val);
    
    if (val && category) {
      const allowedCats = filterOptions?.categories[val] || [];
      if (!allowedCats.includes(category)) {
        setCategory('');
      }
    }
    
    if (val && brand) {
      const allowedBrands = deptBrands[val] || [];
      if (!allowedBrands.includes(brand)) {
        setBrand('');
      }
    }
  };

  const handleCategoryChange = (e) => {
    const val = e.target.value;
    setCategory(val);
    
    if (val) {
      const parentDept = categoryDept[val];
      if (parentDept) {
        setDepartment(parentDept);
      }
      
      if (brand) {
        const allowedBrands = categoryBrands[val] || [];
        if (!allowedBrands.includes(brand)) {
          setBrand('');
        }
      }
    }
  };

  const handleBrandChange = (e) => {
    const val = e.target.value;
    setBrand(val);
    
    if (val) {
      if (category) {
        const allowedBrands = categoryBrands[category] || [];
        if (!allowedBrands.includes(val)) {
          setCategory('');
        }
      }
      if (department) {
        const allowedBrands = deptBrands[department] || [];
        if (!allowedBrands.includes(val)) {
          setDepartment('');
        }
      }
    }
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
    ...(filterOptions?.brands?.filter(b => {
      if (category) {
        return (categoryBrands[category] || []).includes(b);
      }
      if (department) {
        return (deptBrands[department] || []).includes(b);
      }
      return true;
    }).map(b => ({ value: b, label: b })) || [])
  ];

  const getShareChartData = () => {
    if (!shareData || shareData.length === 0) return [];
    
    let multiplier = 1.0;
    if (category === 'Cervezas') multiplier = 1.22;
    else if (category === 'Vinos') multiplier = 0.57;
    else if (category === 'Gaseosas') multiplier = 1.0;
    else if (department === 'Alimentos') multiplier = 0.95;
    else if (department === 'Limpieza') multiplier = 1.30;
    
    if (brand === 'Coca-Cola') multiplier = 1.35;
    else if (brand === 'Molinos') multiplier = 1.15;
    
    return shareData.map(item => ({
      month: item.month,
      'Nuestra Empresa': Math.min(65, parseFloat((item['Nuestra Empresa'] * multiplier).toFixed(1))),
      'Competidor A': Math.max(8, parseFloat((item['Competidor A'] * (2 - multiplier)).toFixed(1))),
      'Competidor B': parseFloat((item['Competidor B'] * 0.9).toFixed(1)),
      'Otros': parseFloat((item['Otros'] * 0.95).toFixed(1))
    }));
  };

  const getPriceGapChartData = () => {
    if (category) {
      return [
        { category: 'Nosotros', gap: 0 },
        { category: 'Comp. A', gap: category === 'Gaseosas' ? -4.2 : 5.8 },
        { category: 'Comp. B', gap: category === 'Gaseosas' ? -10.5 : -3.4 },
        { category: 'Otros', gap: -8.0 }
      ];
    }
    if (department) {
      const allowedCats = {
        'Alimentos': ['Aceites', 'Fideos', 'Arroz', 'Salsas'],
        'Bebidas': ['Cervezas', 'Vinos', 'Gaseosas', 'Aguas'],
        'Limpieza': ['Jabón Líquido', 'Suavizantes', 'Desinfectantes'],
        'Cuidado Personal': []
      }[department] || [];
      return priceGap.filter(item => allowedCats.includes(item.category));
    }
    return priceGap;
  };

  const getCompetitivenessTableData = () => {
    if (category) {
      if (category === 'Gaseosas') {
        return [
          { name: 'Coca-Cola (Nosotros)', ourShare: 34.5, leaderShare: 'Nuestra Empresa', priceGap: 2.5, status: 'Líder', trend: 'stable', isBrand: true },
          { name: 'Competidor A (Pepsi)', ourShare: 28.0, leaderShare: 'Nuestra Empresa', priceGap: -1.8, status: 'Desafiante', trend: 'up', isBrand: true },
          { name: 'Competidor B (Manaos)', ourShare: 20.5, leaderShare: 'Nuestra Empresa', priceGap: -10.5, status: 'Seguidor', trend: 'down', isBrand: true },
          { name: 'Otros', ourShare: 17.0, leaderShare: 'Nuestra Empresa', priceGap: -12.4, status: 'Seguidor', trend: 'stable', isBrand: true }
        ];
      }
      if (category === 'Aceites') {
        return [
          { name: 'Nuestra Empresa (Natura)', ourShare: 33.5, leaderShare: 'Nuestra Empresa', priceGap: -3.8, status: 'Líder', trend: 'up', isBrand: true },
          { name: 'Competidor A (Cañuelas)', ourShare: 31.0, leaderShare: 'Nuestra Empresa', priceGap: 2.5, status: 'Desafiante', trend: 'stable', isBrand: true },
          { name: 'Competidor B (Cocinero)', ourShare: 20.0, leaderShare: 'Nuestra Empresa', priceGap: 6.2, status: 'Seguidor', trend: 'down', isBrand: true },
          { name: 'Otros', ourShare: 15.5, leaderShare: 'Nuestra Empresa', priceGap: -8.0, status: 'Seguidor', trend: 'up', isBrand: true }
        ];
      }
      return [
        { name: 'Nuestra Empresa', ourShare: category === 'Arroz' ? 36.5 : category === 'Cervezas' ? 42.0 : 25.0, leaderShare: 'Nuestra Empresa', priceGap: -2.0, status: 'Líder', trend: 'up', isBrand: true },
        { name: 'Competidor A', ourShare: 30.0, leaderShare: 'Nuestra Empresa', priceGap: 4.5, status: 'Desafiante', trend: 'stable', isBrand: true },
        { name: 'Competidor B', ourShare: 25.0, leaderShare: 'Nuestra Empresa', priceGap: -6.0, status: 'Seguidor', trend: 'down', isBrand: true },
        { name: 'Otros', ourShare: 10.0, leaderShare: 'Nuestra Empresa', priceGap: -8.5, status: 'Seguidor', trend: 'stable', isBrand: true }
      ];
    }

    if (department) {
      const allowedCats = {
        'Alimentos': ['Aceites', 'Fideos', 'Arroz', 'Salsas'],
        'Bebidas': ['Cervezas', 'Vinos', 'Gaseosas', 'Aguas'],
        'Limpieza': ['Jabón Líquido', 'Suavizantes', 'Desinfectantes'],
        'Cuidado Personal': []
      }[department] || [];
      return marketCompetitivenessData.filter(item => allowedCats.includes(item.category));
    }
    return marketCompetitivenessData;
  };

  const getRankingData = () => {
    let base = [
      { name: 'Nuestra Empresa', share: 34.5, color: 'linear-gradient(90deg, #0284c7, #38bdf8)', icon: <Award size={14} style={{ color: '#38bdf8' }} /> },
      { name: 'Competidor A', share: 25.0, color: '#94a3b8', icon: <Building2 size={14} style={{ color: '#cbd5e1' }} /> },
      { name: 'Competidor B', share: 20.5, color: '#64748b', icon: <Building2 size={14} style={{ color: '#94a3b8' }} /> },
      { name: 'Otros', share: 20.0, color: '#475569', icon: null }
    ];

    if (category === 'Cervezas') {
      base = [
        { name: 'Nuestra Empresa', share: 42.0, color: 'linear-gradient(90deg, #0284c7, #38bdf8)', icon: <Award size={14} style={{ color: '#38bdf8' }} /> },
        { name: 'Competidor A (Quilmes)', share: 35.0, color: '#94a3b8', icon: <Building2 size={14} style={{ color: '#cbd5e1' }} /> },
        { name: 'Competidor B', share: 15.0, color: '#64748b', icon: <Building2 size={14} style={{ color: '#94a3b8' }} /> },
        { name: 'Otros', share: 8.0, color: '#475569', icon: null }
      ];
    } else if (category === 'Vinos') {
      base = [
        { name: 'Competidor A', share: 34.0, color: '#cbd5e1', icon: <Building2 size={14} style={{ color: '#cbd5e1' }} /> },
        { name: 'Competidor B', share: 25.0, color: '#94a3b8', icon: <Building2 size={14} style={{ color: '#94a3b8' }} /> },
        { name: 'Nuestra Empresa', share: 19.8, color: 'linear-gradient(90deg, #0284c7, #38bdf8)', icon: <Award size={14} style={{ color: '#38bdf8' }} /> },
        { name: 'Otros', share: 21.2, color: '#475569', icon: null }
      ];
    } else if (department === 'Limpieza') {
      base = [
        { name: 'Nuestra Empresa', share: 45.0, color: 'linear-gradient(90deg, #0284c7, #38bdf8)', icon: <Award size={14} style={{ color: '#38bdf8' }} /> },
        { name: 'Competidor A (Unilever)', share: 30.0, color: '#94a3b8', icon: <Building2 size={14} style={{ color: '#cbd5e1' }} /> },
        { name: 'Competidor B', share: 15.0, color: '#64748b', icon: <Building2 size={14} style={{ color: '#94a3b8' }} /> },
        { name: 'Otros', share: 10.0, color: '#475569', icon: null }
      ];
    }

    return base.sort((a, b) => b.share - a.share);
  };

  const getKPIValues = () => {
    const currentShareData = getShareChartData();
    const lastMonthData = currentShareData[currentShareData.length - 1] || {};
    const ourCurrentShare = lastMonthData['Nuestra Empresa'] || 34.5;
    
    let trend = 1.3;
    if (category === 'Cervezas') trend = 3.2;
    else if (category === 'Vinos') trend = -2.4;
    else if (department === 'Limpieza') trend = 4.1;

    return {
      share: ourCurrentShare,
      trend: trend
    };
  };

  if (loading) {
    return (
      <div className="view-loading">
        <Loader2 className="spinner" size={32} />
        <p>Cargando información competitiva del mercado...</p>
      </div>
    );
  }

  const kpis = getKPIValues();
  const currentShareChartData = getShareChartData();
  const currentPriceGapData = getPriceGapChartData();
  const currentTableData = getCompetitivenessTableData();
  const currentRankingData = getRankingData();

  return (
    <div className="view-container market-view" style={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      height: 'calc(100vh - 180px)',
      minHeight: '680px',
      padding: '0 0.5rem 0.5rem 0.5rem'
    }}>

      <div className="card filters-card" style={{ padding: '0.85rem 1.25rem', marginBottom: 0 }}>
        <div className="filters-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '1.5rem',
          alignItems: 'center'
        }}>
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
                <span style={{ fontSize: '1.45rem', fontWeight: '800', color: '#38bdf8', display: 'block', lineHeight: 1 }}>{kpis.share}%</span>
                <span style={{ fontSize: '0.68rem', color: kpis.trend >= 0 ? '#34d399' : '#f43f5e', display: 'flex', alignItems: 'center', gap: '0.15rem', justifyContent: 'flex-end', fontWeight: '600', marginTop: '0.25rem' }}>
                  {kpis.trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />} 
                  {kpis.trend >= 0 ? `+${kpis.trend}%` : `${kpis.trend}%`} este mes
                </span>
              </div>
            </div>
            
            <div className="chart-container" style={{ height: '180px', minHeight: '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={currentShareChartData} margin={{ top: 5, right: 5, left: -32, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="month" stroke="#475569" tick={{fill: '#64748b', fontSize: 9}} />
                  <YAxis stroke="#475569" tick={{fill: '#64748b', fontSize: 9}} domain={['auto', 'auto']} tickFormatter={(val) => `${val}%`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '8px', fontSize: '0.75rem' }}
                    labelStyle={{ color: '#f8fafc', fontWeight: '600' }}
                    itemStyle={{ color: '#cbd5e1' }}
                  />
                  <Line type="monotone" dataKey="Nuestra Empresa" stroke="#38bdf8" strokeWidth={3} dot={{ fill: '#38bdf8', r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="Competidor A" stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="Competidor B" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="Otros" stroke="#475569" strokeWidth={1} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.75rem', fontSize: '0.68rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#38bdf8', fontWeight: '600' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8' }} />
                Nuestra Empresa
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#cbd5e1' }}>
                <span style={{ width: '6px', height: '2px', borderTop: '2px dashed #cbd5e1' }} />
                Comp. A
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#94a3b8' }}>
                <span style={{ width: '6px', height: '2px', borderTop: '2px dashed #94a3b8' }} />
                Comp. B
              </span>
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, minHeight: 0 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Participación del Canal</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>Ranking consolidado de competidores en el mercado</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', marginTop: '0.5rem', flex: 1, justifyContent: 'center' }}>
              {currentRankingData.map((item, idx) => (
                <div key={item.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: item.name.includes('Nuestra') ? '700' : '400' }}>
                    <span style={{ color: item.name.includes('Nuestra') ? '#38bdf8' : '#cbd5e1', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {item.icon}
                      {item.name}
                    </span>
                    <span style={{ color: item.name.includes('Nuestra') ? '#f8fafc' : '#94a3b8', fontWeight: '600' }}>{item.share}%</span>
                  </div>
                  <div style={{ height: '5px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${item.share}%`, height: '100%', background: item.color, borderRadius: '3px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
          
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Price Gap vs Competidores</h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                  {category ? `Brecha de marcas dentro de ${category}` : 'Brecha porcentual por categoría de producto'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.65rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#34d399' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }} />
                  Más Competitivo
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#f43f5e' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f43f5e' }} />
                  Más Caro
                </span>
              </div>
            </div>
            
            <div className="chart-container" style={{ height: '180px', minHeight: '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentPriceGapData} margin={{ top: 5, right: 5, left: -32, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="category" stroke="#475569" tick={{fill: '#94a3b8', fontSize: 9}} />
                  <YAxis stroke="#475569" tick={{fill: '#94a3b8', fontSize: 9}} tickFormatter={(val) => `${val}%`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '8px', fontSize: '0.75rem' }}
                    labelStyle={{ color: '#f8fafc', fontWeight: '600' }}
                    itemStyle={{ color: '#f8fafc' }}
                    formatter={(value) => [`${value}%`, 'Brecha']}
                  />
                  <Bar dataKey="gap" radius={[3, 3, 0, 0]}>
                    {currentPriceGapData.map((entry, index) => (
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
                {category ? `Desglose de competidores para la categoría ${category}` : 'Cuotas, brecha y estado estratégico por categoría'}
              </p>
            </div>
            
            <div className="table-wrapper custom-scrollbar" style={{ overflowY: 'auto', flex: 1, marginTop: '0.5rem' }}>
              <table className="custom-table" style={{ width: '100%', fontSize: '0.78rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.25rem', fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>
                      {category ? 'Marca' : 'Categoría'}
                    </th>
                    <th style={{ textAlign: 'center', padding: '0.5rem 0.25rem', fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>
                      {category ? 'Cuota Marca' : 'Nuestra Cuota'}
                    </th>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.25rem', fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>
                      Líder de {category ? 'Categoría' : 'Categoría'}
                    </th>
                    <th style={{ textAlign: 'center', padding: '0.5rem 0.25rem', fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>Price Gap</th>
                    <th style={{ textAlign: 'center', padding: '0.5rem 0.25rem', fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTableData.map((row) => {
                    const isLider = row.status === 'Líder';
                    const isDesafiante = row.status === 'Desafiante';
                    const name = row.isBrand ? row.name : row.category;
                    const share = row.isBrand ? row.ourShare : row.ourShare;
                    return (
                      <tr key={name} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.25rem' }}>
                          {!row.isBrand && getCategoryIcon(name)}
                          {row.isBrand && <Building2 size={13} style={{ color: '#cbd5e1' }} />}
                          <span style={{ fontWeight: '600' }}>{name}</span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '700', color: '#f8fafc', padding: '0.45rem 0.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                            <span>{share}%</span>
                            {!row.isBrand && row.trend === 'up' && <TrendingUp size={11} style={{ color: '#34d399' }} />}
                            {!row.isBrand && row.trend === 'down' && <TrendingDown size={11} style={{ color: '#f43f5e' }} />}
                            {row.isBrand && row.trend === 'up' && <TrendingUp size={11} style={{ color: '#34d399' }} />}
                            {row.isBrand && row.trend === 'down' && <TrendingDown size={11} style={{ color: '#f43f5e' }} />}
                          </div>
                        </td>
                        <td style={{ textAlign: 'left', color: isLider ? '#38bdf8' : '#cbd5e1', fontWeight: isLider ? '600' : '400', padding: '0.45rem 0.25rem' }}>
                          {isLider ? (row.isBrand ? 'Nuestra Marca' : 'Nosotros') : row.leaderShare.split(' ')[0]}
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
                            background: isLider ? 'rgba(56,189,248,0.08)' : isDesafiante ? 'rgba(129,140,248,0.08)' : 'rgba(148,163,184,0.08)',
                            color: isLider ? '#38bdf8' : isDesafiante ? '#818cf8' : '#94a3b8',
                            border: `1px solid ${isLider ? 'rgba(56,189,248,0.15)' : isDesafiante ? 'rgba(129,140,248,0.15)' : 'rgba(148,163,184,0.15)'}`,
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
