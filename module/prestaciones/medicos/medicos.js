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

const nombreMedicoInput = document.getElementById('nombre-medico');
const registrarBtn = document.getElementById('registrar-btn');
const registerModal = document.getElementById('register-modal');
const registerProgress = document.getElementById('register-progress');
const successModal = document.getElementById('success-modal');
const successIcon = document.getElementById('success-icon');
const successMessage = document.getElementById('success-message');
const editModal = document.getElementById('edit-modal');
const editNombreMedicoInput = document.getElementById('edit-nombre-medico');
const saveEditBtn = document.getElementById('save-edit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const loadingModal = document.getElementById('loading-modal');
const loadingProgress = document.getElementById('loading-progress');
const deleteModal = document.getElementById('delete-modal');
const deleteMessage = document.getElementById('delete-message');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const medicosTableBody = document.querySelector('#medicos-table tbody');
const tableContainer = document.getElementById('table-container');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const exportExcelBtn = document.getElementById('export-excel-btn');
const pageInfo = document.getElementById('page-info');
const totalRecords = document.getElementById('total-records');
const logModal = document.getElementById('log-modal');
const closeLogBtn = document.getElementById('close-log-btn');
const logContent = document.getElementById('log-content');

let currentPage = 1;
const recordsPerPage = 50;
let lastVisible = null;
let firstVisible = null;
let totalPages = 1;
let medicos = [];
let currentEditId = null;
let filters = {};
let lastMedicoId = 0;

async function getUserFullName() {
  const user = auth.currentUser;
  if (!user) throw new Error('No se encontró el usuario autenticado');
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('No se encontró el documento del usuario');
  return userSnap.data().fullName || 'Usuario Desconocido';
}

async function checkDuplicate(nombreMedico, excludeDocId = null) {
  const medicosCollection = collection(db, 'medicos');
  const nombreQuery = query(medicosCollection, where('nombreMedico', '==', nombreMedico));
  const nombreSnapshot = await getDocs(nombreQuery);
  if (!nombreSnapshot.empty) {
    const existingDoc = nombreSnapshot.docs.find(doc => doc.id !== excludeDocId);
    if (existingDoc) return { isDuplicate: true, field: 'nombreMedico', value: nombreMedico };
  }
  return { isDuplicate: false };
}

async function getNextMedicoId() {
  if (lastMedicoId > 0) {
    lastMedicoId++;
    return lastMedicoId.toString().padStart(3, '0');
  }
  const medicosCollection = collection(db, 'medicos');
  const q = query(medicosCollection, orderBy('id', 'desc'), limit(1));
  const querySnapshot = await getDocs(q);
  let nextId = 1;
  if (!querySnapshot.empty) {
    const lastMedico = querySnapshot.docs[0].data();
    nextId = (parseInt(lastMedico.id) || 0) + 1;
  }
  lastMedicoId = nextId;
  return nextId.toString().padStart(3, '0');
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

async function loadMedicos() {
  try {
    showModal(loadingModal, loadingProgress, 0);
    const medicosCollection = collection(db, 'medicos');
    const countSnapshot = await getDocs(medicosCollection);
    const totalRecordsCount = countSnapshot.size;
    totalPages = Math.ceil(totalRecordsCount / recordsPerPage);
    totalRecords.textContent = `Total de registros: ${totalRecordsCount}`;
    let q = query(medicosCollection, orderBy('id', 'asc'), limit(recordsPerPage));
    if (lastVisible && currentPage > 1) {
      q = query(medicosCollection, orderBy('id', 'asc'), startAfter(lastVisible), limit(recordsPerPage));
    }
    const querySnapshot = await getDocs(q);
    medicos = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      medicos.push({ docId: doc.id, ...data });
    });
    if (medicos.length > 0) {
      lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
      firstVisible = querySnapshot.docs[0];
    }
    renderTable();
    updatePagination();
    tableContainer.style.display = 'block';
    hideModal(loadingModal);
  } catch (error) {
    showSuccessMessage('Error al cargar médicos: ' + error.message, false);
    hideModal(loadingModal);
  }
}

document.getElementById('success-modal').style.right = '20px';
document.getElementById('success-modal').style.left = 'auto';

function renderTable() {
  let filteredMedicos = [...medicos];
  Object.keys(filters).forEach(column => {
    if (filters[column]) {
      filteredMedicos = filteredMedicos.filter(medico => {
        const value = medico[column]?.toString().toLowerCase() || '';
        return value.includes(filters[column].toLowerCase());
      });
    }
  });
  medicosTableBody.innerHTML = '';
  filteredMedicos.forEach(medico => {
    const fechaCreacion = medico.fechaCreacion && typeof medico.fechaCreacion.toDate === 'function'
      ? medico.fechaCreacion.toDate()
      : medico.fechaCreacion instanceof Date
      ? medico.fechaCreacion
      : null;
    const fechaDisplay = fechaCreacion && !isNaN(fechaCreacion)
      ? fechaCreacion.toLocaleString('es-ES')
      : 'Sin fecha';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${medico.id}</td>
      <td>
        <i class="fas fa-edit action-icon" data-id="${medico.docId}" title="Editar"></i>
        <i class="fas fa-trash action-icon" data-id="${medico.docId}" title="Eliminar"></i>
        <i class="fas fa-history action-icon" data-id="${medico.docId}" title="Historial"></i>
      </td>
      <td>${medico.nombreMedico}</td>
      <td>${fechaDisplay}</td>
      <td>${medico.usuario}</td>
    `;
    medicosTableBody.appendChild(tr);
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

async function loadLogs(medicoId) {
  const logsCollection = collection(db, 'medicos', medicoId, 'logs');
  const logsQuery = query(logsCollection, orderBy('timestamp', 'desc'));
  const logsSnapshot = await getDocs(logsQuery);
  logContent.innerHTML = '';
  logsSnapshot.forEach((doc) => {
    const data = doc.data();
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.innerHTML = `<strong>${data.action}</strong> - ${data.message} <small>${data.timestamp.toDate().toLocaleString('es-ES')}</small>`;
    logContent.appendChild(logEntry);
  });
  logModal.style.display = 'flex';
}

async function init() {
  const container = document.querySelector('.medicos-container');
  if (!container) {
    console.error('Contenedor .medicos-container no encontrado');
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
                        (userData.permissions && userData.permissions.includes('Prestaciones:Medicos'));
      if (!hasAccess) {
        container.innerHTML = '<p>Acceso denegado. No tienes permisos para acceder a este módulo.</p>';
        return;
      }

      loadMedicos();

      registrarBtn.addEventListener('click', async () => {
        const nombreMedico = nombreMedicoInput.value.trim();
        if (!nombreMedico) {
          showSuccessMessage('Por favor, complete el campo Nombre del Médico', false);
          return;
        }
        try {
          showModal(registerModal, registerProgress, 0);
          const duplicateCheck = await checkDuplicate(nombreMedico);
          if (duplicateCheck.isDuplicate) {
            showSuccessMessage(`Error: Ya existe un médico con el nombre "${duplicateCheck.value}"`, false);
            hideModal(registerModal);
            return;
          }
          const user = auth.currentUser;
          if (!user) throw new Error('Usuario no autenticado');
          const fullName = await getUserFullName();
          const medicoId = await getNextMedicoId();
          const fechaCreacion = new Date();
          const medicoRef = doc(collection(db, 'medicos'));
          const medicoData = {
            id: medicoId,
            nombreMedico,
            fechaCreacion,
            usuario: fullName,
            uid: user.uid
          };
          const batch = writeBatch(db);
          batch.set(medicoRef, medicoData);
          const logRef = doc(collection(db, 'medicos', medicoRef.id, 'logs'));
          batch.set(logRef, {
            action: 'Creación',
            message: `Médico ${nombreMedico} creado por ${fullName}`,
            timestamp: new Date(),
            uid: user.uid
          });
          await batch.commit();
          showModal(registerModal, registerProgress, 100);
          setTimeout(() => {
            hideModal(registerModal);
            showSuccessMessage('Médico registrado exitosamente');
            nombreMedicoInput.value = '';
            medicos.push({ docId: medicoRef.id, ...medicoData });
            renderTable();
          }, 300);
        } catch (error) {
          showSuccessMessage('Error al registrar médico: ' + error.message, false);
          hideModal(registerModal);
        }
      });

      saveEditBtn.addEventListener('click', async () => {
        const nombreMedico = editNombreMedicoInput.value.trim();
        if (!nombreMedico) {
          showSuccessMessage('Por favor, complete el campo Nombre del Médico', false);
          return;
        }
        try {
          const duplicateCheck = await checkDuplicate(nombreMedico, currentEditId);
          if (duplicateCheck.isDuplicate) {
            showSuccessMessage(`Error: Ya existe un médico con el nombre "${duplicateCheck.value}"`, false);
            return;
          }
          const medicoRef = doc(db, 'medicos', currentEditId);
          const medicoSnap = await getDoc(medicoRef);
          const oldData = medicoSnap.data();
          const fullName = await getUserFullName();
          const batch = writeBatch(db);
          batch.update(medicoRef, {
            nombreMedico,
            usuario: fullName,
            fechaActualizacion: new Date()
          });
          const logRef = doc(collection(db, 'medicos', currentEditId, 'logs'));
          batch.set(logRef, {
            action: 'Edición',
            message: `Médico ${oldData.nombreMedico} editado a ${nombreMedico} por ${fullName}`,
            timestamp: new Date(),
            uid: user.uid
          });
          await batch.commit();
          hideModal(editModal);
          showSuccessMessage('Médico actualizado exitosamente');
          const index = medicos.findIndex(med => med.docId === currentEditId);
          if (index !== -1) {
            medicos[index] = { ...medicos[index], nombreMedico, usuario: fullName, fechaActualizacion: new Date() };
            renderTable();
          }
        } catch (error) {
          showSuccessMessage('Error al actualizar médico: ' + error.message, false);
        }
      });

      cancelEditBtn.addEventListener('click', () => {
        hideModal(editModal);
      });

      confirmDeleteBtn.addEventListener('click', async () => {
        const id = confirmDeleteBtn.dataset.id;
        try {
          const medicoRef = doc(db, 'medicos', id);
          const fullName = await getUserFullName();
          const batch = writeBatch(db);
          batch.delete(medicoRef);
          const logRef = doc(collection(db, 'medicos', id, 'logs'));
          batch.set(logRef, {
            action: 'Eliminación',
            message: `Médico eliminado por ${fullName}`,
            timestamp: new Date(),
            uid: auth.currentUser.uid
          });
          await batch.commit();
          hideModal(deleteModal);
          showSuccessMessage('Médico eliminado exitosamente');
          medicos = medicos.filter(med => med.docId !== id);
          renderTable();
          totalRecords.textContent = `Total de registros: ${medicos.length}`;
          totalPages = Math.ceil(medicos.length / recordsPerPage);
          updatePagination();
        } catch (error) {
          showSuccessMessage('Error al eliminar médico: ' + error.message, false);
        }
      });

      cancelDeleteBtn.addEventListener('click', () => {
        hideModal(deleteModal);
      });

      medicosTableBody.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const medico = medicos.find(med => med.docId === id);
        if (!medico) return;
        if (e.target.classList.contains('fa-edit')) {
          openEditModal(medico);
        } else if (e.target.classList.contains('fa-trash')) {
          openDeleteModal(medico);
        } else if (e.target.classList.contains('fa-history')) {
          loadLogs(medico.docId);
        }
      });

      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          lastVisible = firstVisible;
          loadMedicos();
        }
      });

      nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
          currentPage++;
          loadMedicos();
        }
      });

      exportExcelBtn.addEventListener('click', () => {
        const data = medicos.map(medico => {
          const fechaCreacion = medico.fechaCreacion && typeof medico.fechaCreacion.toDate === 'function'
            ? medico.fechaCreacion.toDate()
            : medico.fechaCreacion instanceof Date
            ? medico.fechaCreacion
            : null;
          return {
            ID: medico.id,
            'Nombre del Médico': medico.nombreMedico,
            'Fecha de Creación': fechaCreacion && !isNaN(fechaCreacion)
              ? fechaCreacion.toLocaleString('es-ES')
              : 'Sin fecha',
            Usuario: medico.usuario
          };
        });
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Medicos');
        XLSX.writeFile(workbook, 'medicos.xlsx');
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

      closeLogBtn.addEventListener('click', () => {
        hideModal(logModal);
      });

    } catch (error) {
      container.innerHTML = `<p>Error al verificar permisos: ${error.message}</p>`;
    }
  });
}

function openEditModal(medico) {
  currentEditId = medico.docId;
  editNombreMedicoInput.value = medico.nombreMedico;
  editModal.style.display = 'flex';
}

function openDeleteModal(medico) {
  deleteMessage.textContent = `¿Estás seguro de que deseas eliminar al médico "${medico.nombreMedico}" (ID: ${medico.id})?`;
  confirmDeleteBtn.dataset.id = medico.docId;
  deleteModal.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
}