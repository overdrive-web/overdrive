import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js';

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

const crearBlocBtn = document.getElementById('crear-bloc-btn');
const blocModal = document.getElementById('bloc-modal');
const blocModalTitle = document.getElementById('bloc-modal-title');
const blocTituloInput = document.getElementById('bloc-titulo');
const blocContenidoInput = document.getElementById('bloc-contenido');
const saveBlocBtn = document.getElementById('save-bloc-btn');
const cancelBlocBtn = document.getElementById('cancel-bloc-btn');
const deleteModal = document.getElementById('delete-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const successModal = document.getElementById('success-modal');
const successIcon = document.getElementById('success-icon');
const successMessage = document.querySelector('.success-message');
const blocList = document.getElementById('bloc-list');

let currentBlocId = null;

function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function loadBlocs() {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuario no autenticado');

        const blocsQuery = query(
            collection(db, 'blocs'),
            where('uid', 'in', [user.uid, ''])
        );
        const blocsSnapshot = await getDocs(blocsQuery);
        blocList.innerHTML = '';
        blocsSnapshot.forEach(doc => {
            const bloc = doc.data();
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="bloc-title">${bloc.titulo}</span>
                <div class="bloc-dates">
                    <span>Creado: ${formatDate(bloc.fechaCreacion)}</span>
                    ${bloc.fechaModificacion ? `<span>Modificado: ${formatDate(bloc.fechaModificacion)}</span>` : ''}
                </div>
                <div class="bloc-actions">
                    <i class="fas fa-edit" data-id="${doc.id}" title="Editar"></i>
                    <i class="fas fa-trash" data-id="${doc.id}" title="Eliminar"></i>
                </div>
            `;
            blocList.appendChild(li);

            li.querySelector('.bloc-title').addEventListener('click', () => openEditModal(doc.id, bloc));
            li.querySelector('.fa-edit').addEventListener('click', () => openEditModal(doc.id, bloc));
            li.querySelector('.fa-trash').addEventListener('click', () => openDeleteModal(doc.id));
        });
    } catch (error) {
        console.error('Error al cargar blocs:', error);
        showSuccessModal(`Error al cargar blocs: ${error.message}`, true);
    }
}

function openEditModal(id = null, bloc = null) {
    blocModal.style.display = 'flex';
    if (bloc) {
        blocModalTitle.textContent = 'Editar Entrada';
        blocTituloInput.value = bloc.titulo;
        blocContenidoInput.value = bloc.contenido;
        currentBlocId = id;
    } else {
        blocModalTitle.textContent = 'Crear Nueva Entrada';
        blocTituloInput.value = '';
        blocContenidoInput.value = '';
        currentBlocId = null;
    }
}

function openDeleteModal(id) {
    currentBlocId = id;
    deleteModal.style.display = 'flex';
}

function showSuccessModal(message, isError = false) {
    successIcon.className = `fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'}`;
    successMessage.textContent = message;
    successModal.classList.remove('success', 'error');
    successModal.classList.add(isError ? 'error' : 'success');
    successModal.style.display = 'block';
    setTimeout(() => {
        successModal.style.display = 'none';
    }, 3000);
}

async function logAction(blocId, action, data = {}) {
    try {
        await addDoc(collection(db, `blocs/${blocId}/logs`), {
            action,
            timestamp: serverTimestamp(),
            uid: auth.currentUser.uid,
            data
        });
    } catch (error) {
        console.error('Error al registrar log:', error);
    }
}

async function saveBloc() {
    const titulo = blocTituloInput.value.trim();
    const contenido = blocContenidoInput.value.trim();

    if (!titulo || !contenido) {
        showSuccessModal('Por favor, complete todos los campos.', true);
        return;
    }

    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuario no autenticado');

        if (currentBlocId) {
            // Editar entrada existente
            const blocRef = doc(db, 'blocs', currentBlocId);
            const updatedData = {
                titulo,
                contenido,
                fechaModificacion: serverTimestamp()
            };
            await updateDoc(blocRef, updatedData);
            await logAction(currentBlocId, 'update', { titulo, contenido });
            showSuccessModal('Entrada actualizada correctamente.');
        } else {
            // Crear nueva entrada
            const newBloc = {
                uid: user.uid,
                titulo,
                contenido,
                fechaCreacion: serverTimestamp(),
                fechaModificacion: null
            };
            const blocRef = await addDoc(collection(db, 'blocs'), newBloc);
            await logAction(blocRef.id, 'create', newBloc);
            showSuccessModal('Entrada creada correctamente.');
        }

        loadBlocs();
        blocModal.style.display = 'none';
        blocTituloInput.value = '';
        blocContenidoInput.value = '';
        currentBlocId = null;
    } catch (error) {
        console.error('Error al guardar entrada:', error);
        showSuccessModal(`Error al guardar entrada: ${error.message}`, true);
    }
}

async function deleteBloc() {
    try {
        if (!currentBlocId) throw new Error('ID de entrada no válido');
        const blocRef = doc(db, 'blocs', currentBlocId);
        await logAction(currentBlocId, 'delete');
        await deleteDoc(blocRef);
        showSuccessModal('Entrada eliminada correctamente.');
        loadBlocs();
        deleteModal.style.display = 'none';
        currentBlocId = null;
    } catch (error) {
        console.error('Error al eliminar entrada:', error);
        showSuccessModal(`Error al eliminar entrada: ${error.message}`, true);
    }
}

crearBlocBtn.addEventListener('click', () => openEditModal());
cancelBlocBtn.addEventListener('click', () => {
    blocModal.style.display = 'none';
    blocTituloInput.value = '';
    blocContenidoInput.value = '';
    currentBlocId = null;
});
saveBlocBtn.addEventListener('click', saveBloc);
confirmDeleteBtn.addEventListener('click', deleteBloc);
cancelDeleteBtn.addEventListener('click', () => {
    deleteModal.style.display = 'none';
    currentBlocId = null;
});

// Cargar blocs al iniciar
auth.onAuthStateChanged(user => {
    if (user) {
        loadBlocs();
    } else {
        showSuccessModal('Usuario no autenticado. Por favor, inicia sesión.', true);
    }
});

// Limpiar al salir del módulo
window.addEventListener('moduleCleanup', () => {
    blocModal.style.display = 'none';
    deleteModal.style.display = 'none';
    successModal.style.display = 'none';
});