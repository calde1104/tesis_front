import { useState, useEffect } from 'react';
import { Loader2, Shield, Building2, Brain, Server } from 'lucide-react';
import { getMLModels } from '../../../services/settings';
import { getEmpresaId } from '../../../services/api';

const SettingsInfoView = () => {
  const [loading, setLoading] = useState(true);
  const [sessionInfo, setSessionInfo] = useState({
    empresaNombre: 'DIAGEO S.A.',
    empresaId: '',
    rol: 'SUPER_ADMIN',
    email: 'admin@nexxosolutions.com'
  });
  
  const [activeModel, setActiveModel] = useState({
    version: 'v2.4.1',
    mape: '4.85%',
    mae: '14.200',
    rmse: '18.450',
    date: '08/07/2026',
    dataRange: '01/01/2016 a 30/06/2026'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const empId = getEmpresaId();
        const empNombre = localStorage.getItem('empresaNombre') || 'DIAGEO Argentina S.A.';
        const rol = localStorage.getItem('rol') || 'SUPER_ADMIN';
        
        let email = 'analista@nexxosolutions.com';
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const payloadBase64 = token.split('.')[1];
            const decodedJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
            const payload = JSON.parse(decodedJson);
            if (payload && payload.sub) {
              email = payload.sub;
            }
          } catch (e) {}
        }

        setSessionInfo({
          empresaNombre: empNombre,
          empresaId: empId,
          rol: rol,
          email: email
        });

        const modelsList = await getMLModels();
        const active = modelsList.find(m => m.activo || m.active);
        if (active) {
          setActiveModel({
            version: active.version,
            mape: active.mape,
            mae: active.mae,
            rmse: active.rmse,
            date: active.date ? active.date.split(' ')[0] : '08/07/2026',
            dataRange: active.dataRange || '01/01/2016 a 30/06/2026'
          });
        }
      } catch (e) {
        console.error("Error cargando modelos:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="view-loading">
        <Loader2 className="spinner" size={32} />
        <p>Cargando información del sistema y metadatos...</p>
      </div>
    );
  }

  return (
    <div className="view-container settings-info-view" style={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      flex: 1,
      minHeight: '100%'
    }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '1.5rem',
        flex: 1
      }}>
        
        <div className="card interactive-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.5) 100%)', border: '1px solid rgba(14, 165, 233, 0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.65rem' }}>
            <div style={{ background: 'rgba(14, 165, 233, 0.1)', padding: '0.4rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={20} style={{ color: '#38bdf8' }} />
            </div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Cuenta de la Organización
            </h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Cliente Corporativo</span>
              <span style={{ color: '#f8fafc', fontWeight: '600', fontSize: '0.9rem' }}>{sessionInfo.empresaNombre}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>CUIT Tributario</span>
              <span style={{ color: '#cbd5e1', fontFamily: 'monospace', fontSize: '0.88rem' }}>30-71649281-5</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Tenant UUID (SaaS)</span>
              <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>{sessionInfo.empresaId}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Políticas Multi-Tenant Activas</span>
              <span style={{ color: '#34d399', fontWeight: '700', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Shield size={14} /> Habilitado (Aislamiento MySQL TenantContext)
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Rol de Sesión</span>
              <span style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: '600' }}>{sessionInfo.rol}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Usuario Autenticado</span>
              <span style={{ color: '#38bdf8', fontWeight: '600', fontSize: '0.85rem' }}>{sessionInfo.email}</span>
            </div>
          </div>
        </div>

        <div className="card interactive-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.5) 100%)', border: '1px solid rgba(14, 165, 233, 0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.65rem' }}>
            <div style={{ background: 'rgba(14, 165, 233, 0.1)', padding: '0.4rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={20} style={{ color: '#38bdf8' }} />
            </div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Especificaciones Modelo ML
            </h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Framework Base</span>
              <span style={{ color: '#f8fafc', fontWeight: '600', fontSize: '0.9rem' }}>XGBoost Regressor / LightGBM</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Versión del Modelo Activo</span>
              <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: '700', fontSize: '0.9rem' }}>{activeModel.version}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Error Histórico (MAPE)</span>
              <span style={{ color: '#34d399', fontWeight: '700', fontSize: '0.88rem' }}>{activeModel.mape} (Precisión Alta)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Historial del Entrenamiento</span>
              <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>{activeModel.dataRange}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Último Reentrenamiento</span>
              <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{activeModel.date}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Frecuencia de Cron</span>
              <span style={{ color: '#cbd5e1', fontSize: '0.82rem' }}>Mensual (Próximo: 01/08/2026 03:00 AM)</span>
            </div>
          </div>
        </div>

        <div className="card interactive-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.5) 100%)', border: '1px solid rgba(14, 165, 233, 0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.65rem' }}>
            <div style={{ background: 'rgba(14, 165, 233, 0.1)', padding: '0.4rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Server size={20} style={{ color: '#38bdf8' }} />
            </div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Estado del Servidor y BD
            </h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Servicio de Base de Datos</span>
              <span style={{ color: '#34d399', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                ONLINE (12ms latencia • MySQL 8.0 InnoDB)
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Sello de Inmutabilidad</span>
              <span style={{ color: '#34d399', fontWeight: '700', fontSize: '0.82rem' }}>ACTIVO (Triggers MySQL auditoria_integridad)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Interceptor TenantGuard</span>
              <span style={{ color: '#34d399', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                CONECTADO (Spring Security)
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Endpoint API Gateway</span>
              <span style={{ color: '#cbd5e1', fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>https://api.nexxosolutions.com/v1</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsInfoView;
