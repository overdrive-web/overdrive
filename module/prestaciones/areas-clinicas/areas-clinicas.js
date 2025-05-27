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

const nombreAreaClinicaInput = document.getElementById('nombre-area-clinica');
const registrarBtn = document.getElementById('registrar-btn');
const registerModal = document.getElementById('register-modal');
const registerProgress = document.getElementById('register-progress');
const successModal = document.getElementById('success-modal');
const successIcon = document.getElementById('success-icon');
const successMessage = document.getElementById('success-message');
const editModal = document.getElementById('edit-modal');
const editNombreAreaClinicaInput = document.getElementById('edit-nombre-area-clinica');
const saveEditBtn = document.getElementById('save-edit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const loadingModal = document.getElementById('loading-modal');
const loadingProgress = document.getElementById('loading-progress');
const deleteModal = document.getElementById('delete-modal');
const deleteMessage = document.getElementById('delete-message');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const areasClinicasTableBody = document.querySelector('#areas-clinicas-table tbody');
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
let areasClinicas = [];
let currentEditId = null;
let filters = {};
let lastAreaClinicaId = 0;

async function getUserFullName() {
  const user = auth.currentUser;
  if (!user) throw new Error('No se encontró el usuario autenticado');
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('No se encontró el documento del usuario');
  return userSnap.data().fullName || 'Usuario Desconocido';
}

async function checkDuplicate(nombreAreaClinica, excludeDocId = null) {
  const areasClinicasCollection = collection(db, 'areasClinicas');
  const nombreQuery = query(areasClinicasCollection, where('nombreAreaClinica', '==', nombreAreaClinica));
  const nombreSnapshot = await getDocs(nombreQuery);
  if (!nombreSnapshot.empty) {
    const existingDoc = nombreSnapshot.docs.find(doc => doc.id !== excludeDocId);
    if (existingDoc) return { isDuplicate: true, field: 'nombreAreaClinica', value: nombreAreaClinica };
  }
  return { isDuplicate: false };
}

async function getNextAreaClinicaId() {
  if (lastAreaClinicaId > 0) {
    lastAreaClinicaId++;
    return lastAreaClinicaId.toString().padStart(1, '0');
  }
  const areasClinicasCollection = collection(db, 'areasClinicas');
  const q = query(areasClinicasCollection, orderBy('id', 'desc'), limit(1));
  const querySnapshot = await getDocs(q);
  let nextId = 1;
  if (!querySnapshot.empty) {
    const lastAreaClinica = querySnapshot.docs[0].data();
    nextId = (parseInt(lastAreaClinica.id) || 0) + 1;
  }
  lastAreaClinicaId = nextId;
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

async function loadAreasClinicas() {
  try {
    showModal(loadingModal, loadingProgress, 0);
    const areasClinicasCollection = collection(db, 'areasClinicas');
    const countSnapshot = await getDocs(areasClinicasCollection);
    const totalRecordsCount = countSnapshot.size;
    totalPages = Math.ceil(totalRecordsCount / recordsPerPage);
    totalRecords.textContent = `Total de registros: ${totalRecordsCount}`;
    let q = query(areasClinicasCollection, orderBy('id', 'asc'), limit(recordsPerPage));
    if (lastVisible && currentPage > 1) {
      q = query(areasClinicasCollection, orderBy('id', 'asc'), startAfter(lastVisible), limit(recordsPerPage));
    }
    const querySnapshot = await getDocs(q);
    areasClinicas = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      areasClinicas.push({ docId: doc.id, ...data });
    });
    if (areasClinicas.length > 0) {
      lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
      firstVisible = querySnapshot.docs[0];
    }
    renderTable();
    updatePagination();
    tableContainer.style.display = 'block';
    hideModal(loadingModal);
  } catch (error) {
    showSuccessMessage('Error al cargar áreas clínicas: ' + error.message, false);
    hideModal(loadingModal);
  }
}

document.getElementById('success-modal').style.right = '20px';
document.getElementById('success-modal').style.left = 'auto';

function renderTable() {
  let filteredAreasClinicas = [...areasClinicas];
  Object.keys(filters).forEach(column => {
    if (filters[column]) {
      filteredAreasClinicas = filteredAreasClinicas.filter(areaClinica => {
        const value = areaClinica[column]?.toString().toLowerCase() || '';
        return value.includes(filters[column].toLowerCase());
      });
    }
  });
  areasClinicasTableBody.innerHTML = '';
  filteredAreasClinicas.forEach(areaClinica => {
    const fechaCreacion = areaClinica.fechaCreacion && typeof areaClinica.fechaCreacion.toDate === 'function'
      ? areaClinica.fechaCreacion.toDate()
      : areaClinica.fechaCreacion instanceof Date
      ? areaClinica.fechaCreacion
      : null;
    const fechaDisplay = fechaCreacion && !isNaN(fechaCreacion)
      ? fechaCreacion.toLocaleString('es-ES')
      : 'Sin fecha';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${areaClinica.id}</td>
      <td>
        <i class="fas fa-edit action-icon" data-id="${areaClinica.docId}" title="Editar"></i>
        <i class="fas fa-trash action-icon" data-id="${areaClinica.docId}" title="Eliminar"></i>
        <i class="fas fa-history action-icon" data-id="${areaClinica.docId}" title="Historial"></i>
      </td>
      <td>${areaClinica.nombreAreaClinica}</td>
      <td>${fechaDisplay}</td>
      <td>${areaClinica.usuario}</td>
    `;
    areasClinicasTableBody.appendChild(tr);
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

async function loadLogs(areaClinicaId) {
  const logsCollection = collection(db, 'areasClinicas', areaClinicaId, 'logs');
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
        <strong>${data.action === 'created' ? 'Creado' : data.action === 'modified' ? 'Modificado' : 'Eliminado'}</strong>: 
        ${data.details}<br>
        <small>Fecha: ${fechaDisplay} | Usuario: ${data.user}</small>
      `;
      logContent.appendChild(logEntry);
    });
  }
  showModal(logModal);
}

async function init() {
  const container = document.querySelector('.areas-clinicas-container');
  if (!container) {
    console.error('Contenedor .areas-clinicas-container no encontrado');
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
                        (userData.permissions && userData.permissions.includes('Prestaciones:AreasClinicas'));
      if (!hasAccess) {
        container.innerHTML = '<p>Acceso denegado. No tienes permisos para acceder a este módulo.</p>';
        return;
      }

      loadAreasClinicas();

      registrarBtn.addEventListener('click', async () => {
        const nombreAreaClinica = nombreAreaClinicaInput.value.trim();
        if (!nombreAreaClinica) {
          showSuccessMessage('Por favor, complete el campo Nombre del Área Clínica', false);
          return;
        }
        try {
          showModal(registerModal, registerProgress, 0);
          const duplicateCheck = await checkDuplicate(nombreAreaClinica);
          if (duplicateCheck.isDuplicate) {
            showSuccessMessage(`Error: Ya existe un área clínica con el nombre "${duplicateCheck.value}"`, false);
            hideModal(registerModal);
            return;
          }
          const user = auth.currentUser;
          if (!user) throw new Error('Usuario no autenticado');
          const fullName = await getUserFullName();
          const areaClinicaId = await getNextAreaClinicaId();
          const fechaCreacion = new Date();
          const areaClinicaRef = doc(collection(db, 'areasClinicas'));
          const areaClinicaData = {
            id: areaClinicaId,
            nombreAreaClinica,
            fechaCreacion,
            usuario: fullName,
            uid: user.uid
          };
          const batch = writeBatch(db);
          batch.set(areaClinicaRef, areaClinicaData);
          const logRef = doc(collection(db, 'areasClinicas', areaClinicaRef.id, 'logs'));
          batch.set(logRef, {
            action: 'created',
            details: `Área clínica "${nombreAreaClinica}" creada`,
            timestamp: new Date(),
            user: fullName,
            uid: user.uid
          });
          await batch.commit();
          showModal(registerModal, registerProgress, 100);
          setTimeout(() => {
            hideModal(registerModal);
            showSuccessMessage('Área clínica registrada exitosamente');
            nombreAreaClinicaInput.value = '';
            areasClinicas.push({ docId: areaClinicaRef.id, ...areaClinicaData });
            renderTable();
          }, 300);
        } catch (error) {
          showSuccessMessage('Error al registrar área clínica: ' + error.message, false);
          hideModal(registerModal);
        }
      });

      saveEditBtn.addEventListener('click', async () => {
        const nombreAreaClinica = editNombreAreaClinicaInput.value.trim();
        if (!nombreAreaClinica) {
          showSuccessMessage('Por favor, complete el campo Nombre del Área Clínica', false);
          return;
        }
        try {
          const duplicateCheck = await checkDuplicate(nombreAreaClinica, currentEditId);
          if (duplicateCheck.isDuplicate) {
            showSuccessMessage(`Error: Ya existe un área clínica con el nombre "${duplicateCheck.value}"`, false);
            return;
          }
          const areaClinicaRef = doc(db, 'areasClinicas', currentEditId);
          const areaClinicaSnap = await getDoc(areaClinicaRef);
          const oldData = areaClinicaSnap.data();
          const fullName = await getUserFullName();
          const changes = [];
          if (oldData.nombreAreaClinica !== nombreAreaClinica) {
            changes.push(`Nombre cambiado de "${oldData.nombreAreaClinica}" a "${nombreAreaClinica}"`);
          }
          const batch = writeBatch(db);
          batch.update(areaClinicaRef, {
            nombreAreaClinica,
            usuario: fullName,
            fechaActualizacion: new Date()
          });
          if (changes.length > 0) {
            const logRef = doc(collection(db, 'areasClinicas', currentEditId, 'logs'));
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
          showSuccessMessage('Área clínica actualizada exitosamente');
          const index = areasClinicas.findIndex(area => area.docId === currentEditId);
          if (index !== -1) {
            areasClinicas[index] = { ...areasClinicas[index], nombreAreaClinica, usuario: fullName, fechaActualizacion: new Date() };
            renderTable();
          }
        } catch (error) {
          showSuccessMessage('Error al actualizar área clínica: ' + error.message, false);
        }
      });

      cancelEditBtn.addEventListener('click', () => {
        hideModal(editModal);
      });

      confirmDeleteBtn.addEventListener('click', async () => {
        const id = confirmDeleteBtn.dataset.id;
        try {
          const areaClinicaRef = doc(db, 'areasClinicas', id);
          const areaClinicaSnap = await getDoc(areaClinicaRef);
          const areaClinicaData = areaClinicaSnap.data();
          const fullName = await getUserFullName();
          const batch = writeBatch(db);
          batch.delete(areaClinicaRef);
          const logRef = doc(collection(db, 'areasClinicas', id, 'logs'));
          batch.set(logRef, {
            action: 'deleted',
            details: `Área clínica "${areaClinicaData.nombreAreaClinica}" eliminada`,
            timestamp: new Date(),
            user: fullName,
            uid: auth.currentUser.uid
          });
          await batch.commit();
          hideModal(deleteModal);
          showSuccessMessage('Área clínica eliminada exitosamente');
          areasClinicas = areasClinicas.filter(area => area.docId !== id);
          renderTable();
          totalRecords.textContent = `Total de registros: ${areasClinicas.length}`;
          totalPages = Math.ceil(areasClinicas.length / recordsPerPage);
          updatePagination();
        } catch (error) {
          showSuccessMessage('Error al eliminar área clínica: ' + error.message, false);
        }
      });

      cancelDeleteBtn.addEventListener('click', () => {
        hideModal(deleteModal);
      });

      areasClinicasTableBody.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const areaClinica = areasClinicas.find(area => area.docId === id);
        if (!areaClinica) return;
        if (e.target.classList.contains('fa-edit')) {
          openEditModal(areaClinica);
        } else if (e.target.classList.contains('fa-trash')) {
          openDeleteModal(areaClinica);
        } else if (e.target.classList.contains('fa-history')) {
          loadLogs(areaClinica.docId);
        }
      });

      closeLogBtn.addEventListener('click', () => {
        hideModal(logModal);
      });

      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          lastVisible = firstVisible;
          loadAreasClinicas();
        }
      });

      nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
          currentPage++;
          loadAreasClinicas();
        }
      });

      exportExcelBtn.addEventListener('click', () => {
        const data = areasClinicas.map(areaClinica => {
          const fechaCreacion = areaClinica.fechaCreacion && typeof areaClinica.fechaCreacion.toDate === 'function'
            ? areaClinica.fechaCreacion.toDate()
            : areaClinica.fechaCreacion instanceof Date
            ? areaClinica.fechaCreacion
            : null;
          return {
            ID: areaClinica.id,
            'Nombre del Área Clínica': areaClinica.nombreAreaClinica,
            'Fecha de Creación': fechaCreacion && !isNaN(fechaCreacion)
              ? fechaCreacion.toLocaleString('es-ES')
              : 'Sin fecha',
            Usuario: areaClinica.usuario
          };
        });
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'AreasClinicas');
        XLSX.writeFile(workbook, 'areas-clinicas.xlsx');
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

function openEditModal(areaClinica) {
  currentEditId = areaClinica.docId;
  editNombreAreaClinicaInput.value = areaClinica.nombreAreaClinica;
  editModal.style.display = 'flex';
}

function openDeleteModal(areaClinica) {
  deleteMessage.textContent = `¿Estás seguro de que deseas eliminar el área clínica "${areaClinica.nombreAreaClinica}" (ID: ${areaClinica.id})?`;
  confirmDeleteBtn.dataset.id = areaClinica.docId;
  deleteModal.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
}