
export const uploadFile = async (fileName, fileSize) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const taskId = 'task_ingest_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem(`file_info_${taskId}`, JSON.stringify({
        id: taskId,
        name: fileName,
        size: fileSize,
        date: new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'}),
        records: Math.floor(5000 + Math.random() * 20000)
      }));
      resolve({ taskId });
    }, 400);
  });
};

export const checkPipelineStatus = async (taskId) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const progressKey = `ingest_progress_${taskId}`;
      let progress = parseInt(sessionStorage.getItem(progressKey) || '0');
      
      let stage = 'VALIDATING';
      let stages = {
        validation: 'RUNNING',
        hashing: 'PENDING',
        insertion: 'PENDING'
      };

      if (progress < 100) {
        progress += 20; // 0 -> 20 -> 40 -> 60 -> 80 -> 100
        sessionStorage.setItem(progressKey, progress.toString());
      }

      if (progress >= 100) {
        stage = 'SUCCESS';
        stages = { validation: 'SUCCESS', hashing: 'SUCCESS', insertion: 'SUCCESS' };
        
        const rawFile = sessionStorage.getItem(`file_info_${taskId}`);
        if (rawFile) {
          const fileInfo = JSON.parse(rawFile);
          const history = JSON.parse(localStorage.getItem('ingestion_history') || '[]');
          // Verificar si no está ya
          if (!history.some(item => item.id === fileInfo.id)) {
            history.unshift({ ...fileInfo, status: 'SUCCESS' });
            localStorage.setItem('ingestion_history', JSON.stringify(history));
          }
        }
      } else if (progress >= 80) {
        stage = 'INSERTING';
        stages = { validation: 'SUCCESS', hashing: 'SUCCESS', insertion: 'RUNNING' };
      } else if (progress >= 40) {
        stage = 'HASHING';
        stages = { validation: 'SUCCESS', hashing: 'RUNNING', insertion: 'PENDING' };
      } else {
        stage = 'VALIDATING';
        stages = { validation: 'RUNNING', hashing: 'PENDING', insertion: 'PENDING' };
      }

      resolve({
        taskId,
        progress,
        stage,
        stages,
        status: progress >= 100 ? 'SUCCESS' : 'RUNNING'
      });
    }, 350);
  });
};

export const getIngestionHistory = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Intentar cargar de localStorage, si no inicializar con algunos registros
      let history = localStorage.getItem('ingestion_history');
      if (!history) {
        const initial = [
          { id: '1', name: 'ventas_semana_26.csv', size: 1048576, date: '04/07/2026 09:30', records: 12450, status: 'SUCCESS' },
          { id: '2', name: 'ventas_semana_25.csv', size: 1024000, date: '27/06/2026 10:15', records: 11980, status: 'SUCCESS' },
          { id: '3', name: 'ventas_semana_24_corrupto.csv', size: 512000, date: '20/06/2026 14:02', records: 0, status: 'FAILED' },
          { id: '4', name: 'ventas_semana_23.csv', size: 1085000, date: '13/06/2026 11:00', records: 13100, status: 'SUCCESS' }
        ];
        localStorage.setItem('ingestion_history', JSON.stringify(initial));
        history = JSON.stringify(initial);
      }
      resolve(JSON.parse(history));
    }, 300);
  });
};

export const getSystemHealth = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        dbLatency: Math.floor(12 + Math.random() * 8), // 12-20 ms
        computeLoad: Math.floor(35 + Math.random() * 15), // 35-50 %
        apiStatus: 'ONLINE'
      });
    }, 250);
  });
};

export const retryFailedIngestion = async (fileId) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const history = JSON.parse(localStorage.getItem('ingestion_history') || '[]');
      const updated = history.map(item => {
        if (item.id === fileId) {
          return { ...item, status: 'SUCCESS', records: 10800, name: item.name.replace('_corrupto', '') };
        }
        return item;
      });
      localStorage.setItem('ingestion_history', JSON.stringify(updated));
      resolve({ success: true });
    }, 500);
  });
};
