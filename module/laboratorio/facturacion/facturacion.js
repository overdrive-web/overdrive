import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, getDoc, updateDoc, query, orderBy, limit, startAfter, writeBatch, where } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';

const firebaseConfig = {
    apiKey: "AIzaSyAUI_wgnkY7XYUuU6wFGebi7hNKd9Nfqeg",
    authDomain: "overdrive-d3a99.firebaseapp.com",
    projectId: "overdrive-d3a99",
    storageBucket: "overdrive-d3a99.appspot.com",
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

const numeroFacturaInput = document.getElementById('numero-factura');
const fechaFacturaInput = document.getElementById('fecha-factura');
const montoFacturaInput = document.getElementById('monto-factura');
const ocInput = document.getElementById('oc');
const fechaOCInput = document.getElementById('fecha-oc');
const proveedorInput = document.getElementById('proveedor');
const actaInput = document.getElementById('acta');
const fechaSalidaInput = document.getElementById('fecha-salida');
const salidaInput = document.getElementById('salida');
const fechaIngresoInput = document.getElementById('fecha-ingreso');
const ingresarBtn = document.getElementById('ingresar-btn');
const registerModal = document.getElementById('register-modal');
const registerProgress = document.getElementById('register-progress');
const successModal = document.getElementById('success-modal');
const successIcon = document.getElementById('success-icon');
const successMessage = document.getElementById('success-message');
const editModal = document.getElementById('edit-modal');
const editNumeroFacturaInput = document.getElementById('edit-numero-factura');
const editFechaFacturaInput = document.getElementById('edit-fecha-factura');
const editMontoFacturaInput = document.getElementById('edit-monto-factura');
const editOCInput = document.getElementById('edit-oc');
const editFechaOCInput = document.getElementById('edit-fecha-oc');
const editProveedorInput = document.getElementById('edit-proveedor');
const editActaInput = document.getElementById('edit-acta');
const editFechaSalidaInput = document.getElementById('edit-fecha-salida');
const editSalidaInput = document.getElementById('edit-salida');
const editFechaIngresoInput = document.getElementById('edit-fecha-ingreso');
const saveEditBtn = document.getElementById('save-edit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const loadingModal = document.getElementById('loading-modal');
const loadingProgress = document.getElementById('loading-progress');
const deleteModal = document.getElementById('delete-modal');
const deleteMessage = document.getElementById('delete-message');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const facturasTableBody = document.querySelector('#facturas-table tbody');
const tableContainer = document.getElementById('table-container');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const exportExcelBtn = document.getElementById('export-excel-btn');
const downloadFormatBtn = document.getElementById('download-format-btn');
const importFileInput = document.getElementById('import-file');
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
let facturas = [];
let currentEditId = null;
let filters = {};
let lastFacturaId = 0;

const userNameCache = {};

const getUserFullName = async (uid) => {
    if (userNameCache[uid]) return userNameCache[uid];
    try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        const fullName = userSnap.exists() ? userSnap.data().fullName || 'Usuario Desconocido' : 'Usuario no encontrado';
        userNameCache[uid] = fullName;
        return fullName;
    } catch (error) {
        console.error('Error al obtener nombre de usuario:', error);
        userNameCache[uid] = uid;
        return uid;
    }
};

const formatDate = (dateInput, includeTime = false) => {
    if (!dateInput) return '';
    let date;
    try {
        if (dateInput.toDate) {
            date = dateInput.toDate();
        } else if (typeof dateInput === 'string') {
            date = new Date(dateInput);
        } else if (dateInput instanceof Date) {
            date = dateInput;
        } else {
            return '';
        }
        if (isNaN(date.getTime())) return '';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        if (includeTime) {
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
        }
        return `${day}/${month}/${year}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return '';
    }
};

const formatDateTimeForInput = (dateInput) => {
    if (!dateInput) return '';
    let date;
    try {
        if (dateInput.toDate) {
            date = dateInput.toDate();
        } else if (typeof dateInput === 'string') {
            date = new Date(dateInput);
        } else if (dateInput instanceof Date) {
            date = dateInput;
        } else {
            return '';
        }
        if (isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (error) {
        console.error('Error formatting date for input:', error);
        return '';
    }
};

const parseCurrency = (value) => {
    if (!value) return null;
    const cleaned = value.toString().replace(/[^0-9]/g, '');
    const parsed = parseInt(cleaned);
    return isNaN(parsed) ? null : parsed;
};

const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const numericValue = Math.floor(Number(value));
    if (isNaN(numericValue)) return '';
    return numericValue.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const parseFilterDate = (dateStr) => {
    if (!dateStr) return null;
    const ddmmyyyy = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (ddmmyyyy) {
        const [_, day, month, year] = ddmmyyyy;
        return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z`);
    }
    const parsedDate = new Date(dateStr);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const showModal = (modal, progressElement, percentage) => {
    if (modal) {
        modal.style.display = 'flex';
        if (progressElement) {
            progressElement.textContent = `${percentage}%`;
        }
    }
};

const hideModal = (modal) => {
    if (modal) {
        modal.style.display = 'none';
    }
};

const showSuccessMessage = (message, isSuccess = true) => {
    if (successModal && successIcon && successMessage) {
        successModal.className = `modal ${isSuccess ? 'success' : 'error'}`;
        successIcon.className = `fas fa-${isSuccess ? 'check-circle' : 'exclamation-circle'}`;
        successMessage.textContent = message;
        successModal.style.display = 'flex';
        setTimeout(() => hideModal(successModal), 2000);
    }
};

const fetchOCData = async (oc) => {
    try {
        const ocQuery = query(collection(db, 'ordenesCompra'), where('codigo', '==', oc.trim()));
        const ocSnapshot = await getDocs(ocQuery);
        if (!ocSnapshot.empty) {
            return ocSnapshot.docs[0].data();
        } else {
            showSuccessMessage(`Orden de compra ${oc} no encontrada`, false);
            return null;
        }
    } catch (error) {
        console.error('Error al buscar orden de compra:', error);
        showSuccessMessage(`Error al buscar orden de compra: ${error.message}`, false);
        return null;
    }
};

const updateOCFields = async (ocInputElement, fechaOCInputElement, proveedorInputElement) => {
    const oc = ocInputElement.value.trim();
    if (oc) {
        const ocData = await fetchOCData(oc);
        if (ocData) {
            fechaOCInputElement.value = formatDateTimeForInput(ocData.fecha);
            proveedorInputElement.value = ocData.proveedor || '';
        } else {
            fechaOCInputElement.value = '';
            proveedorInputElement.value = '';
        }
    } else {
        fechaOCInputElement.value = '';
        proveedorInputElement.value = '';
    }
};

if (ocInput && fechaOCInput && proveedorInput) {
    ocInput.addEventListener('input', () => updateOCFields(ocInput, fechaOCInput, proveedorInput));
    ocInput.addEventListener('change', () => updateOCFields(ocInput, fechaOCInput, proveedorInput));
}
if (editOCInput && editFechaOCInput && editProveedorInput) {
    editOCInput.addEventListener('input', () => updateOCFields(editOCInput, editFechaOCInput, editProveedorInput));
    editOCInput.addEventListener('change', () => updateOCFields(editOCInput, editFechaOCInput, editProveedorInput));
}

async function getNextFacturaId() {
    try {
        if (lastFacturaId > 0) {
            lastFacturaId++;
            return lastFacturaId.toString();
        }
        const facturasCollection = collection(db, 'facturas');
        const q = query(facturasCollection, orderBy('facturaIdNumeric', 'desc'), limit(1));
        const querySnapshot = await getDocs(q);
        let nextId = 1;
        if (!querySnapshot.empty) {
            const lastFactura = querySnapshot.docs[0].data();
            nextId = (lastFactura.facturaIdNumeric || 0) + 1;
        }
        lastFacturaId = nextId;
        return nextId.toString();
    } catch (error) {
        console.error('Error al obtener próximo facturaId:', error);
        return null;
    }
}

async function loadFacturas() {
    try {
        showModal(loadingModal, loadingProgress, 0);
        const facturasCollection = collection(db, 'facturas');
        const countSnapshot = await getDocs(facturasCollection);
        const totalRecordsCount = countSnapshot.size;
        totalPages = Math.ceil(totalRecordsCount / recordsPerPage);
        if (totalRecords) {
            totalRecords.textContent = `Total de registros: ${totalRecordsCount}`;
        }

        let q = query(facturasCollection, orderBy('facturaIdNumeric', 'asc'), limit(recordsPerPage));
        if (lastVisible && currentPage > 1) {
            q = query(facturasCollection, orderBy('facturaIdNumeric', 'asc'), startAfter(lastVisible), limit(recordsPerPage));
        }

        Object.keys(filters).forEach(column => {
            if (filters[column]) {
                if (['numeroFactura', 'oc', 'proveedor', 'acta', 'mesIngreso', 'anioIngreso', 'mesSalida', 'anioSalida', 'userName'].includes(column)) {
                    const value = String(filters[column]).trim().toLowerCase();
                    q = query(q, where(column, '>=', value), where(column, '<=', value + '\uf8ff'));
                    if (column === 'oc') {
                    }
                } else if (['montoFactura', 'salida'].includes(column)) {
                    const numericValue = parseCurrency(filters[column]);
                    if (numericValue !== null) {
                        q = query(q, where(column, '==', numericValue));
                    } else {
                        console.warn(`Valor numérico inválido para ${column}: ${filters[column]}`);
                    }
                } else if (['fechaIngreso', 'fechaFactura', 'fechaOC', 'fechaSalida'].includes(column)) {
                    const startDate = parseFilterDate(filters[column]);
                    if (startDate) {
                        const endDate = new Date(startDate.getTime());
                        endDate.setHours(23, 59, 59, 999);
                        q = query(q, where(column, '>=', startDate), where(column, '<=', endDate));
                    } else {
                        console.warn(`Fecha inválida para ${column}: ${filters[column]}`);
                    }
                }
            }
        });

        const querySnapshot = await getDocs(q);
        facturas = [];
        for (let doc of querySnapshot.docs) {
            const data = doc.data();
            data.docId = doc.id;
            data.userName = data.userName || await getUserFullName(data.uid);
            facturas.push(data);
        }
        const ocValues = new Set(facturas.map(f => f.oc));
        if (facturas.length > 0) {
            lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
            firstVisible = querySnapshot.docs[0];
        }
        renderTable();
        updatePagination();
        if (tableContainer) {
            tableContainer.style.display = 'block';
        }
        hideModal(loadingModal);
    } catch (error) {
        console.error('Error al cargar facturas:', error);
        showSuccessMessage(`Error al cargar facturas: ${error.message}. Verifica los índices en Firestore.`, false);
        hideModal(loadingModal);
        if (tableContainer) {
            tableContainer.style.display = 'none';
        }
    }
}

function renderTable() {
    if (!facturasTableBody) return;
    facturasTableBody.innerHTML = '';
    facturas.forEach(factura => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td title="${factura.facturaId}">${factura.facturaId}</td>
            <td>
                <i class="fas fa-edit action-icon" data-id="${factura.docId}" title="Editar"></i>
                <i class="fas fa-trash action-icon" data-id="${factura.docId}" title="Eliminar"></i>
                <i class="fas fa-history action-icon" data-id="${factura.docId}" title="Historial"></i>
            </td>
            <td title="${formatDate(factura.fechaIngreso, true)}">${formatDate(factura.fechaIngreso, true)}</td>
            <td title="${factura.numeroFactura}">${factura.numeroFactura}</td>
            <td title="${formatDate(factura.fechaFactura)}">${formatDate(factura.fechaFactura)}</td>
            <td title="${formatCurrency(factura.montoFactura)}">${formatCurrency(factura.montoFactura)}</td>
            <td title="${factura.oc}">${factura.oc}</td>
            <td title="${formatDate(factura.fechaOC)}">${formatDate(factura.fechaOC)}</td>
            <td title="${factura.proveedor || ''}">${factura.proveedor || ''}</td>
            <td title="${factura.acta || ''}">${factura.acta || ''}</td>
            <td title="${formatDate(factura.fechaSalida)}">${formatDate(factura.fechaSalida)}</td>
            <td title="${formatCurrency(factura.salida)}">${formatCurrency(factura.salida)}</td>
            <td title="${factura.mesIngreso}">${factura.mesIngreso}</td>
            <td title="${factura.anioIngreso}">${factura.anioIngreso}</td>
            <td title="${factura.mesSalida || ''}">${factura.mesSalida || ''}</td>
            <td title="${factura.anioSalida || ''}">${factura.anioSalida || ''}</td>
            <td title="${factura.userName}">${factura.userName}</td>
        `;
        facturasTableBody.appendChild(tr);
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
    if (pageInfo && prevBtn && nextBtn) {
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
    }
}

async function loadLogs(facturaId) {
    try {
        const logsCollection = collection(db, 'facturas', facturaId, 'logs');
        const logQuery = query(logsCollection, orderBy('timestamp', 'desc'));
        const logsSnapshot = await getDocs(logQuery);
        if (logContent) {
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
                    const fechaDisplay = timestamp && !isNaN(timestamp)
                        ? formatDate(timestamp, true)
                        : 'Sin fecha';
                    const logEntry = document.createElement('div');
                    logEntry.className = 'log-entry';
                    logEntry.innerHTML = `
                        <strong>${data.action === 'created' ? 'Creada' : data.action === 'modified' ? 'Modificada' : 'Eliminada'}</strong>: 
                        ${data.description}<br>
                        <small>Fecha: ${fechaDisplay} | Usuario: ${data.user}</small>
                    `;
                    logContent.appendChild(logEntry);
                });
            }
            showModal(logModal);
        }
    } catch (error) {
        console.error('Error al cargar historial:', error);
        showSuccessMessage(`Error al cargar historial: ${error.message}`, false);
    }
}

function setupColumnResizing() {
    const headers = document.querySelectorAll('#facturas-table th.resizeable');
    headers.forEach((header, index) => {
        header.style.position = 'relative';
        header.style.overflow = 'visible';

        let isResizing = false;
        let startX;
        let startWidth;

        const onMouseDown = (e) => {
            const rect = header.getBoundingClientRect();
            const resizeZone = 8;
            if (e.clientX >= rect.right - resizeZone && e.clientX <= rect.right + resizeZone) {
                isResizing = true;
                startX = e.clientX;
                startWidth = header.offsetWidth;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
                e.preventDefault();
            }
        };

        const onMouseMove = (e) => {
            if (!isResizing) return;
            const delta = e.clientX - startX;
            const newWidth = Math.max(80, startWidth + delta);
            header.style.width = `${newWidth}px`;
            header.style.minWidth = `${newWidth}px`;
            header.style.maxWidth = `${newWidth}px`;
            const cells = document.querySelectorAll(`#facturas-table tr td:nth-child(${index + 1})`);
            cells.forEach(cell => {
                cell.style.width = `${newWidth}px`;
                cell.style.minWidth = `${newWidth}px`;
                cell.style.maxWidth = `${newWidth}px`;
            });
        };

        const onMouseUp = () => {
            if (isResizing) {
                isResizing = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
        };

        header.addEventListener('mousedown', onMouseDown);
    });
}

async function normalizeOCField() {
    try {
        const facturasCollection = collection(db, 'facturas');
        const snapshot = await getDocs(facturasCollection);
        const batch = writeBatch(db);
        let updatedCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.oc) {
                const cleanedOC = String(data.oc).trim();
                if (cleanedOC !== data.oc) {
                    batch.update(doc.ref, { oc: cleanedOC });
                    updatedCount++;
                }
            }
        });

        if (updatedCount > 0) {
            await batch.commit();
        } else {
        }
    } catch (error) {
        console.error('Error al normalizar campo oc:', error);
    }
}

async function init() {
    const container = document.querySelector('.facturas-container');
    if (!container) {
        console.error('Contenedor .facturas-container no encontrado');
        return;
    }

    try {
        await setPersistence(auth, browserLocalPersistence);
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                console.warn('Usuario no autenticado, redirigiendo a main.html');
                container.innerHTML = '<p>Error: No estás autenticado. Por favor, inicia sesión nuevamente.</p>';
                setTimeout(() => {
                    window.location.href = 'main.html?error=auth-required';
                }, 5000);
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (!userDoc.exists()) {
                    console.error('Usuario no registrado en la base de datos');
                    container.innerHTML = '<p>Error: Tu cuenta no está registrada en la base de datos. Contacta al administrador.</p>';
                    return;
                }

                const userData = userDoc.data();
                const hasAccess = userData.role === 'Administrador' || 
                    (userData.permissions && userData.permissions.includes('Laboratorio:Facturación'));
                if (!hasAccess) {
                    console.error('Usuario sin permisos para este módulo');
                    container.innerHTML = '<p>Acceso denegado. No tienes permisos para acceder a este módulo.</p>';
                    return;
                }

                await normalizeOCField();
                await loadFacturas();
                setupColumnResizing();

                if (ingresarBtn) {
                    ingresarBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        if (!auth.currentUser) {
                            showSuccessMessage('Sesión expirada. Por favor, inicia sesión nuevamente.', false);
                            setTimeout(() => {
                                window.location.href = 'main.html?error=auth-required';
                            }, 2000);
                            return;
                        }

                        const missingFields = [];
                        if (!numeroFacturaInput?.value) missingFields.push('Número de factura');
                        if (!fechaFacturaInput?.value) missingFields.push('Fecha de factura');
                        if (!montoFacturaInput?.value) missingFields.push('Monto');
                        if (!ocInput?.value) missingFields.push('OC');
                        if (!fechaIngresoInput?.value) missingFields.push('Fecha de ingreso');

                        if (missingFields.length > 0) {
                            showSuccessMessage(`Faltan los siguientes campos: ${missingFields.join(', ')}`, false);
                            return;
                        }

                        const montoFactura = parseCurrency(montoFacturaInput.value);
                        if (!montoFactura) {
                            showSuccessMessage('El monto de la factura debe ser un número válido.', false);
                            return;
                        }

                        const oc = ocInput.value.trim();
                        let ocData = null;
                        if (oc) {
                            ocData = await fetchOCData(oc);
                            if (!ocData) return;
                        }

                        try {
                            showModal(registerModal, registerProgress, 0);
                            const fullName = await getUserFullName(auth.currentUser.uid);
                            const facturaId = await getNextFacturaId();
                            if (!facturaId) {
                                showSuccessMessage('Error al generar ID de factura.', false);
                                hideModal(registerModal);
                                return;
                            }
                            const fechaIngreso = new Date(fechaIngresoInput.value);

                            const facturaData = {
                                facturaId,
                                facturaIdNumeric: parseInt(facturaId),
                                numeroFactura: numeroFacturaInput.value.toLowerCase().trim(),
                                fechaFactura: new Date(fechaFacturaInput.value).toISOString(),
                                montoFactura,
                                oc: oc.trim(),
                                fechaOC: ocData ? ocData.fecha.toISOString() : null,
                                proveedor: ocData?.proveedor || null,
                                acta: actaInput?.value.trim() || null,
                                fechaSalida: fechaSalidaInput?.value ? new Date(fechaSalidaInput.value).toISOString() : null,
                                salida: parseCurrency(salidaInput?.value) || null,
                                fechaIngreso: fechaIngreso.toISOString(),
                                mesIngreso: fechaIngreso.toLocaleString('es', { month: 'long' }).toLowerCase(),
                                anioIngreso: fechaIngreso.getFullYear(),
                                mesSalida: fechaSalidaInput?.value ? new Date(fechaSalidaInput.value).toLocaleString('es', { month: 'long' }).toLowerCase() : null,
                                anioSalida: fechaSalidaInput?.value ? new Date(fechaSalidaInput.value).getFullYear() : null,
                                uid: auth.currentUser.uid,
                                userName: fullName
                            };

                            const facturaRef = doc(collection(db, 'facturas'));
                            const batch = writeBatch(db);
                            batch.set(facturaRef, facturaData);
                            const logRef = doc(collection(db, 'facturas', facturaRef.id, 'logs'));
                            batch.set(logRef, {
                                action: 'created',
                                description: `Factura "${facturaData.numeroFactura}" creada`,
                                timestamp: new Date(),
                                user: fullName,
                                uid: auth.currentUser.uid
                            });

                            await batch.commit();

                            showModal(registerModal, registerProgress, 100);
                            setTimeout(() => {
                                hideModal(registerModal);
                                showSuccessMessage('Factura registrada exitosamente');
                                numeroFacturaInput.value = '';
                                fechaFacturaInput.value = '';
                                montoFacturaInput.value = '';
                                ocInput.value = '';
                                fechaOCInput.value = '';
                                if (proveedorInput) proveedorInput.value = '';
                                if (actaInput) actaInput.value = '';
                                if (fechaSalidaInput) fechaSalidaInput.value = '';
                                if (salidaInput) salidaInput.value = '';
                                fechaIngresoInput.value = '';
                                facturas.push({ docId: facturaRef.id, ...facturaData });
                                renderTable();
                            }, 300);
                        } catch (error) {
                            console.error('Error al registrar factura:', error);
                            showSuccessMessage(`Error al registrar factura: ${error.message}`, false);
                            hideModal(registerModal);
                        }
                    });
                }

                if (saveEditBtn) {
                    saveEditBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        const numeroFactura = editNumeroFacturaInput?.value.trim().toLowerCase();
                        const fechaFactura = editFechaFacturaInput?.value;
                        const montoFactura = parseCurrency(editMontoFacturaInput?.value);
                        const oc = editOCInput?.value.trim();
                        const acta = editActaInput?.value.trim() || null;
                        const fechaSalida = editFechaSalidaInput?.value || null;
                        const salida = parseCurrency(editSalidaInput?.value);
                        const fechaIngreso = editFechaIngresoInput?.value ? new Date(editFechaIngresoInput.value) : null;

                        if (!numeroFactura || !fechaFactura || montoFactura === null || !oc || !fechaIngreso) {
                            showSuccessMessage('Por favor, completa todos los campos requeridos', false);
                            return;
                        }

                        try {
                            const facturaRef = doc(db, 'facturas', currentEditId);
                            const facturaSnap = await getDoc(facturaRef);
                            const oldData = facturaSnap.data();

                            const changes = [];
                            if (oldData.numeroFactura !== numeroFactura) {
                                changes.push(`Número de factura cambiado de "${oldData.numeroFactura}" a "${numeroFactura}"`);
                            }
                            if (oldData.fechaFactura !== fechaFactura) {
                                changes.push(`Fecha de factura cambiado de "${formatDate(oldData.fechaFactura)}" a "${formatDate(fechaFactura)}"`);
                            }
                            if (oldData.montoFactura !== montoFactura) {
                                changes.push(`Monto cambiado de "${formatCurrency(oldData.montoFactura)}" a "${formatCurrency(montoFactura)}"`);
                            }
                            if (oldData.oc !== oc) {
                                changes.push(`OC cambiado de "${oldData.oc}" a "${oc}"`);
                            }
                            if (oldData.acta !== acta) {
                                changes.push(`Acta cambiado de "${oldData.acta || ''}" a "${acta || ''}"`);
                            }
                            if (oldData.fechaSalida !== fechaSalida) {
                                changes.push(`Fecha de salida cambiado de "${formatDate(oldData.fechaSalida) || ''}" a "${formatDate(fechaSalida) || ''}"`);
                            }
                            if (oldData.salida !== salida) {
                                changes.push(`Salida cambiado de "${formatCurrency(oldData.salida) || ''}" a "${formatCurrency(salida) || ''}"`);
                            }
                            if (formatDate(oldData.fechaIngreso) !== formatDate(fechaIngreso)) {
                                changes.push(`Fecha de ingreso cambiado de "${formatDate(oldData.fechaIngreso)}" a "${formatDate(fechaIngreso)}"`);
                            }

                            const fullName = await getUserFullName(auth.currentUser.uid);
                            const ocData = oc ? await fetchOCData(oc) : null;

                            const facturaData = {
                                numeroFactura,
                                facturaId: oldData.facturaId,
                                facturaIdNumeric: parseInt(oldData.facturaId),
                                fechaFactura,
                                montoFactura,
                                oc,
                                fechaOC: ocData ? formatDateTimeForInput(ocData.fecha) : null,
                                proveedor: ocData ? ocData.proveedor || null : null,
                                acta,
                                fechaSalida,
                                salida,
                                fechaIngreso: fechaIngreso.toISOString(),
                                mesIngreso: fechaIngreso.toLocaleString('es', { month: 'long' }).toLowerCase(),
                                anioIngreso: fechaIngreso.getFullYear(),
                                mesSalida: fechaSalida ? new Date(fechaSalida).toLocaleString('es', { month: 'long' }).toLowerCase() : null,
                                anioSalida: fechaSalida ? new Date(fechaSalida).getFullYear() : null,
                                uid: oldData.uid,
                                userName: fullName
                            };

                            const batch = writeBatch(db);
                            batch.update(facturaRef, facturaData);

                            if (changes.length > 0) {
                                const logRef = doc(collection(db, 'facturas', currentEditId, 'logs'));
                                batch.set(logRef, {
                                    action: 'modified',
                                    description: changes.join('; '),
                                    timestamp: new Date(),
                                    user: fullName,
                                    uid: auth.currentUser.uid
                                });
                            }

                            await batch.commit();

                            hideModal(editModal);
                            showSuccessMessage('Factura actualizada exitosamente');

                            const index = facturas.findIndex(f => f.docId === currentEditId);
                            if (index !== -1) {
                                facturas[index] = { ...facturas[index], ...facturaData };
                                renderTable();
                            }
                        } catch (error) {
                            console.error('Error al actualizar factura:', error);
                            showSuccessMessage(`Error al actualizar factura: ${error.message}`, false);
                        }
                    });
                }

                if (cancelEditBtn) {
                    cancelEditBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        hideModal(editModal);
                    });
                }

                if (confirmDeleteBtn) {
                    confirmDeleteBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        const id = confirmDeleteBtn.dataset.id;
                        try {
                            const facturaRef = doc(db, 'facturas', id);
                            const facturaSnap = await getDoc(facturaRef);
                            const facturaData = facturaSnap.data();
                            const fullName = await getUserFullName(auth.currentUser.uid);
                            const batch = writeBatch(db);
                            batch.delete(facturaRef);
                            const logRef = doc(collection(db, 'facturas', id, 'logs'));
                            batch.set(logRef, {
                                action: 'deleted',
                                description: `Factura "${facturaData.numeroFactura}" eliminada`,
                                timestamp: new Date(),
                                user: fullName,
                                uid: auth.currentUser.uid
                            });
                            await batch.commit();
                            hideModal(deleteModal);
                            showSuccessMessage('Factura eliminada con éxito');
                            facturas = facturas.filter(f => f.docId !== id);
                            if (totalRecords) {
                                totalRecords.textContent = `Total de registros: ${facturas.length}`;
                            }
                            totalPages = Math.ceil(facturas.length / recordsPerPage);
                            updatePagination();
                        } catch (error) {
                            console.error('Error al eliminar factura:', error);
                            showSuccessMessage(`Error al eliminar factura: ${error.message}`, false);
                        }
                    });
                }

                if (cancelDeleteBtn) {
                    cancelDeleteBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        hideModal(deleteModal);
                    });
                }

                if (facturasTableBody) {
                    facturasTableBody.addEventListener('click', (e) => {
                        const id = e.target.dataset.id;
                        const factura = facturas.find(f => f.docId === id);
                        if (!factura) return;

                        if (e.target.classList.contains('fa-edit')) {
                            openEditModal(factura);
                        } else if (e.target.classList.contains('fa-trash')) {
                            openDeleteModal(factura);
                        } else if (e.target.classList.contains('fa-history')) {
                            loadLogs(factura.docId);
                        }
                    });
                }

                if (closeLogBtn) {
                    closeLogBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        hideModal(logModal);
                    });
                }

                if (prevBtn) {
                    prevBtn.addEventListener('click', () => {
                        if (currentPage > 1) {
                            currentPage--;
                            lastVisible = firstVisible;
                            loadFacturas();
                        }
                    });
                }

                if (nextBtn) {
                    nextBtn.addEventListener('click', () => {
                        if (currentPage < totalPages) {
                            currentPage++;
                            loadFacturas();
                        }
                    });
                }

                if (exportExcelBtn) {
                    exportExcelBtn.addEventListener('click', () => {
                        if (!window.XLSX || !window.XLSX.utils || !window.XLSX.utils.json_to_sheet) {
                            console.error('La biblioteca SheetJS no está cargada.');
                            showSuccessMessage('Error: No se pudo cargar la biblioteca para exportar a Excel.', false);
                            return;
                        }
                        const data = facturas.map(factura => ({
                            ID: factura.facturaId,
                            'Fecha de Ingreso': formatDate(factura.fechaIngreso, true).replace(/\//g, '-'),
                            'Número de Factura': factura.numeroFactura,
                            'Fecha de Factura': formatDate(factura.fechaFactura).replace(/\//g, '-'),
                            'Monto': formatCurrency(factura.montoFactura),
                            'OC': factura.oc,
                            'Fecha de OC': formatDate(factura.fechaOC).replace(/\//g, '-'),
                            'Proveedor': factura.proveedor || '',
                            'Acta': factura.acta || '',
                            'Fecha de Salida': formatDate(factura.fechaSalida).replace(/\//g, '-'),
                            'Salida': formatCurrency(factura.salida),
                            'Mes de Ingreso': factura.mesIngreso,
                            'Año de Ingreso': factura.anioIngreso,
                            'Mes de Salida': factura.mesSalida || '',
                            'Año de Salida': factura.anioSalida || '',
                            'Usuario': factura.userName
                        }));
                        const worksheet = window.XLSX.utils.json_to_sheet(data);
                        const workbook = window.XLSX.utils.book_new();
                        window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Facturas');
                        window.XLSX.writeFile(workbook, 'facturas.xlsx');
                    });
                }

                if (downloadFormatBtn) {
                    downloadFormatBtn.addEventListener('click', () => {
                        if (!window.XLSX || !window.XLSX.utils || !window.XLSX.utils.json_to_sheet) {
                            showSuccessMessage('Error: No se pudo cargar la biblioteca para descargar el formato.', false);
                            return;
                        }
                        const sampleData = [{
                            'ID': '1',
                            'Número de Factura': '001',
                            'Fecha de Factura': '29-05-2025',
                            'Monto': '1000000',
                            'OC': 'OC123',
                            'Fecha de OC': '25-04-2025',
                            'Proveedor': 'Proveedor A',
                            'Acta': 'ACTA123',
                            'Fecha de Salida': '10-05-2025',
                            'Salida': '500000',
                            'Fecha de Ingreso': '01-05-2025'
                        }];
                        const worksheet = window.XLSX.utils.json_to_sheet(sampleData);
                        const workbook = window.XLSX.utils.book_new();
                        window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Formato Facturas');
                        window.XLSX.writeFile(workbook, 'formato_facturas.xlsx');
                    });
                }

                if (importFileInput) {
                    importFileInput.addEventListener('change', async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;

                        showModal(loadingModal, loadingProgress, 0);
                        try {
                            if (!window.XLSX || !window.XLSX.read) {
                                throw new Error('La biblioteca SheetJS no está cargada.');
                            }
                            const data = await file.arrayBuffer();
                            const workbook = window.XLSX.read(data, { type: 'array', dateNF: 'dd-mm-yyyy' });
                            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                            const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                            if (!jsonData.length) {
                                showSuccessMessage('El archivo no contiene datos válidos.', false);
                                hideModal(loadingModal);
                                return;
                            }

                            const requiredColumns = [
                                'Número de Factura',
                                'Fecha de Factura',
                                'Monto',
                                'OC',
                                'Fecha de Ingreso'
                            ];
                            const firstRow = jsonData[0];
                            const missingColumns = requiredColumns.filter(col => !(col in firstRow));
                            if (missingColumns.length > 0) {
                                showSuccessMessage(`Faltan columnas requeridas: ${missingColumns.join(', ')}`, false);
                                hideModal(loadingModal);
                                return;
                            }

                            const fullName = await getUserFullName(auth.currentUser.uid);
                            let batch = writeBatch(db);
                            let processed = 0;

                            for (const row of jsonData) {
                                let facturaId = row['ID'] ? String(row['ID']) : await getNextFacturaId();
                                if (!facturaId) {
                                    showSuccessMessage('Error al generar ID de factura.', false);
                                    continue;
                                }

                                const parseDate = (dateStr) => {
                                    if (!dateStr) return null;
                                    const strValue = String(dateStr).trim();
                                    const ddmmyyyy = strValue.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
                                    if (ddmmyyyy) {
                                        const [_, day, month, year] = ddmmyyyy;
                                        const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
                                        return isNaN(date.getTime()) ? null : date;
                                    }
                                    if (!isNaN(strValue) && Number(strValue) > 0) {
                                        const excelEpoch = new Date(1899, 11, 30);
                                        const days = Number(strValue);
                                        const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
                                        return isNaN(date.getTime()) ? null : date;
                                    }
                                    const date = new Date(strValue);
                                    return isNaN(date.getTime()) ? null : date;
                                };

                                const fechaIngreso = parseDate(row['Fecha de Ingreso']) || new Date();
                                const fechaFactura = parseDate(row['Fecha de Factura']);
                                const fechaOC = parseDate(row['Fecha de OC']);
                                const fechaSalida = parseDate(row['Fecha de Salida']);
                                const ocData = row['OC'] ? await fetchOCData(row['OC']) : null;

                                if (!row['Número de Factura'] || !fechaFactura || !parseCurrency(row['Monto']) || !row['OC'] || !fechaIngreso) {
                                    console.warn('Fila inválida, faltan datos:', row);
                                    continue;
                                }

                                const facturaData = {
                                    facturaId,
                                    facturaIdNumeric: parseInt(facturaId),
                                    numeroFactura: row['Número de Factura'].toLowerCase().trim(),
                                    fechaFactura: fechaFactura ? fechaFactura.toISOString() : null,
                                    montoFactura: parseCurrency(row['Monto']) || 0,
                                    oc: row['OC'].toString().trim(),
                                    fechaOC: ocData ? formatDateTimeForInput(ocData.fecha) : (fechaOC ? fechaOC.toISOString() : null),
                                    proveedor: ocData?.proveedor || row['Proveedor'] || '',
                                    acta: row['Acta'] || '',
                                    fechaSalida: fechaSalida ? fechaSalida.toISOString() : null,
                                    salida: parseCurrency(row['Salida']) || null,
                                    fechaIngreso: fechaIngreso.toISOString(),
                                    mesIngreso: fechaIngreso.toLocaleString('es', { month: 'long' }).toLowerCase(),
                                    anioIngreso: fechaIngreso.getFullYear(),
                                    mesSalida: fechaSalida ? fechaSalida.toLocaleString('es', { month: 'long' }).toLowerCase() : null,
                                    anioSalida: fechaSalida ? fechaSalida.getFullYear() : null,
                                    uid: auth.currentUser.uid,
                                    userName: fullName
                                };

                                const facturaRef = doc(collection(db, 'facturas'));
                                batch.set(facturaRef, facturaData);
                                const logRef = doc(collection(db, 'facturas', facturaRef.id, 'logs'));
                                batch.set(logRef, {
                                    action: 'created',
                                    description: `Factura "${facturaData.numeroFactura}" importada`,
                                    timestamp: new Date(),
                                    user: fullName,
                                    uid: auth.currentUser.uid
                                });

                                processed++;
                                if (processed % 10 === 0) {
                                    await batch.commit();
                                    batch = writeBatch(db);
                                }
                                if (loadingProgress) {
                                    loadingProgress.textContent = `${Math.round((processed / jsonData.length) * 100)}%`;
                                }
                            }

                            if (processed % 10 !== 0) {
                                await batch.commit();
                            }
                            hideModal(loadingModal);
                            showSuccessMessage(`Se importaron ${processed} facturas exitosamente`);
                            await loadFacturas();
                        } catch (error) {
                            console.error('Error al importar facturas:', error);
                            showSuccessMessage(`Error al importar facturas: ${error.message}`, false);
                            hideModal(loadingModal);
                        } finally {
                            if (importFileInput) {
                                importFileInput.value = '';
                            }
                        }
                    });
                }

                document.querySelectorAll('.filter-icon').forEach(icon => {
                    icon.addEventListener('click', async (e) => {
                        e.preventDefault();
                        const column = e.target.dataset.column;
                        if (column === 'acciones') return;

                        if (e.target.classList.contains('fa-filter-circle-xmark')) {
                            delete filters[column];
                            currentPage = 1;
                            await loadFacturas();
                            return;
                        }

                        document.querySelectorAll('.filter-input-container').forEach(input => input.remove());

                        const container = document.createElement('div');
                        container.className = 'filter-input-container';
                        const input = document.createElement('input');
                        input.type = 'text';
                        input.placeholder = `Filtrar por ${column}`;
                        input.value = filters[column] || '';
                        input.addEventListener('input', async () => {
                            const value = input.value.trim();
                            if (value) {
                                filters[column] = value;
                            } else {
                                delete filters[column];
                            }
                            currentPage = 1;
                            await loadFacturas();
                        });
                        container.appendChild(input);
                        e.target.parentNode.appendChild(container);
                        input.focus();
                    });
                });

                document.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('fa-filter') && 
                        !e.target.classList.contains('fa-filter-circle-xmark') && 
                        !e.target.closest('.filter-input-container')) {
                            document.querySelectorAll('.filter-input-container').forEach(input => input.remove());
                            document.querySelectorAll('.filter-icon').forEach(icon => {
                                const column = icon.dataset.column;
                                if (!filters[column]) {
                                    icon.classList.remove('fa-filter-circle-xmark', 'active');
                                    icon.classList.add('fa-filter');
                                }
                            });
                    }
                });

            } catch (error) {
                console.error('Error al verificar permisos:', error);
                showSuccessMessage(`Error al verificar permisos: ${error.message}`, false);
            }
        });
    } catch (error) {
        console.error('Error al configurar persistencia:', error);
        showSuccessMessage(`Error al configurar autenticación: ${error.message}`, false);
    }

    async function updateExistingFacturas() {
        try {
            const facturasCollection = collection(db, 'facturas');
            const snapshot = await getDocs(facturasCollection);
            const batch = writeBatch(db);
            let updateCount = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                if (!data.facturaIdNumeric) {
                    batch.update(doc.ref, { facturaIdNumeric: parseInt(data.facturaId) || 0 });
                    updateCount++;
                }
                if (data.numeroFactura && typeof data.numeroFactura === 'string') {
                    batch.update(doc.ref, { numeroFactura: data.numeroFactura.toLowerCase().trim() });
                    updateCount++;
                }
                if (data.mesIngreso && typeof data.mesIngreso === 'string') {
                    batch.update(doc.ref, { mesIngreso: data.mesIngreso.toLowerCase() });
                    updateCount++;
                }
                if (data.mesSalida && typeof data.mesSalida === 'string') {
                    batch.update(doc.ref, { mesSalida: data.mesSalida.toLowerCase() });
                    updateCount++;
                }
                if (data.oc) {
                    batch.update(doc.ref, { oc: String(data.oc).trim() });
                    updateCount++;
                }
            });

            if (updateCount > 0) {
                await batch.commit();
            } else {
            }
        } catch (error) {
            console.error('Error al actualizar facturas:', error);
        }
    }
    await updateExistingFacturas();
}

function openEditModal(factura) {
    currentEditId = factura.docId;
    if (editNumeroFacturaInput) editNumeroFacturaInput.value = factura.numeroFactura;
    if (editFechaFacturaInput) editFechaFacturaInput.value = formatDateTimeForInput(factura.fechaFactura);
    if (editMontoFacturaInput) editMontoFacturaInput.value = factura.montoFactura;
    if (editOCInput) editOCInput.value = factura.oc;
    if (editFechaOCInput) editFechaOCInput.value = formatDateTimeForInput(factura.fechaOC);
    if (editProveedorInput) editProveedorInput.value = factura.proveedor || '';
    if (editActaInput) editActaInput.value = factura.acta || '';
    if (editFechaSalidaInput) editFechaSalidaInput.value = formatDateTimeForInput(factura.fechaSalida);
    if (editSalidaInput) editSalidaInput.value = factura.salida;
    if (editFechaIngresoInput) editFechaIngresoInput.value = formatDateTimeForInput(factura.fechaIngreso);
    showModal(editModal);
}

function openDeleteModal(factura) {
    if (deleteMessage && confirmDeleteBtn) {
        deleteMessage.textContent = `¿Estás seguro de que deseas eliminar la factura "${factura.numeroFactura}" (ID: ${factura.facturaId})?`;
        confirmDeleteBtn.dataset.id = factura.docId;
        showModal(deleteModal);
    }
}

async function createTestFactura() {
    try {
        const facturaId = await getNextFacturaId();
        await setDoc(doc(collection(db, 'facturas')), {
            facturaId,
            facturaIdNumeric: parseInt(facturaId),
            numeroFactura: 'TEST123',
            fechaFactura: new Date().toISOString(),
            montoFactura: 1000000,
            oc: '5009',
            fechaOC: null,
            proveedor: 'Proveedor Test',
            acta: null,
            fechaSalida: null,
            salida: null,
            fechaIngreso: new Date().toISOString(),
            mesIngreso: new Date().toLocaleString('es', { month: 'long' }).toLowerCase(),
            anioIngreso: new Date().getFullYear(),
            mesSalida: null,
            anioSalida: null,
            uid: auth.currentUser.uid,
            userName: 'Usuario Test'
        });
    } catch (error) {
        console.error('Error al crear documento de prueba:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    init();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
}