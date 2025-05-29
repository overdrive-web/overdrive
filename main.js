import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence, getIdToken } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

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

setPersistence(auth, browserLocalPersistence)
  .catch(error => console.error('Error al configurar persistencia:', error));

const loadingScreen = document.getElementById('loadingScreen');
const headerDate = document.querySelector('.header-date');
const userName = document.getElementById('userName');
const userLogo = document.getElementById('userLogo');
const userDropdown = document.getElementById('userDropdown');
const toggleModeBtn = document.getElementById('toggle-mode');
const sidebarMenu = document.querySelector('.sidebar-menu');
const sidebarTitle = document.querySelector('.sidebar-title');
const submenuContainer = document.querySelector('.submenu-container');
const submenuText = document.querySelector('.submenu-text');
const submenu = document.querySelector('.submenu');
const backButton = document.querySelector('.submenu-title');
const logoutModal = document.getElementById('logoutModal');
const confirmLogout = document.getElementById('confirmLogout');
const cancelLogout = document.getElementById('cancelLogout');
const content = document.querySelector('.content');

const submenuData = {
  Implantes: [
    {
      name: 'Cargos Implantes',
      icon: 'fa-tooth',
      html: 'module/implantes/cargos-implantes/cargos-implantes.html',
      css: 'module/implantes/cargos-implantes/cargos-implantes.css',
      js: 'module/implantes/cargos-implantes/cargos-implantes.js'
    },
    {
      name: 'Cargos Consignación',
      icon: 'fa-box',
      html: 'module/implantes/cargos-consignacion/cargos-consignacion.html',
      css: 'module/implantes/cargos-consignacion/cargos-consignacion.css',
      js: 'module/implantes/cargos-consignacion/cargos-consignacion.js'
    },
    {
      name: 'Pacientes',
      icon: 'fa-user',
      html: 'module/implantes/pacientes/pacientes.html',
      css: 'module/implantes/pacientes/pacientes.css',
      js: 'module/implantes/pacientes/pacientes.js'
    },
    {
      name: 'Códigos',
      icon: 'fa-barcode',
      html: 'module/implantes/codigos/codigos.html',
      css: 'module/implantes/codigos/codigos.css',
      js: 'module/implantes/codigos/codigos.js'
    },

    { 
      name: 'Paquetización', 
      icon: 'fa-boxes', 
      html: 'module/implantes/paquetizacion/paquetizacion.html', 
      css: 'module/implantes/paquetizacion/paquetizacion.css', 
      js: 'module/implantes/paquetizacion/paquetizacion.js' 
    },

    {
      name: 'Stock',
      icon: 'fa-warehouse',
      html: 'module/implantes/stock/stock.html',
      css: 'module/implantes/stock/stock.css',
      js: 'module/implantes/stock/stock.js'
    },

    {
      name: 'Contenedores',
      icon: 'fa-box-archive',
      html: 'module/implantes/contenedores/contenedores.html',
      css: 'module/implantes/contenedores/contenedores.css',
      js: 'module/implantes/contenedores/contenedores.js'
    }
    
  ],
  Consignacion: [
    {
      name: 'Asignación',
      icon: 'fa-clipboard-list',
      html: 'module/consignacion/asignacion/asignacion.html',
      css: 'module/consignacion/asignacion/asignacion.css',
      js: 'module/consignacion/asignacion/asignacion.js'
    },
    {
      name: 'Ficha',
      icon: 'fa-file-alt',
      html: 'module/consignacion/ficha/ficha.html',
      css: 'module/consignacion/ficha/ficha.css',
      js: 'module/consignacion/ficha/ficha.js'
    },
    {
      name: 'Lotes',
      icon: 'fa-boxes',
      html: 'module/consignacion/lotes/lotes.html',
      css: 'module/consignacion/lotes/lotes.css',
      js: 'module/consignacion/lotes/lotes.js'
    }
  ],
  Corporativo: [
    {
      name: 'Reporte 2024',
      icon: 'fa-chart-bar',
      html: 'module/corporativo/reporte-2024/reporte-2024.html',
      css: 'module/corporativo/reporte-2024/reporte-2024.css',
      js: 'module/corporativo/reporte-2024/reporte-2024.js'
    },
    {
      name: 'Reporte 2025',
      icon: 'fa-chart-bar',
      html: 'module/corporativo/reporte-2025/reporte-2025.html',
      css: 'module/corporativo/reporte-2025/reporte-2025.css',
      js: 'module/corporativo/reporte-2025/reporte-2025.js'
    },
    {
      name: 'RP 2024',
      icon: 'fa-file-excel',
      html: 'module/corporativo/rp-2024/rp-2024.html',
      css: 'module/corporativo/rp-2024/rp-2024.css',
      js: 'module/corporativo/rp-2024/rp-2024.js'
    },
    {
      name: 'RO 2025',
      icon: 'fa-file-excel',
      html: 'module/corporativo/ro-2025/ro-2025.html',
      css: 'module/corporativo/ro-2025/ro-2025.css',
      js: 'module/corporativo/ro-2025/ro-2025.js'
    }
  ],

  Laboratorio: [
    {
      name: 'Facturación',
      icon: 'fa-money-bill',
      html: 'module/laboratorio/facturacion/facturacion.html',
      css: 'module/laboratorio/facturacion/facturacion.css',
      js: 'module/laboratorio/facturacion/facturacion.js'
    },
    {
      name: 'Órdenes de Compra',
      icon: 'fa-shopping-cart',
      html: 'module/laboratorio/ordenes-compra/ordenes-compra.html',
      css: 'module/laboratorio/ordenes-compra/ordenes-compra.css',
      js: 'module/laboratorio/ordenes-compra/ordenes-compra.js'
    },
    {
      name: 'Detalles',
      icon: 'fa-info-circle',
      html: 'module/laboratorio/detalles/detalles.html',
      css: 'module/laboratorio/detalles/detalles.css',
      js: 'module/laboratorio/detalles/detalles.js'
    }
  ],
  
  Resumen: [
  {
    name: 'Visor',
    icon: 'fa-eye',
    html: 'module/resumen/visor/visor.html',
    css: 'module/resumen/visor/visor.css',
    js: 'module/resumen/visor/visor.js'
  },
  {
    name: 'ImplanteView',
    icon: 'fa-syringe',
    html: 'module/resumen/implanteview/implanteview.html',
    css: 'module/resumen/implanteview/implanteview.css',
    js: 'module/resumen/implanteview/implanteview.js'
  },
  {
    name: 'Consigna',
    icon: 'fa-dolly-flatbed',
    html: 'module/resumen/consigna/consigna.html',
    css: 'module/resumen/consigna/consigna.css',
    js: 'module/resumen/consigna/consigna.js'
  },
  {
    name: 'FactuView',
    icon: 'fa-file-invoice',
    html: 'module/resumen/factuview/factuview.html',
    css: 'module/resumen/factuview/factuview.css',
    js: 'module/resumen/factuview/factuview.js'
  }
  ],

  Prestaciones: [
    {
      name: 'Empresas',
      icon: 'fa-building',
      html: 'module/prestaciones/empresas/empresas.html',
      css: 'module/prestaciones/empresas/empresas.css',
      js: 'module/prestaciones/empresas/empresas.js'
    },
    {
      name: 'Médicos',
      icon: 'fa-user-md',
      html: 'module/prestaciones/medicos/medicos.html',
      css: 'module/prestaciones/medicos/medicos.css',
      js: 'module/prestaciones/medicos/medicos.js'
    },
    {
      name: 'Previsiones',
      icon: 'fa-shield-alt',
      html: 'module/prestaciones/previsiones/previsiones.html',
      css: 'module/prestaciones/previsiones/previsiones.css',
      js: 'module/prestaciones/previsiones/previsiones.js'
    },
    {
      name: 'Áreas Clínicas',
      icon: 'fa-hospital',
      html: 'module/prestaciones/areas-clinicas/areas-clinicas.html',
      css: 'module/prestaciones/areas-clinicas/areas-clinicas.css',
      js: 'module/prestaciones/areas-clinicas/areas-clinicas.js'
    },
    {
      name: 'CTS Proveedores',
      icon: 'fa-truck-loading',
      html: 'module/prestaciones/cts-proveedores/cts-proveedores.html',
      css: 'module/prestaciones/cts-proveedores/cts-proveedores.css',
      js: 'module/prestaciones/cts-proveedores/cts-proveedores.js'
    },
    {
      name: 'CTS Clínico',
      icon: 'fa-stethoscope',
      html: 'module/prestaciones/cts-clinico/cts-clinico.html',
      css: 'module/prestaciones/cts-clinico/cts-clinico.css',
      js: 'module/prestaciones/cts-clinico/cts-clinico.js'
    }
  ],
  Apuntes: [
    {
      name: 'Notas',
      icon: 'fa-sticky-note',
      html: 'module/apuntes/notas/notas.html',
      css: 'module/apuntes/notas/notas.css',
      js: 'module/apuntes/notas/notas.js'
    },
    {
      name: 'Bloc',
      icon: 'fa-calendar',
      html: 'module/apuntes/bloc/bloc.html',
      css: 'module/apuntes/bloc/bloc.css',
      js: 'module/apuntes/bloc/bloc.js'
    }
  ],
  Usuarios: [
    {
      name: 'Registros',
      icon: 'fa-user-plus',
      html: 'module/usuarios/registros/registros.html',
      css: 'module/usuarios/registros/registros.css',
      js: 'module/usuarios/registros/registros.js'
    }
  ]
};

onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (loadingScreen) loadingScreen.style.display = 'flex';
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        throw new Error('No se encontró el documento del usuario');
      }
      const userDoc = userSnap.data();

      let displayName = userDoc.fullName || userDoc.username || user.email.split('@')[0];
      let userIcon = userDoc.gender === 'Hombre' ? 'img/icono-hombre.png' : userDoc.gender === 'Mujer' ? 'img/icono-mujer.png' : 'img/icono-otro.png';
      let permissions = Array.isArray(userDoc.permissions) ? userDoc.permissions : [];
      let userRole = userDoc.role || '';

      if (userName) userName.textContent = displayName;
      if (userLogo) userLogo.src = userIcon;
      localStorage.setItem('userDocId', user.uid);
      localStorage.setItem('userPermissions', JSON.stringify(permissions.map(perm => {
        const [module, name] = perm.split(':');
        return {
          module,
          paths: [submenuData[module]?.find(sub => sub.name === name)?.html].filter(Boolean)
        };
      })));
      localStorage.setItem('userRole', userRole);

      localStorage.removeItem('cachedSidebarMenu');
      localStorage.removeItem('cachedPermissions');

      renderSidebarMenu(JSON.stringify(permissions.map(perm => {
        const [module, name] = perm.split(':');
        return { module, paths: [submenuData[module]?.find(sub => sub.name === name)?.html].filter(Boolean) };
      })), userRole);

      await loadContent(
        'module/info/informaciones/informaciones.html',
        'module/info/informaciones/informaciones.css',
        'module/info/informaciones/informaciones.js'
      );

      if (loadingScreen) loadingScreen.style.display = 'none';

      await getIdToken(user);
    } catch (error) {
      if (content) {
        content.innerHTML = `<h2>Error</h2><p>Error al cargar la aplicación: ${error.message}. Contacta al administrador.</p>`;
      }
      if (loadingScreen) loadingScreen.style.display = 'none';
      setTimeout(async () => {
        await signOut(auth);
        window.location.href = 'index.html?error=' + encodeURIComponent(error.message);
      }, 3000);
    }
  } else {
    localStorage.clear();
    window.location.href = 'index.html';
  }
});

function renderSidebarMenu(permissions, userRole) {
  if (!sidebarMenu) return;
  let parsedPermissions = [];
  try {
    parsedPermissions = JSON.parse(permissions || '[]');
    if (!Array.isArray(parsedPermissions)) parsedPermissions = [];
  } catch (e) {
    parsedPermissions = [];
  }

  const allowedModules = [...new Set(parsedPermissions.map(p => p.module).filter(Boolean))];
  sidebarMenu.innerHTML = '';
  Object.keys(submenuData).forEach(section => {
    if (allowedModules.includes(section) || userRole.toLowerCase() === 'administrador') {
      const li = document.createElement('li');
      li.classList.add('sidebar-menu-item');
      li.setAttribute('data-section', section);
      li.innerHTML = `<i class="far fa-circle-check sidebar-icon"></i><span class="sidebar-text">${section}</span>`;
      sidebarMenu.appendChild(li);
    }
  });
  attachMenuListeners();
}

function attachMenuListeners() {
  document.querySelectorAll('.sidebar-menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const section = item.getAttribute('data-section');
      if (submenuContainer) submenuContainer.style.display = 'block';
      if (sidebarMenu) sidebarMenu.style.display = 'none';
      if (submenuText) submenuText.textContent = section;
      if (submenu) submenu.innerHTML = '';
      const permissions = JSON.parse(localStorage.getItem('userPermissions') || '[]');
      const userRole = localStorage.getItem('userRole') || '';
      const modulePerms = permissions.find(p => p.module === section);
      const allowedPaths = modulePerms ? modulePerms.paths : [];
      const subItems = userRole.toLowerCase() === 'administrador' ? submenuData[section] : submenuData[section].filter(subItem => allowedPaths.includes(subItem.html));
      subItems.forEach((subItem, index) => {
        const li = document.createElement('li');
        li.classList.add('submenu-item');
        li.innerHTML = `<i class="fas ${subItem.icon} submenu-icon"></i><span class="submenu-text">${subItem.name}</span>`;
        li.addEventListener('click', () => loadContent(subItem.html, subItem.css, subItem.js));
        submenu.appendChild(li);
        if (subItem.name === 'Áreas Clínicas' && index + 1 < subItems.length && subItems[index + 1].name === 'CTS Proveedores') {
          const divider = document.createElement('li');
          divider.classList.add('submenu-divider');
          submenu.appendChild(divider);
        }
        if (subItem.name === 'Reporte 2025' && index + 1 < subItems.length && subItems[index + 1].name === 'RP 2024') {
          const divider = document.createElement('li');
          divider.classList.add('submenu-divider');
          submenu.appendChild(divider);
        }
      });
    });
  });
}

async function loadContent(htmlFile, cssFile, jsFile) {
  try {
    if (!content) throw new Error('Elemento .content no encontrado');
    const cleanupEvent = new CustomEvent('moduleCleanup');
    window.dispatchEvent(cleanupEvent);

    content.innerHTML = '';
    const existingStyles = document.querySelectorAll('style[data-submodule]');
    existingStyles.forEach(style => style.remove());
    const existingScripts = document.querySelectorAll('script[data-submodule]');
    existingScripts.forEach(script => script.remove());

    const cachedHtml = localStorage.getItem(`cached_${htmlFile}`);
    const cachedCss = localStorage.getItem(`cached_${cssFile}`);
    let htmlContent, cssContent;

    htmlContent = cachedHtml || await (await fetch(htmlFile)).text();
    cssContent = cachedCss || await (await fetch(cssFile)).text();

    if (!htmlContent || !cssContent) {
      throw new Error('Contenido HTML o CSS vacío');
    }

    if (!cachedHtml) localStorage.setItem(`cached_${htmlFile}`, htmlContent);
    if (!cachedCss) localStorage.setItem(`cached_${cssFile}`, cssContent);

    content.innerHTML = htmlContent;

    const style = document.createElement('style');
    style.setAttribute('data-submodule', htmlFile);
    style.textContent = cssContent;
    document.head.appendChild(style);

    await new Promise((resolve, reject) => {
      const maxAttempts = 100;
      let attempts = 0;
      const checkDOM = () => {
        if (document.querySelector('.content-container') || content.innerHTML) {
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('Timeout esperando el DOM'));
        } else {
          attempts++;
          setTimeout(checkDOM, 10);
        }
      };
      checkDOM();
    });

    const script = document.createElement('script');
    script.setAttribute('data-submodule', htmlFile);
    script.type = 'module';
    const timestamp = new Date().getTime();
    script.src = `${jsFile}?t=${timestamp}`;
    script.onload = () => {
      if (htmlFile.includes('module/notas/notas/notas.html') && window.initNotas) {
        window.initNotas(auth.currentUser);
      }
    };
    script.onerror = (error) => {
      content.innerHTML = `<h2>Error</h2><p>No se pudo cargar el script: ${error.message}</p>`;
    };
    document.body.appendChild(script);
  } catch (error) {
    content.innerHTML = `<h2>Error</h2><p>No se pudo cargar el contenido: ${error.message}</p>`;
  }
}

function showModulesInfo() {
  if (submenuContainer) submenuContainer.style.display = 'none';
  if (sidebarMenu) sidebarMenu.style.display = 'block';
  loadContent(
    'module/info/informaciones/informaciones.html',
    'module/info/informaciones/informaciones.css',
    'module/info/informaciones/informaciones.js'
  );
}

const updateDate = () => {
  const date = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  if (headerDate) headerDate.textContent = date.toLocaleDateString('es-ES', options);
};
updateDate();

if (toggleModeBtn) {
  toggleModeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const icon = toggleModeBtn.querySelector('i');
    if (icon) {
      icon.classList.toggle('fa-sun');
      icon.classList.toggle('fa-moon');
    }
  });
}

if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.body.classList.add('dark-mode');
  if (toggleModeBtn) toggleModeBtn.querySelector('i').classList.replace('fa-sun', 'fa-moon');
}

if (userLogo) {
  userLogo.addEventListener('click', () => {
    if (userDropdown) userDropdown.style.display = userDropdown.style.display === 'none' ? 'block' : 'none';
  });
}

if (userName) {
  userName.addEventListener('click', () => {
    if (userDropdown) userDropdown.style.display = userDropdown.style.display === 'none' ? 'block' : 'none';
  });
}

document.addEventListener('click', (e) => {
  if (userLogo && userName && userDropdown && !userLogo.contains(e.target) && !userName.contains(e.target) && !userDropdown.contains(e.target)) {
    userDropdown.style.display = 'none';
  }
});

document.querySelectorAll('.dropdown-item').forEach(item => {
  item.addEventListener('click', () => {
    const action = item.getAttribute('data-action');
    switch (action) {
      case 'personal-data':
        loadContent(
          'module/info/datos-personales/datos_personales.html',
          'module/info/datos-personales/datos_personales.css',
          'module/info/datos-personales/datos_personales.js'
        );
        break;
      case 'change-password':
        loadContent(
          'module/info/cambiar-contrasena/cambiar_contrasena.html',
          'module/info/cambiar-contrasena/cambiar_contrasena.css',
          'module/info/cambiar-contrasena/cambiar_contrasena.js'
        );
        break;
      case 'logout':
        if (logoutModal) logoutModal.style.display = 'flex';
        break;
    }
    if (userDropdown) userDropdown.style.display = 'none';
  });
});

if (sidebarTitle) sidebarTitle.addEventListener('click', showModulesInfo);

if (backButton) {
  backButton.addEventListener('click', () => {
    if (submenuContainer) submenuContainer.style.display = 'none';
    if (sidebarMenu) sidebarMenu.style.display = 'block';
    // No limpiar .content ni eliminar estilos/scripts
  });
}

if (confirmLogout) {
  confirmLogout.addEventListener('click', async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('userDocId');
      localStorage.removeItem('userPermissions');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('cachedSidebarMenu');
      localStorage.removeItem('cachedPermissions');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cached_')) localStorage.removeItem(key);
      });
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  });
}

if (cancelLogout) {
  cancelLogout.addEventListener('click', () => {
    if (logoutModal) logoutModal.style.display = 'none';
  });
}

if (logoutModal) {
  logoutModal.addEventListener('click', (e) => {
    if (e.target === logoutModal) {
      logoutModal.style.display = 'none';
    }
  });
}
