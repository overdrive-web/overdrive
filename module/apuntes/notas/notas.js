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

const crearNotaBtn = document.getElementById('crear-nota-btn');
const notaModal = document.getElementById('nota-modal');
const notaModalTitle = document.getElementById('nota-modal-title');
const notaTituloInput = document.getElementById('nota-titulo');
const notaContenidoInput = document.getElementById('nota-contenido');
const saveNotaBtn = document.getElementById('save-nota-btn');
const cancelNotaBtn = document.getElementById('cancel-nota-btn');
const deleteModal = document.getElementById('delete-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const successModal = document.getElementById('success-modal');
const successIcon = document.getElementById('success-icon');
const successMessage = document.querySelector('.success-message');
const notasList = document.getElementById('notas-list');

let currentNotaId = null;

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

async function loadNotas() {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuario no autenticado');

        const notasQuery = query(
            collection(db, 'notas'),
            where('uid', 'in', [user.uid, '']) // Permite notas del usuario o compartidas
        );
        const notasSnapshot = await getDocs(notasQuery);
        notasList.innerHTML = '';
        notasSnapshot.forEach(doc => {
            const nota = doc.data();
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="nota-title">${nota.titulo}</span>
                <div class="nota-dates">
                    <span>Creado: ${formatDate(nota.fechaCreacion)}</span>
                    ${nota.fechaModificacion ? `<span>Modificado: ${formatDate(nota.fechaModificacion)}</span>` : ''}
                </div>
                <div class="nota-actions">
                    <i class="fas fa-edit" data-id="${doc.id}" title="Editar"></i>
                    <i class="fas fa-trash" data-id="${doc.id}" title="Eliminar"></i>
                </div>
            `;
            notasList.appendChild(li);

            li.querySelector('.nota-title').addEventListener('click', () => openEditModal(doc.id, nota));
            li.querySelector('.fa-edit').addEventListener('click', () => openEditModal(doc.id, nota));
            li.querySelector('.fa-trash').addEventListener('click', () => openDeleteModal(doc.id));
        });
    } catch (error) {
        console.error('Error al cargar notas:', error);
        showSuccessModal(`Error al cargar notas: ${error.message}`, true);
    }
}

function openEditModal(id = null, nota = null) {
    notaModal.style.display = 'flex';
    if (nota) {
        notaModalTitle.textContent = 'Editar Nota';
        notaTituloInput.value = nota.titulo;
        notaContenidoInput.value = nota.contenido;
        currentNotaId = id;
    } else {
        notaModalTitle.textContent = 'Crear Nueva Nota';
        notaTituloInput.value = '';
        notaContenidoInput.value = '';
        currentNotaId = null;
    }
}

function openDeleteModal(id) {
    currentNotaId = id;
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

async function logAction(notaId, action, data = {}) {
    try {
        await addDoc(collection(db, `notas/${notaId}/logs`), {
            action,
            timestamp: serverTimestamp(),
            uid: auth.currentUser.uid,
            data
        });
    } catch (error) {
        console.error('Error al registrar log:', error);
    }
}

async function saveNota() {
    const titulo = notaTituloInput.value.trim();
    const contenido = notaContenidoInput.value.trim();

    if (!titulo || !contenido) {
        showSuccessModal('Por favor, complete todos los campos.', true);
        return;
    }

    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuario no autenticado');

        if (currentNotaId) {
            // Editar nota existente
            const notaRef = doc(db, 'notas', currentNotaId);
            const updatedData = {
                titulo,
                contenido,
                fechaModificacion: serverTimestamp()
            };
            await updateDoc(notaRef, updatedData);
            await logAction(currentNotaId, 'update', { titulo, contenido });
            showSuccessModal('Nota actualizada correctamente.');
        } else {
            // Crear nueva nota
            const newNota = {
                uid: user.uid,
                titulo,
                contenido,
                fechaCreacion: serverTimestamp(),
                fechaModificacion: null
            };
            const notaRef = await addDoc(collection(db, 'notas'), newNota);
            await logAction(notaRef.id, 'create', newNota);
            showSuccessModal('Nota creada correctamente.');
        }

        loadNotas();
        notaModal.style.display = 'none';
        notaTituloInput.value = '';
        notaContenidoInput.value = '';
        currentNotaId = null;
    } catch (error) {
        console.error('Error al guardar nota:', error);
        showSuccessModal(`Error al guardar nota: ${error.message}`, true);
    }
}

async function deleteNota() {
    try {
        if (!currentNotaId) throw new Error('ID de nota no válido');
        const notaRef = doc(db, 'notas', currentNotaId);
        await logAction(currentNotaId, 'delete');
        await deleteDoc(notaRef);
        showSuccessModal('Nota eliminada correctamente.');
        loadNotas();
        deleteModal.style.display = 'none';
        currentNotaId = null;
    } catch (error) {
        console.error('Error al eliminar nota:', error);
        showSuccessModal(`Error al eliminar nota: ${error.message}`, true);
    }
}

crearNotaBtn.addEventListener('click', () => openEditModal());
cancelNotaBtn.addEventListener('click', () => {
    notaModal.style.display = 'none';
    notaTituloInput.value = '';
    notaContenidoInput.value = '';
    currentNotaId = null;
});
saveNotaBtn.addEventListener('click', saveNota);
confirmDeleteBtn.addEventListener('click', deleteNota);
cancelDeleteBtn.addEventListener('click', () => {
    deleteModal.style.display = 'none';
    currentNotaId = null;
});

// Cargar notas al iniciar
auth.onAuthStateChanged(user => {
    if (user) {
        loadNotas();
    } else {
        showSuccessModal('Usuario no autenticado. Por favor, inicia sesión.', true);
    }
});

// Limpiar al salir del módulo
window.addEventListener('moduleCleanup', () => {
    notaModal.style.display = 'none';
    deleteModal.style.display = 'none';
    successModal.style.display = 'none';
});