import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, updatePassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAUI_wgnkY7XYUuU6wFGebi7hNKd9Nfqeg",
  authDomain: "overdrive-d3a99.firebaseapp.com",
  projectId: "overdrive-d3a99",
  storageBucket: "overdrive-d3a99.firebasestorage.app",
  messagingSenderId: "874128741475",
  appId: "1:874128741475:web:5426b04da2a609d01c1456",
  measurementId: "G-4JBE20JPB5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const submenuData = {
  Usuarios: [{ name: 'Registros' }],
  Implantes: [
    { name: 'Cargos Implantes' },
    { name: 'Cargos Consignación' },
    { name: 'Pacientes' },
    { name: 'Códigos' },
    { name: 'Datos Pacientes' },
    { name: 'Historial' }
  ],
  Consignacion: [
    { name: 'Asignación' },
    { name: 'Ficha' },
    { name: 'Lotes' }
  ],
  Corporativo: [
    { name: 'Reporte 2024' },
    { name: 'Reporte 2025' },
    { name: 'RP 2024' },
    { name: 'RO 2025' }
  ],
  Laboratorio: [
    { name: 'Facturación' },
    { name: 'Órdenes de Compra' },
    { name: 'Detalles' }
  ],
  Prestaciones: [
    { name: 'Empresas' },
    { name: 'Médicos' },
    { name: 'Previsiones' },
    { name: 'Áreas Clínicas' },
    { name: 'CTS Proveedores' },
    { name: 'CTS Clínico' }
  ],
  Apuntes: [
    { name: 'Notas' },
    { name: 'Block' }
  ]
};

const registerForm = document.getElementById('registrar-btn');
const roleSelect = document.getElementById('role');
const successModal = document.getElementById('success-modal');
const successMessage = successModal.querySelector('.success-message');
const successIcon = document.getElementById('success-icon');
const loadingModal = document.getElementById('loading-modal');
const closeModalButtons = document.querySelectorAll('.close-modal');
const editForm = document.getElementById('edit-form');
const editModulesContainer = document.getElementById('edit-modulesContainer');
const editPermisosContainer = document.getElementById('edit-permisos-container');
let selectedPermissions = [];

async function checkAdminAccess() {
  const user = auth.currentUser;
  if (!user) {
    showModal('error', 'No estás autenticado. Por favor, inicia sesión nuevamente.');
    return false;
  }
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (!userDoc.exists() || userDoc.data().role !== 'Administrador') {
    showModal('error', 'Acceso denegado. Solo los administradores pueden acceder a este módulo.');
    return false;
  }
  return true;
}

async function init() {
  const container = document.querySelector('.registros-container');
  if (!container) return;
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    container.innerHTML = '<p>Acceso denegado. Solo los administradores pueden acceder a este módulo.</p>';
    return;
  }
  loadUsers();
}

function validateRUT(rut) {
  rut = rut.replace(/[^0-9kK]/g, '');
  if (rut.length < 2) return false;
  const body = rut.slice(0, -1);
  const dv = rut.slice(-1).toUpperCase();
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const mod = 11 - (sum % 11);
  const expectedDV = mod === 11 ? '0' : mod === 10 ? 'K' : mod.toString();
  return expectedDV === dv;
}

function validateForm(data) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.fullName || data.fullName.length < 3) {
    showModal('error', 'El nombre completo debe tener al menos 3 caracteres.');
    return false;
  }
  if (!validateRUT(data.rut)) {
    showModal('error', 'El RUT ingresado no es válido.');
    return false;
  }
  if (!data.gender) {
    showModal('error', 'Seleccione un género.');
    return false;
  }
  if (!data.birthDate) {
    showModal('error', 'Seleccione una fecha de nacimiento.');
    return false;
  }
  if (!emailRegex.test(data.email)) {
    showModal('error', 'El correo electrónico no es válido.');
    return false;
  }
  if (!data.username || data.username.length < 3) {
    showModal('error', 'El nombre de usuario debe tener al menos 3 caracteres.');
    return false;
  }
  if (!data.password || data.password.length < 6) {
    showModal('error', 'La contraseña debe tener al menos 6 caracteres.');
    return false;
  }
  if (data.password !== data.confirmPassword) {
    showModal('error', 'Las contraseñas no coinciden.');
    return false;
  }
  if (!data.role) {
    showModal('error', 'Seleccione un rol.');
    return false;
  }
  return true;
}

function showModal(type, message) {
  successModal.className = `modal ${type}`;
  successMessage.textContent = message;
  successIcon.className = `fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
  successModal.style.display = 'flex';
  setTimeout(() => {
    successModal.style.display = 'none';
  }, 3000);
}

function toggleLoading(show) {
  loadingModal.style.display = show ? 'flex' : 'none';
}

function getAllPermissions() {
  const permissions = [];
  Object.keys(submenuData).forEach(module => {
    submenuData[module].forEach(sub => {
      permissions.push(`${module}:${sub.name}`);
    });
  });
  return permissions;
}

function populatePermissions(container, selectedPermissions = []) {
  container.innerHTML = '<p>Seleccione los permisos:</p>';
  Object.keys(submenuData).forEach(module => {
    const moduleDiv = document.createElement('div');
    moduleDiv.classList.add('module-permisos');
    moduleDiv.innerHTML = `<h3>${module}</h3>`;
    submenuData[module].forEach(sub => {
      const label = document.createElement('label');
      const isChecked = selectedPermissions.includes(`${module}:${sub.name}`);
      label.innerHTML = `
        <input type="checkbox" name="permissions" value="${module}:${sub.name}" ${isChecked ? 'checked' : ''}>
        ${sub.name}
      `;
      moduleDiv.appendChild(label);
    });
    container.appendChild(moduleDiv);
  });
}

function formatDateForDisplay(dateStr) {
  if (!dateStr) return 'Sin fecha';
  const date = new Date(dateStr);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${day}-${month}-${year}`;
}

function formatDateForInput(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function loadUsers(page = 1, pageSize = 10) {
  const tableContainer = document.getElementById('table-container');
  const tableBody = document.querySelector('#registros-table tbody');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const pageInfo = document.getElementById('page-info');
  const totalRecords = document.getElementById('total-records');
  if (!tableContainer || !tableBody || !prevBtn || !nextBtn || !pageInfo || !totalRecords) {
    toggleLoading(false);
    return;
  }
  toggleLoading(true);
  tableBody.innerHTML = '';
  try {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
      tableBody.innerHTML = '<tr><td colspan="10">Acceso denegado. Solo los administradores pueden ver los usuarios.</td></tr>';
      tableContainer.style.display = 'block';
      toggleLoading(false);
      return;
    }
    const usersSnapshot = await getDocs(collection(db, 'users'));
    if (usersSnapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="10">No hay usuarios registrados.</td></tr>';
      tableContainer.style.display = 'block';
      toggleLoading(false);
      return;
    }
    const users = [];
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      users.push({ id: doc.id, ...data });
    });
    const totalUsers = users.length;
    const totalPages = Math.ceil(totalUsers / pageSize);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedUsers = users.slice(start, end);
    paginatedUsers.forEach(user => {
      const row = document.createElement('tr');
      const iconClass = user.gender === 'Hombre' ? 'fa-male' : user.gender === 'Mujer' ? 'fa-female' : 'fa-genderless';
      row.innerHTML = `
        <td>${user.id.slice(0, 8)}...</td>
        <td>
          <button class="edit-btn action-icon"><i class="fas fa-edit"></i></button>
          <button class="delete-btn action-icon"><i class="fas fa-trash"></i></button>
          <button class="view-permissions-btn action-icon"><i class="fas fa-eye"></i></button>
        </td>
        <td>${user.fullName || 'Sin nombre'}</td>
        <td>${user.rut || 'Sin RUT'}</td>
        <td>${user.email || 'Sin correo'}</td>
        <td>${user.gender || 'Sin género'}</td>
        <td><i class="fas ${iconClass}"></i></td>
        <td>${user.username || 'Sin usuario'}</td>
        <td>${user.role || 'Sin rol'}</td>
        <td>${formatDateForDisplay(user.birthDate)}</td>
      `;
      tableBody.appendChild(row);
      row.querySelector('.edit-btn').addEventListener('click', () => {
        const editModal = document.getElementById('edit-modal');
        if (!editModal) return;
        editForm.dataset.uid = user.id;
        document.getElementById('edit-fullName').value = user.fullName || '';
        document.getElementById('edit-rut').value = user.rut || '';
        document.getElementById('edit-gender').value = user.gender || 'Otro';
        document.getElementById('edit-birthDate').value = formatDateForInput(user.birthDate);
        document.getElementById('edit-email').value = user.email || '';
        document.getElementById('edit-username').value = user.username || '';
        document.getElementById('edit-password').value = '';
        document.getElementById('edit-role').value = user.role || 'Operador';
        editModulesContainer.style.display = user.role === 'Operador' ? 'block' : 'none';
        populatePermissions(editPermisosContainer, user.permissions || []);
        editModal.style.display = 'flex';
      });
      row.querySelector('.delete-btn').addEventListener('click', () => {
        const deleteModal = document.getElementById('delete-modal');
        if (!deleteModal) return;
        document.getElementById('delete-fullName').textContent = user.fullName || 'Sin nombre';
        document.getElementById('delete-rut').textContent = user.rut || 'Sin RUT';
        document.getElementById('delete-email').textContent = user.email || 'Sin correo';
        deleteModal.dataset.uid = user.id;
        deleteModal.dataset.username = user.username;
        deleteModal.style.display = 'flex';
      });
      row.querySelector('.view-permissions-btn').addEventListener('click', () => {
        const permissionsModal = document.getElementById('permissions-modal');
        const permissionsRole = document.getElementById('permissions-role');
        const permissionsList = document.getElementById('permissions-list');
        if (!permissionsModal || !permissionsRole || !permissionsList) return;
        permissionsRole.textContent = user.role;
        permissionsList.innerHTML = '';
        if (user.role === 'Administrador') {
          permissionsList.innerHTML = '<p>Acceso completo a todos los módulos.</p>';
        } else if (user.permissions && user.permissions.length) {
          const modules = {};
          user.permissions.forEach(perm => {
            const [module, name] = perm.split(':');
            if (!modules[module]) modules[module] = [];
            modules[module].push(name);
          });
          Object.keys(modules).forEach(module => {
            const moduleDiv = document.createElement('div');
            moduleDiv.className = 'permission-module';
            moduleDiv.innerHTML = `<h3>${module}</h3>`;
            const ul = document.createElement('ul');
            modules[module].forEach(name => {
              const li = document.createElement('li');
              li.textContent = name;
              ul.appendChild(li);
            });
            moduleDiv.appendChild(ul);
            permissionsList.appendChild(moduleDiv);
          });
        } else {
          permissionsList.innerHTML = '<p>Sin permisos asignados.</p>';
        }
        permissionsModal.style.display = 'flex';
      });
    });
    tableContainer.style.display = 'block';
    totalRecords.textContent = `Total de registros: ${totalUsers}`;
    pageInfo.textContent = `Página ${page} de ${totalPages}`;
    prevBtn.disabled = page === 1;
    nextBtn.disabled = page === totalPages;
    prevBtn.onclick = () => loadUsers(page - 1, pageSize);
    nextBtn.onclick = () => loadUsers(page + 1, pageSize);
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="10">Error al cargar usuarios: ${error.message}</td></tr>`;
    tableContainer.style.display = 'block';
  } finally {
    toggleLoading(false);
  }
}

roleSelect.addEventListener('change', (e) => {
  if (e.target.value === 'Operador') {
    const permissionsSelectionModal = document.getElementById('permissions-selection-modal');
    const permissionsSelectionContainer = document.getElementById('permissions-selection-container');
    if (!permissionsSelectionModal || !permissionsSelectionContainer) return;
    populatePermissions(permissionsSelectionContainer, selectedPermissions);
    permissionsSelectionModal.style.display = 'flex';
  } else {
    selectedPermissions = getAllPermissions();
  }
});

registerForm.addEventListener('click', async (e) => {
  e.preventDefault();
  toggleLoading(true);
  const data = {
    fullName: document.getElementById('fullName').value.trim(),
    rut: document.getElementById('rut').value.trim(),
    gender: document.getElementById('gender').value,
    birthDate: document.getElementById('birthDate').value,
    email: document.getElementById('email').value.trim().toLowerCase(),
    username: document.getElementById('username').value.trim().toLowerCase(),
    password: document.getElementById('password').value,
    confirmPassword: document.getElementById('confirmPassword').value,
    role: document.getElementById('role').value
  };
  if (!validateForm(data)) {
    toggleLoading(false);
    return;
  }
  try {
    const usernameRef = doc(db, 'usernames', data.username);
    const usernameSnap = await getDoc(usernameRef);
    if (usernameSnap.exists()) {
      showModal('error', 'El nombre de usuario ya está en uso.');
      toggleLoading(false);
      return;
    }
    const adminEmail = auth.currentUser ? auth.currentUser.email : null;
    const adminPassword = localStorage.getItem('adminPassword');
    const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const user = userCredential.user;
    if (adminEmail && adminPassword) {
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    }
    const permissions = data.role === 'Administrador' ? getAllPermissions() : selectedPermissions;
    await setDoc(doc(db, 'users', user.uid), {
      fullName: data.fullName,
      rut: data.rut,
      gender: data.gender,
      birthDate: data.birthDate,
      email: data.email,
      username: data.username,
      role: data.role,
      permissions,
      createdAt: new Date()
    });
    await setDoc(doc(db, 'usernames', data.username), {
      email: data.email,
      userId: user.uid
    });
    showModal('success', 'Usuario registrado exitosamente.');
    document.getElementById('fullName').value = '';
    document.getElementById('rut').value = '';
    document.getElementById('gender').value = '';
    document.getElementById('birthDate').value = '';
    document.getElementById('email').value = '';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('role').value = '';
    selectedPermissions = [];
    loadUsers();
  } catch (error) {
    let errorMessage = 'Error al registrar el usuario.';
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'El correo electrónico ya está en uso.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'El correo electrónico no es válido.';
    }
    showModal('error', errorMessage);
  } finally {
    toggleLoading(false);
  }
});

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  toggleLoading(true);
  const data = {
    fullName: document.getElementById('edit-fullName').value.trim(),
    rut: document.getElementById('edit-rut').value.trim(),
    gender: document.getElementById('edit-gender').value,
    birthDate: document.getElementById('edit-birthDate').value,
    email: document.getElementById('edit-email').value.trim().toLowerCase(),
    username: document.getElementById('edit-username').value.trim().toLowerCase(),
    password: document.getElementById('edit-password').value,
    role: document.getElementById('edit-role').value
  };
  if (!validateForm({ ...data, confirmPassword: data.password || 'dummy' })) {
    toggleLoading(false);
    return;
  }
  try {
    const uid = editForm.dataset.uid;
    const usernameRef = doc(db, 'usernames', data.username);
    const usernameSnap = await getDoc(usernameRef);
    if (usernameSnap.exists() && usernameSnap.data().userId !== uid) {
      showModal('error', 'El nombre de usuario ya está en uso.');
      toggleLoading(false);
      return;
    }
    let permissions = [];
    if (data.role === 'Administrador') {
      permissions = getAllPermissions();
    } else {
      document.querySelectorAll('#edit-permisos-container input[name="permissions"]:checked').forEach(checkbox => {
        permissions.push(checkbox.value);
      });
    }
    const userData = {
      fullName: data.fullName,
      rut: data.rut,
      gender: data.gender,
      birthDate: data.birthDate,
      email: data.email,
      username: data.username,
      role: data.role,
      permissions,
      updatedAt: new Date()
    };
    await updateDoc(doc(db, 'users', uid), userData);
    await setDoc(doc(db, 'usernames', data.username), {
      email: data.email,
      userId: uid
    });
    if (data.password) {
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.uid === uid) {
        await updatePassword(currentUser, data.password);
      } else {
        throw new Error('No tienes permisos para cambiar la contraseña de este usuario');
      }
    }
    showModal('success', 'Usuario actualizado exitosamente.');
    document.getElementById('edit-modal').style.display = 'none';
    loadUsers();
  } catch (error) {
    let errorMessage = 'Error al actualizar el usuario.';
    if (error.code === 'auth/invalid-email') {
      errorMessage = 'El correo electrónico no es válido.';
    }
    showModal('error', errorMessage);
  } finally {
    toggleLoading(false);
  }
});

document.getElementById('edit-role').addEventListener('change', (e) => {
  editModulesContainer.style.display = e.target.value === 'Operador' ? 'block' : 'none';
  if (e.target.value === 'Operador') {
    populatePermissions(editPermisosContainer);
  } else {
    editPermisosContainer.innerHTML = '<p>Seleccione los permisos:</p>';
  }
});

document.getElementById('cancel-edit-btn').addEventListener('click', () => {
  document.getElementById('edit-modal').style.display = 'none';
});

document.getElementById('confirm-permissions-btn').addEventListener('click', () => {
  selectedPermissions = [];
  document.querySelectorAll('#permissions-selection-container input[name="permissions"]:checked').forEach(checkbox => {
    selectedPermissions.push(checkbox.value);
  });
  document.getElementById('permissions-selection-modal').style.display = 'none';
  registerForm.click();
});

document.getElementById('cancel-permissions-btn').addEventListener('click', () => {
  document.getElementById('permissions-selection-modal').style.display = 'none';
  selectedPermissions = [];
});

document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
  const deleteModal = document.getElementById('delete-modal');
  if (!deleteModal) return;
  const uid = deleteModal.dataset.uid;
  const username = deleteModal.dataset.username;
  try {
    await deleteDoc(doc(db, 'users', uid));
    await deleteDoc(doc(db, 'usernames', username));
    showModal('success', 'Usuario eliminado exitosamente.');
    document.getElementById('delete-modal').style.display = 'none';
    loadUsers();
  } catch (error) {
    showModal('error', `Error al eliminar: ${error.message}`);
  }
});

document.getElementById('cancel-delete-btn').addEventListener('click', () => {
  document.getElementById('delete-modal').style.display = 'none';
});

closeModalButtons.forEach(button => {
  button.addEventListener('click', () => {
    button.closest('.modal').style.display = 'none';
  });
});

document.addEventListener('DOMContentLoaded', () => {
  init();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
}