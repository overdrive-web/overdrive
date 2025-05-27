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

const nombreInput = document.getElementById('nombre');
const empresaSelect = document.getElementById('empresa');
const celularInput = document.getElementById('celular');
const telefonoInput = document.getElementById('telefono');
const correoInput = document.getElementById('correo');
const observacionInput = document.getElementById('observacion');
const registrarBtn = document.getElementById('registrar-btn');
const registerModal = document.getElementById('register-modal');
const registerProgress = document.getElementById('register-progress');
const successModal = document.getElementById('success-modal');
const successIcon = document.getElementById('success-icon');
const successMessage = document.getElementById('success-message');
const editModal = document.getElementById('edit-modal');
const editNombreInput = document.getElementById('edit-nombre');
const editEmpresaSelect = document.getElementById('edit-empresa');
const editCelularInput = document.getElementById('edit-celular');
const editTelefonoInput = document.getElementById('edit-telefono');
const editCorreoInput = document.getElementById('edit-correo');
const editObservacionInput = document.getElementById('edit-observacion');
const saveEditBtn = document.getElementById('save-edit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const loadingModal = document.getElementById('loading-modal');
const loadingProgress = document.getElementById('loading-progress');
const deleteModal = document.getElementById('delete-modal');
const deleteMessage = document.getElementById('delete-message');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const ctsProveedoresTableBody = document.querySelector('#cts-proveedores-table tbody');
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
let ctsProveedores = [];
let currentEditId = null;
let filters = {};
let lastCtsProveedorId = 0;
let empresas = [];

async function getUserFullName() {
  const user = auth.currentUser;
  if (!user) throw new Error('No se encontró el usuario autenticado');
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('No se encontró el documento del usuario');
  return userSnap.data().fullName || 'Usuario Desconocido';
}

async function checkDuplicate(nombre, empresaId, excludeDocId = null) {
  const ctsProveedoresCollection = collection(db, 'ctsProveedores');
  const q = query(ctsProveedoresCollection, where('nombre', '==', nombre), where('empresaId', '==', empresaId));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const existingDoc = snapshot.docs.find(doc => doc.id !== excludeDocId);
    if (existingDoc) return { isDuplicate: true, field: 'nombre y empresa', value: `${nombre} (Empresa ID: ${empresaId})` };
  }
  return { isDuplicate: false };
}

async function getNextCtsProveedorId() {
  if (lastCtsProveedorId > 0) {
    lastCtsProveedorId++;
    return lastCtsProveedorId.toString().padStart(1, '0');
  }
  const ctsProveedoresCollection = collection(db, 'ctsProveedores');
  const q = query(ctsProveedoresCollection, orderBy('id', 'desc'), limit(1));
  const querySnapshot = await getDocs(q);
  let nextId = 1;
  if (!querySnapshot.empty) {
    const lastCtsProveedor = querySnapshot.docs[0].data();
    nextId = (parseInt(lastCtsProveedor.id) || 0) + 1;
  }
  lastCtsProveedorId = nextId;
  return nextId.toString().padStart(1, '0');
}

async function loadEmpresas() {
  try {
    const empresasCollection = collection(db, 'empresas');
    const querySnapshot = await getDocs(empresasCollection);
    empresas = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      empresas.push({ id: doc.id, ...data });
    });
    populateEmpresaSelect(empresaSelect);
    populateEmpresaSelect(editEmpresaSelect);
  } catch (err) {
    showSuccessMessage('Error al cargar empresas: ' + err.message, false);
  }
}

function populateEmpresaSelect(selectElement) {
  selectElement.innerHTML = '<option value="">Seleccione una empresa</option>';
  empresas.forEach(emp => {
    const option = document.createElement('option');
    option.value = emp.id;
    option.textContent = emp.nombreEmpresa || 'Sin nombre';
    selectElement.appendChild(option);
  });
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return email ? emailRegex.test(email) : true;
}

function validatePhone(phone) {
  if (!phone) return true;
  const phoneRegex = /^[\d\s]+$/;
  return phoneRegex.test(phone);
}

function cleanPhoneNumber(phone) {
  return phone ? phone.replace(/\s/g, '') : '';
}

function showModal(modal, progressElement, percentage = null) {
  modal.style.display = 'flex';
  if (progressElement && percentage !== null) {
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

async function loadCtsProveedores() {
  try {
    showModal(loadingModal, loadingProgress, 0);
    const ctsProveedoresCollection = collection(db, 'ctsProveedores');
    const countSnapshot = await getDocs(ctsProveedoresCollection);
    const totalRecordsCount = countSnapshot.size;
    totalPages = Math.ceil(totalRecordsCount / recordsPerPage);
    totalRecords.textContent = `Total de registros: ${totalRecordsCount}`;
    let q = query(ctsProveedoresCollection, orderBy('id', 'asc'), limit(recordsPerPage));
    if (lastVisible && currentPage > 1) {
      q = query(ctsProveedoresCollection, orderBy('id', 'asc'), startAfter(lastVisible), limit(recordsPerPage));
    }
    const querySnapshot = await getDocs(q);
    ctsProveedores = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      ctsProveedores.push({ docId: doc.id, ...data });
    });
    if (ctsProveedores.length > 0) {
      lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
      firstVisible = querySnapshot.docs[0];
    }
    renderTable();
    updatePagination();
    tableContainer.style.display = 'block';
    hideModal(loadingModal);
  } catch (err) {
    showSuccessMessage('Error al cargar contactos de proveedores: ' + err.message, false);
    hideModal(loadingModal);
  }
}

document.getElementById('success-modal').style.right = '20px';
document.getElementById('success-modal').style.left = 'auto';

function renderTable() {
  let filteredCtsProveedores = [...ctsProveedores];
  Object.keys(filters).forEach(column => {
    if (filters[column]) {
      filteredCtsProveedores = filteredCtsProveedores.filter(ctsProveedor => {
        let value = ctsProveedor[column]?.toString().toLowerCase() || '';
        if (column === 'nombreEmpresa') {
          const empresa = empresas.find(emp => emp.id === ctsProveedor.empresaId);
          value = empresa ? empresa.nombreEmpresa.toLowerCase() : '';
        }
        return value.includes(filters[column].toLowerCase());
      });
    }
  });
  ctsProveedoresTableBody.innerHTML = '';
  filteredCtsProveedores.forEach(ctsProveedor => {
    const fechaCreacion = ctsProveedor.fechaCreacion && typeof ctsProveedor.fechaCreacion.toDate === 'function'
      ? ctsProveedor.fechaCreacion.toDate()
      : ctsProveedor.fechaCreacion instanceof Date
      ? ctsProveedor.fechaCreacion
      : null;
    const fechaDisplay = fechaCreacion && !isNaN(fechaCreacion)
      ? fechaCreacion.toLocaleString('es-ES')
      : 'Sin fecha';
    const empresa = empresas.find(emp => emp.id === ctsProveedor.empresaId);
    const nombreEmpresa = empresa ? empresa.nombreEmpresa : 'Sin empresa';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${ctsProveedor.id}</td>
      <td>
        <i class="fas fa-edit action-icon" data-id="${ctsProveedor.docId}" title="Editar"></i>
        <i class="fas fa-trash action-icon" data-id="${ctsProveedor.docId}" title="Eliminar"></i>
        <i class="fas fa-history action-icon" data-id="${ctsProveedor.docId}" title="Historial"></i>
      </td>
      <td>${ctsProveedor.nombre}</td>
      <td>${nombreEmpresa}</td>
      <td>${ctsProveedor.celularFormatted || ''}</td>
      <td>${ctsProveedor.telefono || ''}</td>
      <td>${ctsProveedor.correo || ''}</td>
      <td>${ctsProveedor.observacion || ''}</td>
      <td>${fechaDisplay}</td>
      <td>${ctsProveedor.usuario}</td>
    `;
    ctsProveedoresTableBody.appendChild(tr);
  });

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

async function loadLogs(ctsProveedorId) {
  try {
    const logsCollection = collection(db, 'ctsProveedores', ctsProveedorId, 'logs');
    const logsQuery = query(logsCollection, orderBy('timestamp', 'desc'));
    const logsSnapshot = await getDocs(logsQuery);
    logContent.innerHTML = '';
    if (logsSnapshot.empty) {
      logContent.innerHTML = '<p>No hay registros de cambios.</p>';
    } else {
      logsSnapshot.forEach(doc => {
        const data = doc.data();
        const timestamp = data.timestamp && typeof data.timestamp.toDate === 'function'
          ? data.timestamp.toDate()
          : data.timestamp instanceof Date
          ? data.timestamp
          : null;
        const fechaDisplay = timestamp ? timestamp.toLocaleString('es-ES') : 'Sin fecha';
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
  } catch (err) {
    showSuccessMessage('Error al cargar historial: ' + err.message, false);
  }
}

async function init() {
  const container = document.querySelector('.cts-proveedores-container');
  if (!container) {
    console.error('Contenedor .cts-proveedores-container no encontrado');
    return;
  }

  onAuthStateChanged(auth, async user => {
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
                        (userData.permissions && userData.permissions.includes('Prestaciones:CtsProveedores'));
      if (!hasAccess) {
        container.innerHTML = '<p>Acceso denegado. No tienes permisos para acceder a este módulo.</p>';
        return;
      }

      await loadEmpresas();
      await loadCtsProveedores();

      registrarBtn.addEventListener('click', async () => {
        const nombre = nombreInput.value.trim();
        const empresaId = empresaSelect.value;
        const celular = celularInput.value.trim();
        const telefono = telefonoInput.value.trim();
        const correo = correoInput.value.trim();
        const observacion = observacionInput.value.trim();

        if (!nombre) {
          showSuccessMessage('Por favor, complete el campo Nombre', false);
          return;
        }
        if (!empresaId) {
          showSuccessMessage('Por favor, seleccione una Empresa', false);
          return;
        }
        if (!validateEmail(correo)) {
          showSuccessMessage('Por favor, ingrese un correo válido', false);
          return;
        }
        if (!validatePhone(celular)) {
          showSuccessMessage('Por favor, ingrese un celular válido (solo dígitos y espacios)', false);
          return;
        }
        if (!validatePhone(telefono)) {
          showSuccessMessage('Por favor, ingrese un teléfono válido (solo dígitos y espacios)', false);
          return;
        }

        try {
          showModal(registerModal, registerProgress, 0);
          const duplicateCheck = await checkDuplicate(nombre, empresaId);
          if (duplicateCheck.isDuplicate) {
            showSuccessMessage(`Error: Ya existe un contacto con ${duplicateCheck.value}`, false);
            hideModal(registerModal);
            return;
          }
          const user = auth.currentUser;
          if (!user) throw new Error('Usuario no autenticado');
          const fullName = await getUserFullName();
          const ctsProveedorId = await getNextCtsProveedorId();
          const fechaCreacion = new Date();
          const ctsProveedorRef = doc(collection(db, 'ctsProveedores'));
          const empresa = empresas.find(emp => emp.id === empresaId);
          if (!empresa) {
            showSuccessMessage('Error: Empresa seleccionada no encontrada', false);
            hideModal(registerModal);
            return;
          }
          const nombreEmpresa = empresa.nombreEmpresa || 'Sin nombre';
          const cleanedCelular = cleanPhoneNumber(celular);
          const cleanedTelefono = cleanPhoneNumber(telefono);
          const celularFormatted = celular;
          const ctsProveedorData = {
            id: ctsProveedorId,
            nombre,
            empresaId,
            nombreEmpresa,
            celular: cleanedCelular,
            celularFormatted,
            telefono: cleanedTelefono,
            correo,
            observacion,
            fechaCreacion,
            usuario: fullName,
            uid: user.uid
          };
          const batch = writeBatch(db);
          batch.set(ctsProveedorRef, ctsProveedorData);
          const logRef = doc(collection(db, 'ctsProveedores', ctsProveedorRef.id, 'logs'));
          batch.set(logRef, {
            action: 'created',
            details: `Contacto de proveedor "${nombre}" creado`,
            timestamp: new Date(),
            user: fullName,
            uid: user.uid
          });
          await batch.commit();
          showModal(registerModal, registerProgress, 100);
          setTimeout(() => {
            hideModal(registerModal);
            showSuccessMessage('Contacto de proveedor registrado exitosamente');
            nombreInput.value = '';
            empresaSelect.value = '';
            celularInput.value = '';
            telefonoInput.value = '';
            correoInput.value = '';
            observacionInput.value = '';
            ctsProveedores.push({ docId: ctsProveedorRef.id, ...ctsProveedorData });
            renderTable();
          }, 300);
        } catch (err) {
          showSuccessMessage('Error al registrar contacto de proveedor: ' + err.message, false);
          hideModal(registerModal);
        }
      });

      saveEditBtn.addEventListener('click', async () => {
        const nombre = editNombreInput.value.trim();
        const empresaId = editEmpresaSelect.value;
        const celular = editCelularInput.value.trim();
        const telefono = editTelefonoInput.value.trim();
        const correo = editCorreoInput.value.trim();
        const observacion = editObservacionInput.value.trim();

        if (!nombre) {
          showSuccessMessage('Por favor, complete el campo Nombre', false);
          return;
        }
        if (!empresaId) {
          showSuccessMessage('Por favor, seleccione una Empresa', false);
          return;
        }
        if (!validateEmail(correo)) {
          showSuccessMessage('Por favor, ingrese un correo válido', false);
          return;
        }
        if (!validatePhone(celular)) {
          showSuccessMessage('Por favor, ingrese un celular válido (solo dígitos y espacios)', false);
          return;
        }
        if (!validatePhone(telefono)) {
          showSuccessMessage('Por favor, ingrese un teléfono válido (solo dígitos y espacios)', false);
          return;
        }

        try {
          const duplicateCheck = await checkDuplicate(nombre, empresaId, currentEditId);
          if (duplicateCheck.isDuplicate) {
            showSuccessMessage(`Error: Ya existe un contacto con ${duplicateCheck.value}`, false);
            return;
          }
          const ctsProveedorRef = doc(db, 'ctsProveedores', currentEditId);
          const ctsProveedorSnap = await getDoc(ctsProveedorRef);
          const oldData = ctsProveedorSnap.data();
          const fullName = await getUserFullName();
          const empresa = empresas.find(emp => emp.id === empresaId);
          if (!empresa) {
            showSuccessMessage('Error: Empresa seleccionada no encontrada', false);
            return;
          }
          const nombreEmpresa = empresa.nombreEmpresa || 'Sin nombre';
          const cleanedCelular = cleanPhoneNumber(celular);
          const cleanedTelefono = cleanPhoneNumber(telefono);
          const celularFormatted = celular;
          const changes = [];
          if (oldData.nombre !== nombre) changes.push(`Nombre cambiado de "${oldData.nombre}" a "${nombre}"`);
          if (oldData.empresaId !== empresaId) changes.push(`Empresa cambiada a "${nombreEmpresa}"`);
          if (oldData.celular !== cleanedCelular) changes.push(`Celular cambiado de "${oldData.celularFormatted || ''}" a "${celularFormatted || ''}"`);
          if (oldData.telefono !== cleanedTelefono) changes.push(`Teléfono cambiado de "${oldData.telefono || ''}" a "${cleanedTelefono || ''}"`);
          if (oldData.correo !== correo) changes.push(`Correo cambiado de "${oldData.correo || ''}" a "${correo || ''}"`);
          if (oldData.observacion !== observacion) changes.push(`Observación cambiada de "${oldData.observacion || ''}" a "${observacion || ''}"`);
          const batch = writeBatch(db);
          batch.update(ctsProveedorRef, {
            nombre,
            empresaId,
            nombreEmpresa,
            celular: cleanedCelular,
            celularFormatted,
            telefono: cleanedTelefono,
            correo,
            observacion,
            usuario: fullName,
            fechaActualizacion: new Date()
          });
          if (changes.length > 0) {
            const logRef = doc(collection(db, 'ctsProveedores', currentEditId, 'logs'));
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
          showSuccessMessage('Contacto de proveedor actualizado exitosamente');
          const index = ctsProveedores.findIndex(cts => cts.docId === currentEditId);
          if (index !== -1) {
            ctsProveedores[index] = {
              ...ctsProveedores[index],
              nombre,
              empresaId,
              nombreEmpresa,
              celular: cleanedCelular,
              celularFormatted,
              telefono: cleanedTelefono,
              correo,
              observacion,
              usuario: fullName,
              fechaActualizacion: new Date()
            };
            renderTable();
          }
        } catch (err) {
          showSuccessMessage('Error al actualizar contacto: ' + err.message, false);
        }
      });

      cancelEditBtn.addEventListener('click', () => {
        hideModal(editModal);
      });

      confirmDeleteBtn.addEventListener('click', async () => {
        const id = confirmDeleteBtn.dataset.id;
        try {
          const ctsProveedorRef = doc(db, 'ctsProveedores', id);
          const ctsProveedorSnap = await getDoc(ctsProveedorRef);
          const ctsData = ctsProveedorSnap.data();
          const fullName = await getUserFullName();
          const batch = writeBatch(db);
          batch.delete(ctsProveedorRef);
          const logRef = doc(collection(db, 'ctsProveedores', id, 'logs'));
          batch.set(logRef, {
            action: 'deleted',
            details: `Contacto de proveedor "${ctsData.nombre}" eliminado`,
            timestamp: new Date(),
            user: fullName,
            uid: auth.currentUser.uid
          });
          await batch.commit();
          hideModal(deleteModal);
          showSuccessMessage('Contacto de proveedor eliminado exitosamente');
          ctsProveedores = ctsProveedores.filter(cts => cts.docId !== id);
          renderTable();
          totalRecords.textContent = `Total de registros: ${ctsProveedores.length}`;
          totalPages = Math.ceil(ctsProveedores.length / recordsPerPage);
          updatePagination();
        } catch (err) {
          showSuccessMessage('Error al eliminar contacto: ' + err.message, false);
        }
      });

      cancelDeleteBtn.addEventListener('click', () => {
        hideModal(deleteModal);
      });

      ctsProveedoresTableBody.addEventListener('click', e => {
        const id = e.target.dataset.id;
        const ctsProveedor = ctsProveedores.find(cts => cts.docId === id);
        if (!ctsProveedor) return;
        if (e.target.classList.contains('fa-edit')) {
          openEditModal(ctsProveedor);
        } else if (e.target.classList.contains('fa-trash')) {
          openDeleteModal(ctsProveedor);
        } else if (e.target.classList.contains('fa-history')) {
          loadLogs(ctsProveedor.docId);
        }
      });

      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          lastVisible = firstVisible;
          loadCtsProveedores();
        }
      });

      nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
          currentPage++;
          loadCtsProveedores();
        }
      });

      exportExcelBtn.addEventListener('click', () => {
        const data = ctsProveedores.map(cts => {
          const fechaCreacion = cts.fechaCreacion && typeof cts.fechaCreacion.toDate === 'function'
            ? cts.fechaCreacion.toDate()
            : cts.fechaCreacion instanceof Date
            ? cts.fechaCreacion
            : null;
          const empresa = empresas.find(emp => emp.id === cts.empresaId);
          const nombreEmpresa = empresa ? empresa.nombreEmpresa : 'Sin empresa';
          return {
            ID: cts.id,
            Nombre: cts.nombre,
            Empresa: nombreEmpresa,
            Celular: cts.celularFormatted || '',
            Teléfono: cts.telefono || '',
            Correo: cts.correo || '',
            Observación: cts.observacion || '',
            'Fecha de Creación': fechaCreacion && !isNaN(fechaCreacion)
              ? fechaCreacion.toLocaleString('es-ES')
              : 'Sin fecha',
            Usuario: cts.usuario
          };
        });
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'CtsProveedores');
        XLSX.writeFile(workbook, 'cts-proveedores.xlsx');
      });

      document.querySelectorAll('.filter-icon').forEach(icon => {
        icon.addEventListener('click', e => {
          const column = e.target.dataset.column;
          if (column === 'acciones') return;

          if (e.target.classList.contains('fa-filter-circle-xmark')) {
            delete filters[column];
            renderTable();
            return;
          }

          document.querySelectorAll('.filter-input-container').forEach(input => input.remove());
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

      document.addEventListener('click', e => {
        if (!e.target.classList.contains('fa-filter') && !e.target.classList.contains('fa-filter-circle-xmark') && !e.target.closest('.filter-input-container')) {
          document.querySelectorAll('.filter-input-container').forEach(input => input.remove());
        }
      });

      closeLogBtn.addEventListener('click', () => {
        hideModal(logModal);
      });
    } catch (err) {
      container.innerHTML = `<p>Error al verificar permisos: ${err.message}</p>`;
    }
  });
}

function openEditModal(ctsProveedor) {
  currentEditId = ctsProveedor.docId;
  editNombreInput.value = ctsProveedor.nombre;
  editEmpresaSelect.value = ctsProveedor.empresaId || '';
  editCelularInput.value = ctsProveedor.celularFormatted || '';
  editTelefonoInput.value = ctsProveedor.telefono || '';
  editCorreoInput.value = ctsProveedor.correo || '';
  editObservacionInput.value = ctsProveedor.observacion || '';
  editModal.style.display = 'flex';
}

function openDeleteModal(ctsProveedor) {
  deleteMessage.textContent = `¿Estás seguro de que deseas eliminar el contacto de proveedor "${ctsProveedor.nombre}" (ID: ${ctsProveedor.id})?`;
  confirmDeleteBtn.dataset.id = ctsProveedor.docId;
  deleteModal.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
}