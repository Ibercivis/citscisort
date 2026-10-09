# CitSci Sort - React App

Aplicación React con Material-UI para autenticación con Django backend usando dj-rest-auth.

## Características

- 🔐 Autenticación completa (Login/Register/Logout)
- 🎨 Interfaz moderna con Material-UI
- 🔒 Rutas protegidas
- 📱 Diseño responsive
- ⚡ Vite para desarrollo rápido

## Tecnologías

- React 18
- Material-UI (MUI)
- React Router v6
- Axios
- Vite

## Instalación

```bash
npm install
```

## Configuración

Asegúrate de que el archivo `.env` tiene la URL correcta del backend:

```
VITE_API_URL=http://localhost:8000
```

## Uso

### Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## Estructura del proyecto

```
src/
├── components/       # Componentes reutilizables
├── context/         # Context API (AuthContext)
├── pages/           # Páginas principales
│   ├── Login.jsx
│   ├── Register.jsx
│   └── Dashboard.jsx
├── services/        # Servicios de API
│   ├── api.js       # Configuración de Axios
│   └── authService.js
├── utils/           # Utilidades
│   └── ProtectedRoute.jsx
├── App.jsx
└── main.jsx
```

## Endpoints del Backend (Django)

La aplicación espera los siguientes endpoints de dj-rest-auth:

- `POST /api/auth/login/` - Login
- `POST /api/auth/registration/` - Registro
- `POST /api/auth/logout/` - Logout

## Autenticación

El token de autenticación se guarda en `localStorage` y se envía automáticamente en todas las peticiones mediante un interceptor de Axios.

## Rutas

- `/login` - Página de inicio de sesión
- `/register` - Página de registro
- `/dashboard` - Panel principal (requiere autenticación)
- `/` - Redirecciona a dashboard

## Notas

- Asegúrate de que el backend Django esté corriendo en `localhost:8000`
- Configura CORS en Django para permitir peticiones desde `localhost:5173`

