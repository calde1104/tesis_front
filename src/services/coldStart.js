import { apiRequest, getEmpresaId } from './api';
import { getBrandId, getCategoryId, getDeptId } from './sales';

/**
 * Servicio de Inferencia de Demanda para Productos Nuevos (Cold Start).
 * Consume el endpoint real del backend Spring Boot:
 * POST /v1/{empresaId}/cold-start/predict
 * que se comunica con el microservicio de IA en FastAPI (K-Means + KNN).
 */
export const predictColdStart = async (params = {}) => {
  const empresaId = getEmpresaId();

  let idDepartamento = params.idDepartamento ?? params.id_departamento;
  if (idDepartamento === undefined || idDepartamento === null || idDepartamento === '') {
    if (params.department) {
      idDepartamento = getDeptId(params.department);
    }
  }
  const parsedDeptId = Number(idDepartamento);

  let idCategoria = params.idCategoria ?? params.id_categoria;
  if (idCategoria === undefined || idCategoria === null || idCategoria === '') {
    if (params.category) {
      idCategoria = getCategoryId(params.category);
    }
  }
  const parsedCatId = Number(idCategoria);

  let idMarca = params.idMarca ?? params.id_marca;
  if (!idMarca && params.brand) {
    idMarca = getBrandId(params.brand);
  }
  if (!idMarca && params.brand) {
    idMarca = params.brand;
  }
  const parsedMarcaId = String(idMarca || '').trim();

  const descripcion = String(params.descripcion || params.name || 'Nuevo Producto').trim();
  const contenidoNeto = Number(params.contenidoNeto ?? params.weight ?? 1.0);
  let unidadMedida = String(params.unidadMedida ?? params.unit ?? 'lt').toLowerCase().trim();
  const valorUnitario = Number(params.valorUnitario ?? params.expectedPrice ?? 0);
  const horizonteMeses = Number(params.horizonteMeses ?? 12);

  if (unidadMedida === 'l') unidadMedida = 'lt';
  if (unidadMedida === 'g') unidadMedida = 'gr';

  if (isNaN(parsedDeptId) || parsedDeptId <= 0) {
    throw new Error('Debe seleccionar un departamento válido para la clasificación del producto.');
  }
  if (isNaN(parsedCatId) || parsedCatId <= 0) {
    throw new Error('Debe seleccionar una categoría objetivo válida.');
  }
  if (!parsedMarcaId) {
    throw new Error('Debe seleccionar una marca para el nuevo producto.');
  }
  if (!descripcion) {
    throw new Error('El nombre o descripción del producto es obligatorio.');
  }
  if (isNaN(contenidoNeto) || contenidoNeto <= 0) {
    throw new Error('El contenido neto debe ser un valor numérico positivo mayor a 0.');
  }
  if (isNaN(valorUnitario) || valorUnitario <= 0) {
    throw new Error('El precio sugerido debe ser un valor numérico positivo mayor a 0.');
  }

  const payload = {
    id_departamento: parsedDeptId,
    id_categoria: parsedCatId,
    id_marca: parsedMarcaId,
    descripcion: descripcion,
    contenido_neto: contenidoNeto,
    unidad_medida: unidadMedida,
    valor_unitario: valorUnitario,
    horizonte_meses: horizonteMeses
  };

  const response = await apiRequest(`/v1/${empresaId}/cold-start/predict`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  return response;
};
