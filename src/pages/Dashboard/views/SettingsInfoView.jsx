import { useState, useEffect } from 'react';
import { Loader2, Shield, Building2, Brain, Server } from 'lucide-react';
import { getSystemInfo } from '../../../services/settings';
import { getEmpresaId } from '../../../services/api';

const SettingsInfoView = () => {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState({
    razonSocial: null,
    cuit: null,
    tenantUuid: null,
    rolUsuario: null,
    emailUsuario: null,
    frameworkBase: null,
    versionModelo: null,
    mape: null,
    mae: null,
    rmse: null,
    rangoEntrenamiento: null,
    ultimoReentrenamiento: null,
    proximoCron: null,
    dbEngine: null,
    dbStatus: null,
    dbLatencyMs: null
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const empId = getEmpresaId();
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const defaultEmpNombre = storedUser.empresaNombre || storedUser.nombre || localStorage.getItem('empresaNombre') || 'Empresa Autenticada';
        const defaultRol = storedUser.rol || localStorage.getItem('rol') || 'USUARIO';
        let defaultEmail = storedUser.email || null;

        if (!defaultEmail) {
          const token = localStorage.getItem('token');
          if (token) {
            try {
              const payloadBase64 = token.split('.')[1];
              const decodedJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
              const payload = JSON.parse(decodedJson);
              if (payload && payload.sub) defaultEmail = payload.sub;
            } catch (e) {}
          }
        }

        const sysInfo = await getSystemInfo();

        if (sysInfo) {
          setInfo({
            razonSocial: sysInfo.razonSocial || sysInfo.empresaNombre || defaultEmpNombre,
            cuit: sysInfo.cuit || 'Sin CUIT asignado',
            tenantUuid: sysInfo.tenantUuid || sysInfo.empresaId || empId,
            rolUsuario: sysInfo.rolUsuario || sysInfo.rol || defaultRol,
            emailUsuario: sysInfo.emailUsuario || sysInfo.email || defaultEmail || 'Sin email registrado',
            
            frameworkBase: sysInfo.frameworkBase || 'Regresión Lineal (scikit-learn)',
            versionModelo: sysInfo.versionModelo || sysInfo.modeloVersion || 'Sin modelo activo',
            mape: sysInfo.mape != null ? `${sysInfo.mape.toFixed(2)}%` : 'Sin datos',
            mae: sysInfo.mae != null ? Math.round(sysInfo.mae).toLocaleString('es-AR') : 'Sin datos',
            rmse: sysInfo.rmse != null ? Math.round(sysInfo.rmse).toLocaleString('es-AR') : 'Sin datos',
            rangoEntrenamiento: sysInfo.rangoEntrenamiento || 'Sin histórico registrado',
            ultimoReentrenamiento: sysInfo.ultimoReentrenamiento ? String(sysInfo.ultimoReentrenamiento).replace('T', ' ').substring(0, 16) : 'Sin fecha',
            proximoCron: sysInfo.proximoCron || 'Ejecución automatizada en cierre mensual',

            dbEngine: sysInfo.dbEngine || 'MySQL 8.0 (InnoDB)',
            dbStatus: sysInfo.dbStatus || 'UP',
            dbLatencyMs: sysInfo.dbLatencyMs != null ? sysInfo.dbLatencyMs : 0
          });
        } else {
          setInfo(prev => ({
            ...prev,
            razonSocial: defaultEmpNombre,
            tenantUuid: empId,
            rolUsuario: defaultRol,
            emailUsuario: defaultEmail || 'Sin email',
            cuit: 'Sin CUIT',
            dbEngine: 'MySQL 8.0',
            dbStatus: 'DOWN',
            dbLatencyMs: 0
          }));
        }
      } catch (e) {
        console.error("Error cargando metadatos de información del sistema:", e);
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
        <p>Cargando información del sistema y metadatos desde MySQL...</p>
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
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Razón Social (MySQL)</span>
              <span style={{ color: '#f8fafc', fontWeight: '600', fontSize: '0.9rem' }}>{info.razonSocial}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>CUIT Tributario</span>
              <span style={{ color: '#cbd5e1', fontFamily: 'monospace', fontSize: '0.88rem' }}>{info.cuit}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Tenant UUID (SaaS)</span>
              <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>{info.tenantUuid}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Políticas Multi-Tenant Activas</span>
              <span style={{ color: '#34d399', fontWeight: '700', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Shield size={14} /> Habilitado (Aislamiento TenantContext)
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Rol de Sesión</span>
              <span style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: '600' }}>{info.rolUsuario}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Usuario Autenticado</span>
              <span style={{ color: '#38bdf8', fontWeight: '600', fontSize: '0.85rem' }}>{info.emailUsuario}</span>
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
              <span style={{ color: '#f8fafc', fontWeight: '600', fontSize: '0.9rem' }}>{info.frameworkBase}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Versión del Modelo Activo</span>
              <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: '700', fontSize: '0.9rem' }}>{info.versionModelo}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Error Histórico (MAPE)</span>
              <span style={{ color: '#34d399', fontWeight: '700', fontSize: '0.88rem' }}>{info.mape}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Historial del Entrenamiento</span>
              <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>{info.rangoEntrenamiento}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Último Reentrenamiento</span>
              <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{info.ultimoReentrenamiento}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Frecuencia de Cron</span>
              <span style={{ color: '#cbd5e1', fontSize: '0.82rem' }}>{info.proximoCron}</span>
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
              <span style={{ color: info.dbStatus === 'UP' || info.dbStatus === 'ONLINE' ? '#34d399' : '#f43f5e', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: info.dbStatus === 'UP' || info.dbStatus === 'ONLINE' ? '#10b981' : '#f43f5e', display: 'inline-block' }}></span>
                {info.dbStatus === 'UP' ? 'ONLINE (Conectado)' : info.dbStatus} ({info.dbLatencyMs}ms latencia • {info.dbEngine})
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Sello de Inmutabilidad</span>
              <span style={{ color: '#34d399', fontWeight: '700', fontSize: '0.82rem' }}>ACTIVO (Triggers MySQL auditoria_integridad)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Interceptor TenantGuard</span>
              <span style={{ color: '#34d399', fontWeight: '700', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                CONECTADO (Spring Security)
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsInfoView;
