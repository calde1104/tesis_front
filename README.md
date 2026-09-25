# tesis_front — Interfaz web de la Plataforma de Inteligencia Predictiva B2B

Aplicación de página única (SPA) del Proyecto Final de Ingeniería (UADE). Es el tablero que usan las organizaciones cliente para consultar sus ventas, proyecciones de demanda y posición de mercado. Consume la API REST de `tesis_back`, que a su vez orquesta el microservicio de IA (`tesis_ia`).

## Tecnologías

React 19 · Vite 8 · React Router 7 · Recharts (gráficos) · lucide-react (iconos) · Vitest y Testing Library (pruebas). El servidor de producción es Nginx.

## Pantallas

La aplicación tiene dos rutas: `/login` y `/dashboard`. Dentro del tablero, el menú lateral cambia entre estas vistas (`src/pages/Dashboard/views/`):

| Vista | Contenido |
|---|---|
| **Inicio** | KPI, evolución de ventas con proyección, cuota de mercado y variables de contexto |
| **Ventas** | Historial transaccional con filtros en cascada, tabla ordenable y exportación a CSV |
| **Proyecciones** | Proyección a 12 meses por producto y simulador *what-if* (precio, tipo de cambio, IPC) |
| **Pre-lanzamiento** | Estimación de demanda de un producto nuevo sin historial (arranque en frío) |
| **Mercado** | *Market share*, brecha de precio y competitividad |
| **Ingesta de datos** | Carga de archivos de ventas `.csv` y `.xlsx`, historial de cargas y verificación de integridad |
| **Umbrales por SKU** | Configuración de alertas de demanda por producto |
| **Información del sistema** | Estado del sistema y del modelo predictivo |

## Estructura

```text
src/
├── App.jsx                # Rutas
├── pages/
│   ├── Login/             # Autenticación
│   └── Dashboard/         # Contenedor del tablero y sus vistas
├── services/              # Cliente HTTP y acceso a cada dominio de la API
│   ├── api.js             # apiRequest(): agrega el JWT y resuelve el id de empresa
│   └── auth, sales, forecast, marketShare, coldStart, ingestion, settings, notificaciones, profile
├── utils/                 # Saneamiento de entradas y utilidades de plataforma
└── test/                  # Configuración de las pruebas
```

## Comunicación con la API

Todas las llamadas usan rutas relativas `/v1/...` con el token JWT en el encabezado `Authorization`. La base se toma de `VITE_API_BASE_URL` y, si no está definida, se usa el mismo origen:

- **Desarrollo:** el servidor de Vite reenvía `/v1` a la API remota (`vite.config.js`).
- **Producción:** Nginx reenvía `/v1/` al servicio `api` del backend en el puerto 5000 (`nginx.conf`).

## Ejecución

Requisitos: Node.js 22 o superior para ejecutar las pruebas (`jsdom` y `vitest` no admiten Node 20); para compilar alcanza con Node 20.19 o superior.

```bash
npm ci
npm run dev            # servidor de desarrollo
npm run build          # compilación de producción (dist/)
npm run lint
```

### Docker

```bash
docker compose up --build      # sirve la aplicación en el puerto 3000
```

La imagen se construye en dos etapas (`node:20-slim` para compilar y `nginx:alpine` para servir) y se conecta a la red externa `tesis-network`.

## Pruebas

```bash
npm test                # 424 pruebas
npm run test:coverage   # con informe de cobertura
```

La suite cubre la capa de servicios (96 % de sentencias), las utilidades de seguridad (100 %), el inicio de sesión y las vistas del tablero (71,9 % de sentencias en total). Las pruebas de las vistas mockean la capa de servicios.

## Integración y despliegue continuos

El flujo `.github/workflows/deploy.yml` se ejecuta en cada *push* y *pull request* hacia `main`:

1. `test`: instala dependencias y corre la suite (Node 22).
2. `build`: verifica la compilación de producción (Node 20).
3. `deploy` (solo en *push*, y únicamente si los dos anteriores pasan): invoca el *webhook* de Portainer, que reconstruye y reemplaza el contenedor en el VPS.

Requiere el secreto `PORTAINER_WEBHOOK` en el repositorio.

## Autores

Edgardo Crespo y Felipe Calderón.
