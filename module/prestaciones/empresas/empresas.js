import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, limit, startAfter, where, getDoc, writeBatch } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import * as XLSX from "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";

const firebaseConfig = {
  apiKey: "AIzaSyAUI_wgnkY7XYUuU6wFGebi7hNKd9Nfqeg",
  authDomain: "overdrive-d3a99.firebaseapp.com",
  projectId: "overdrive-d3a99",
  storageBucket: "overdrive-d3a99.firebasestorage.app",
  messagingSenderId: "874128741475",
  appId: "1:874128741475:web:5426b04da2a609d01c1456",
  measurementId: "G-4JBE20JPB5"
};

let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);

const nombreEmpresaInput = document.getElementById('nombre-empresa');
const rutEmpresaInput = document.getElementById('rut-empresa');
const registrarBtn = document.getElementById('registrar-btn');
const registerModal = document.getElementById('register-modal');
const registerProgress = document.getElementById('register-progress');
const successModal = document.getElementById('success-modal');
const successIcon = document.getElementById('success-icon');
const successMessage = document.getElementById('success-message');
const editModal = document.getElementById('edit-modal');
const editNombreEmpresaInput = document.getElementById('edit-nombre-empresa');
const editRutEmpresaInput = document.getElementById('edit-rut-empresa');
const editEstadoActivo = document.getElementById('edit-estado-activo');
const editEstadoInactivo = document.getElementById('edit-estado-inactivo');
const saveEditBtn = document.getElementById('save-edit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const loadingModal = document.getElementById('loading-modal');
const loadingProgress = document.getElementById('loading-progress');
const deleteModal = document.getElementById('delete-modal');
const deleteMessage = document.getElementById('delete-message');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const empresasTableBody = document.querySelector('#empresas-table tbody');
const tableContainer = document.getElementById('table-container');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const exportExcelBtn = document.getElementById('export-excel-btn');
const pageInfo = document.getElementById('page-info');
const totalRecords = document.getElementById('total-records');
const logModal = document.getElementById('log-modal');
const logContent = document.getElementById('log-content');
const closeLogBtn = document.getElementById('close-log-btn');

let currentPage = 1;
const recordsPerPage = 50;
let lastVisible = null;
let firstVisible = null;
let totalPages = 1;
let empresas = [];
let currentEditId = null;
let filters = {};
let lastEmpresaId = 0;

function validateRUT(rut) {
  const cleanRUT = rut.replace(/[^0-9kK-]/g, '');
  if (!/^\d{1,8}-[\dkK]$/.test(cleanRUT)) return false;
  const [number, dv] = cleanRUT.split('-');
  let sum = 0;
  let multiplier = 2;
  for (let i = number.length - 1; i >= 0; i--) {
    sum += parseInt(number[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const mod = 11 - (sum % 11);
  const computedDV = mod === 11 ? '0' : mod === 10 ? 'k' : mod.toString();
  return computedDV.toLowerCase() === dv.toLowerCase();
}

async function getUserFullName() {
  const user = auth.currentUser;
  if (!user) throw new Error('No se encontró el usuario autenticado');
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('No se encontró el documento del usuario');
  return userSnap.data().fullName || 'Usuario Desconocido';
}

async function checkDuplicate(nombreEmpresa, rutEmpresa, excludeDocId = null) {
  const empresasCollection = collection(db, 'empresas');
  const nombreQuery = query(empresasCollection, where('nombreEmpresa', '==', nombreEmpresa));
  const rutQuery = query(empresasCollection, where('rutEmpresa', '==', rutEmpresa));
  
  const [nombreSnapshot, rutSnapshot] = await Promise.all([getDocs(nombreQuery), getDocs(rutQuery)]);
  
  if (!nombreSnapshot.empty) {
    const existingDoc = nombreSnapshot.docs.find(doc => doc.id !== excludeDocId);
    if (existingDoc) return { isDuplicate: true, field: 'nombreEmpresa', value: nombreEmpresa };
  }
  
  if (!rutSnapshot.empty) {
    const existingDoc = rutSnapshot.docs.find(doc => doc.id !== excludeDocId);
    if (existingDoc) return { isDuplicate: true, field: 'rutEmpresa', value: rutEmpresa };
  }
  
  return { isDuplicate: false };
}

async function getNextEmpresaId() {
  if (lastEmpresaId > 0) {
    lastEmpresaId++;
    return lastEmpresaId.toString().padStart(1, '0');
  }
  const empresasCollection = collection(db, 'empresas');
  const q = query(empresasCollection, orderBy('empresaId', 'desc'), limit(1));
  const querySnapshot = await getDocs(q);
  let nextId = 1;
  if (!querySnapshot.empty) {
    const lastEmpresa = querySnapshot.docs[0].data();
    nextId = (parseInt(lastEmpresa.empresaId) || 0) + 1;
  }
  lastEmpresaId = nextId;
  return nextId.toString().padStart(1, '0');
}

function showModal(modal, progressElement, percentage) {
  modal.style.display = 'flex';
  if (progressElement) {
    progressElement.textContent = `${percentage}%`;
  }
}

function hideModal(modal) {
  modal.style.display = 'none';
}

function showSuccessMessage(message, isSuccess = true) {
  successModal.className = `modal ${isSuccess ? 'success' : 'error'}`;
  successIcon.className = `fas ${isSuccess ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
  successMessage.textContent = message;
  successModal.style.display = 'flex';
  setTimeout(() => hideModal(successModal), 2000);
}

async function loadEmpresas() {
  try {
    showModal(loadingModal, loadingProgress, 0);
    const empresasCollection = collection(db, 'empresas');
    const countSnapshot = await getDocs(empresasCollection);
    const totalRecordsCount = countSnapshot.size;
    totalPages = Math.ceil(totalRecordsCount / recordsPerPage);
    totalRecords.textContent = `Total de registros: ${totalRecordsCount}`;
    let q = query(empresasCollection, orderBy('empresaId', 'asc'), limit(recordsPerPage));
    if (lastVisible && currentPage > 1) {
      q = query(empresasCollection, orderBy('empresaId', 'asc'), startAfter(lastVisible), limit(recordsPerPage));
    }
    const querySnapshot = await getDocs(q);
    empresas = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      empresas.push({ docId: doc.id, ...data });
    });
    if (empresas.length > 0) {
      lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
      firstVisible = querySnapshot.docs[0];
    }
    renderTable();
    updatePagination();
    tableContainer.style.display = 'block';
    hideModal(loadingModal);
  } catch (error) {
    showSuccessMessage('Error al cargar empresas: ' + error.message, false);
    hideModal(loadingModal);
  }
}

document.getElementById('success-modal').style.right = '20px';
document.getElementById('success-modal').style.left = 'auto';

function renderTable() {
  let filteredEmpresas = [...empresas];
  Object.keys(filters).forEach(column => {
    if (filters[column]) {
      filteredEmpresas = filteredEmpresas.filter(empresa => {
        const value = empresa[column]?.toString().toLowerCase() || '';
        return value.includes(filters[column].toLowerCase());
      });
    }
  });
  empresasTableBody.innerHTML = '';
  filteredEmpresas.forEach(empresa => {
    const fechaCreacion = empresa.fechaCreacion && typeof empresa.fechaCreacion.toDate === 'function'
      ? empresa.fechaCreacion.toDate()
      : empresa.fechaCreacion instanceof Date
      ? empresa.fechaCreacion
      : null;
    const fechaDisplay = fechaCreacion && !isNaN(fechaCreacion)
      ? fechaCreacion.toLocaleString('es-ES')
      : 'Sin fecha';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${empresa.empresaId}</td>
      <td>
        <i class="fas fa-edit action-icon" data-id="${empresa.docId}" title="Editar"></i>
        <i class="fas fa-trash action-icon" data-id="${empresa.docId}" title="Eliminar"></i>
        <i class="fas fa-eye action-icon" data-id="${empresa.docId}" title="Ver"></i>
        <i class="fas fa-history action-icon" data-id="${empresa.docId}" title="Historial"></i>
      </td>
      <td>${empresa.nombreEmpresa}</td>
      <td>${empresa.rutEmpresa}</td>
      <td>${empresa.estado || 'Activo'}</td>
      <td>${fechaDisplay}</td>
      <td>${empresa.usuario}</td>
    `;
    empresasTableBody.appendChild(tr);
  });

  // Actualizar íconos de filtro según el estado de filters
  document.querySelectorAll('.filter-icon').forEach(icon => {
    const column = icon.dataset.column;
    if (filters[column]) {
      icon.classList.remove('fa-filter');
      icon.classList.add('fa-filter-circle-xmark', 'active');
    } else {
      icon.classList.remove('fa-filter-circle-xmark', 'active');
      icon.classList.add('fa-filter');
    }
  });
}

function updatePagination() {
  pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

async function loadLogs(empresaId) {
  const logsCollection = collection(db, 'empresas', empresaId, 'logs');
  const logsQuery = query(logsCollection, orderBy('timestamp', 'desc'));
  const logsSnapshot = await getDocs(logsQuery);
  logContent.innerHTML = '';
  if (logsSnapshot.empty) {
    logContent.innerHTML = '<p>No hay registros de cambios.</p>';
  } else {
    logsSnapshot.forEach((doc) => {
      const data = doc.data();
      const timestamp = data.timestamp && typeof data.timestamp.toDate === 'function'
        ? data.timestamp.toDate()
        : data.timestamp instanceof Date
        ? data.timestamp
        : null;
      const fechaDisplay = timestamp && !isNaN(timestamp)
        ? timestamp.toLocaleString('es-ES')
        : 'Sin fecha';
      const logEntry = document.createElement('div');
      logEntry.className = 'log-entry';
      logEntry.innerHTML = `
        <strong>${data.action === 'created' ? 'Creado' : 'Modificado'}</strong>: 
        ${data.details}<br>
        <small>Fecha: ${fechaDisplay} | Usuario: ${data.user}</small>
      `;
      logContent.appendChild(logEntry);
    });
  }
  showModal(logModal);
}

async function init() {
  const container = document.querySelector('.empresas-container');
  if (!container) {
    console.error('Contenedor .empresas-container no encontrado');
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      container.innerHTML = '<p>Error: No estás autenticado. Por favor, inicia sesión nuevamente.</p>';
      window.location.href = 'main.html?error=auth-required';
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        container.innerHTML = '<p>Error: Tu cuenta no está registrada en la base de datos. Contacta al administrador.</p>';
        return;
      }

      const userData = userDoc.data();
      const hasAccess = userData.role === 'Administrador' ||
                        (userData.permissions && userData.permissions.includes('Prestaciones:Empresas'));
      if (!hasAccess) {
        container.innerHTML = '<p>Acceso denegado. No tienes permisos para acceder a este módulo.</p>';
        return;
      }

      loadEmpresas();

      registrarBtn.addEventListener('click', async () => {
        const nombreEmpresa = nombreEmpresaInput.value.trim();
        const rutEmpresa = rutEmpresaInput.value.trim();
        
        if (!nombreEmpresa || !rutEmpresa) {
          showSuccessMessage('Por favor, complete todos los campos', false);
          return;
        }
        
        if (!validateRUT(rutEmpresa)) {
          showSuccessMessage('RUT inválido', false);
          return;
        }
        
        try {
          showModal(registerModal, registerProgress, 0);
          
          const duplicateCheck = await checkDuplicate(nombreEmpresa, rutEmpresa);
          if (duplicateCheck.isDuplicate) {
            showSuccessMessage(`Error: Ya existe una empresa con ${duplicateCheck.field === 'nombreEmpresa' ? 'el nombre' : 'el RUT'} "${duplicateCheck.value}"`, false);
            hideModal(registerModal);
            return;
          }
          
          const user = auth.currentUser;
          if (!user) throw new Error('Usuario no autenticado');
          
          const fullName = await getUserFullName();
          const empresaId = await getNextEmpresaId();
          const fechaCreacion = new Date();
          
          const empresaRef = doc(collection(db, 'empresas'));
          const empresaData = {
            empresaId,
            nombreEmpresa,
            rutEmpresa,
            estado: 'Activo',
            fechaCreacion,
            usuario: fullName,
            uid: user.uid
          };
          const batch = writeBatch(db);
          batch.set(empresaRef, empresaData);
          const logRef = doc(collection(db, 'empresas', empresaRef.id, 'logs'));
          batch.set(logRef, {
            action: 'created',
            details: `Empresa "${nombreEmpresa}" creada`,
            timestamp: new Date(),
            user: fullName,
            uid: user.uid
          });
          
          await batch.commit();
          
          showModal(registerModal, registerProgress, 100);
          setTimeout(() => {
            hideModal(registerModal);
            showSuccessMessage('Empresa registrada exitosamente');
            nombreEmpresaInput.value = '';
            rutEmpresaInput.value = '';
            empresas.push({ docId: empresaRef.id, ...empresaData });
            renderTable();
          }, 300);
        } catch (error) {
          showSuccessMessage('Error al registrar empresa: ' + error.message, false);
          hideModal(registerModal);
        }
      });

      saveEditBtn.addEventListener('click', async () => {
        const nombreEmpresa = editNombreEmpresaInput.value.trim();
        const rutEmpresa = editRutEmpresaInput.value.trim();
        const estado = editEstadoActivo.checked ? 'Activo' : 'Inactivo';
        
        if (!nombreEmpresa || !rutEmpresa) {
          showSuccessMessage('Por favor, complete todos los campos', false);
          return;
        }
        
        if (!validateRUT(rutEmpresa)) {
          showSuccessMessage('RUT inválido', false);
          return;
        }
        
        try {
          const duplicateCheck = await checkDuplicate(nombreEmpresa, rutEmpresa, currentEditId);
          if (duplicateCheck.isDuplicate) {
            showSuccessMessage(`Error: Ya existe una empresa con ${duplicateCheck.field === 'nombreEmpresa' ? 'el nombre' : 'el RUT'} "${duplicateCheck.value}"`, false);
            return;
          }
          
          const empresaRef = doc(db, 'empresas', currentEditId);
          const empresaSnap = await getDoc(empresaRef);
          const oldData = empresaSnap.data();
          
          const changes = [];
          if (oldData.nombreEmpresa !== nombreEmpresa) {
            changes.push(`Nombre cambiado de "${oldData.nombreEmpresa}" a "${nombreEmpresa}"`);
          }
          if (oldData.rutEmpresa !== rutEmpresa) {
            changes.push(`RUT cambiado de "${oldData.rutEmpresa}" a "${rutEmpresa}"`);
          }
          if (oldData.estado !== estado) {
            changes.push(`Estado cambiado de "${oldData.estado}" a "${estado}"`);
          }
          
          const fullName = await getUserFullName();
          
          const batch = writeBatch(db);
          batch.update(empresaRef, {
            nombreEmpresa,
            rutEmpresa,
            estado,
            usuario: fullName,
            fechaActualizacion: new Date()
          });
          
          if (changes.length > 0) {
            const logRef = doc(collection(db, 'empresas', currentEditId, 'logs'));
            batch.set(logRef, {
              action: 'modified',
              details: changes.join('; '),
              timestamp: new Date(),
              user: fullName,
              uid: auth.currentUser.uid
            });
          }
          
          await batch.commit();
          
          hideModal(editModal);
          showSuccessMessage('Empresa actualizada exitosamente');
          
          const index = empresas.findIndex(emp => emp.docId === currentEditId);
          if (index !== -1) {
            empresas[index] = { ...empresas[index], nombreEmpresa, rutEmpresa, estado, usuario: fullName, fechaActualizacion: new Date() };
            renderTable();
          }
        } catch (error) {
          showSuccessMessage('Error al actualizar empresa: ' + error.message, false);
        }
      });

      cancelEditBtn.addEventListener('click', () => {
        hideModal(editModal);
      });

      confirmDeleteBtn.addEventListener('click', async () => {
        const id = confirmDeleteBtn.dataset.id;
        try {
          const empresaRef = doc(db, 'empresas', id);
          const fullName = await getUserFullName();
          const batch = writeBatch(db);
          batch.delete(empresaRef);
          const logRef = doc(collection(db, 'empresas', id, 'logs'));
          batch.set(logRef, {
            action: 'deleted',
            details: `Empresa eliminada`,
            timestamp: new Date(),
            user: fullName,
            uid: auth.currentUser.uid
          });
          await batch.commit();
          hideModal(deleteModal);
          showSuccessMessage('Empresa eliminada exitosamente');
          empresas = empresas.filter(emp => emp.docId !== id);
          renderTable();
          totalRecords.textContent = `Total de registros: ${empresas.length}`;
          totalPages = Math.ceil(empresas.length / recordsPerPage);
          updatePagination();
        } catch (error) {
          showSuccessMessage('Error al eliminar empresa: ' + error.message, false);
        }
      });

      cancelDeleteBtn.addEventListener('click', () => {
        hideModal(deleteModal);
      });

      empresasTableBody.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const empresa = empresas.find(emp => emp.docId === id);
        if (!empresa) return;
        
        if (e.target.classList.contains('fa-edit')) {
          openEditModal(empresa);
        } else if (e.target.classList.contains('fa-trash')) {
          openDeleteModal(empresa);
        } else if (e.target.classList.contains('fa-eye')) {
          const fechaCreacion = empresa.fechaCreacion && typeof empresa.fechaCreacion.toDate === 'function'
            ? empresa.fechaCreacion.toDate()
            : empresa.fechaCreacion instanceof Date
            ? empresa.fechaCreacion
            : null;
          const fechaDisplay = fechaCreacion && !isNaN(fechaCreacion)
            ? fechaCreacion.toLocaleString('es-ES')
            : 'Sin fecha';
          showSuccessMessage(`Detalles de la empresa:\nID: ${empresa.empresaId}\nNombre: ${empresa.nombreEmpresa}\nRUT: ${empresa.rutEmpresa}\nEstado: ${empresa.estado || 'Activo'}\nCreada: ${fechaDisplay}\nUsuario: ${empresa.usuario}`);
        } else if (e.target.classList.contains('fa-history')) {
          loadLogs(empresa.docId);
        }
      });

      closeLogBtn.addEventListener('click', () => {
        hideModal(logModal);
      });

      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          lastVisible = firstVisible;
          loadEmpresas();
        }
      });

      nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
          currentPage++;
          loadEmpresas();
        }
      });

      exportExcelBtn.addEventListener('click', () => {
        if (typeof window.XLSX === 'undefined' || !window.XLSX.utils || !window.XLSX.utils.json_to_sheet) {
          console.error('La biblioteca SheetJS no está cargada.');
          showSuccessMessage('Error: No se pudo cargar la biblioteca para exportar a Excel.', false);
          return;
        }
        const data = empresas.map(empresa => {
          const fechaCreacion = empresa.fechaCreacion && typeof empresa.fechaCreacion.toDate === 'function'
            ? empresa.fechaCreacion.toDate()
            : empresa.fechaCreacion instanceof Date
            ? empresa.fechaCreacion
            : null;
          return {
            ID: empresa.empresaId,
            'Nombre de la Empresa': empresa.nombreEmpresa,
            'RUT de la Empresa': empresa.rutEmpresa,
            'Estado': empresa.estado || 'Activo',
            'Fecha de Creación': fechaCreacion && !isNaN(fechaCreacion)
              ? fechaCreacion.toLocaleString('es-ES')
              : 'Sin fecha',
            Usuario: empresa.usuario
          };
        });
        const worksheet = window.XLSX.utils.json_to_sheet(data);
        const workbook = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Empresas');
        window.XLSX.writeFile(workbook, 'empresas.xlsx');
      });

      document.querySelectorAll('.filter-icon').forEach(icon => {
        icon.addEventListener('click', (e) => {
          const column = e.target.dataset.column;
          if (column === 'acciones') return;

          // Si el ícono indica un filtro activo, limpiarlo
          if (e.target.classList.contains('fa-filter-circle-xmark')) {
            delete filters[column];
            renderTable();
            return;
          }

          // Remueve cualquier contenedor de filtro existente
          document.querySelectorAll('.filter-input-container').forEach(input => input.remove());

          // Crea el nuevo contenedor de filtro
          const container = document.createElement('div');
          container.className = 'filter-input-container';
          const input = document.createElement('input');
          input.type = 'text';
          input.placeholder = `Filtrar por ${column}`;
          input.value = filters[column] || '';
          input.addEventListener('input', () => {
            const value = input.value.trim();
            if (value) {
              filters[column] = value;
            } else {
              delete filters[column];
            }
            renderTable();
          });
          container.appendChild(input);
          e.target.parentElement.appendChild(container);
          input.focus();
        });
      });

      document.addEventListener('click', (e) => {
        if (!e.target.classList.contains('fa-filter') && !e.target.classList.contains('fa-filter-circle-xmark') && !e.target.closest('.filter-input-container')) {
          document.querySelectorAll('.filter-input-container').forEach(input => input.remove());
        }
      });

    } catch (error) {
      container.innerHTML = `<p>Error al verificar permisos: ${error.message}</p>`;
    }
  });
}

function openEditModal(empresa) {
  currentEditId = empresa.docId;
  editNombreEmpresaInput.value = empresa.nombreEmpresa;
  editRutEmpresaInput.value = empresa.rutEmpresa;
  editEstadoActivo.checked = (empresa.estado || 'Activo') === 'Activo';
  editEstadoInactivo.checked = (empresa.estado || 'Activo') === 'Inactivo';
  editModal.style.display = 'flex';
}

function openDeleteModal(empresa) {
  deleteMessage.textContent = `¿Estás seguro de que deseas eliminar la empresa "${empresa.nombreEmpresa}" (ID: ${empresa.empresaId})?`;
  confirmDeleteBtn.dataset.id = empresa.docId;
  deleteModal.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
}