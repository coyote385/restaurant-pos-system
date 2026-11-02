# Sistema de Pedidos en Tiempo Real para Restaurante 🍽️⚡

Sistema desacoplado full-stack con soporte en tiempo real (WebSockets) listo para escalar a aplicación móvil nativa (React Native).

## 🚀 Tecnologías

* **Frontend:** React (Vite) + Material UI (MUI) + Zustand + Socket.io-client
* **Backend:** Node.js (Express) + TypeScript + Prisma ORM + PostgreSQL + Socket.io

---

## 📁 Estructura del Proyecto

```text
web/
├── backend/                  # API REST + WebSockets en Node.js + TypeScript
│   ├── prisma/
│   │   ├── schema.prisma     # Modelos relacionales PostgreSQL
│   │   └── seed.ts           # Datos de prueba (Mesas, Platos, Usuarios)
│   └── src/
│       ├── modules/          # Auth (PIN/Email), Mesas, Menú, Órdenes, Propinas
│       ├── sockets/          # Servidor Socket.io y salas (kitchen, waiters)
│       └── server.ts         # Punto de entrada HTTP + WebSockets (Puerto 4000)
│
├── frontend/                 # SPA en React + Vite + MUI (Puerto 5173)
│   └── src/
│       ├── stores/           # Zustand (useAuthStore, useTableStore, useKitchenStore, useCartStore)
│       └── views/
│           ├── auth/         # Login con teclado numérico PIN o Email
│           ├── waiter/       # Mapa interactivo de mesas + Carrito rápido
│           ├── kitchen/      # Tablero Kanban (Recibido -> Preparación -> Listo)
│           └── admin/        # CRUD Menú (Switch de Stock) + Reporte de Propinas por Cédula
```

---

## 🛠️ Pasos para Iniciar

### 1. Base de Datos (PostgreSQL)
Asegúrate de configurar tu cadena de conexión en `backend/.env`:
```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/restaurant_db?schema=public"
```
*(Puedes usar una base local o servicios gratuitos en la nube como Neon.tech o Supabase).*

Sincroniza el esquema y carga los datos de prueba iniciales:
```bash
cd backend
npx prisma db push
npm run prisma:seed
```

### 2. Iniciar el Backend (Terminal 1)
```bash
cd backend
npm run dev
```
* Servidor activo en: `http://localhost:4000`
* WebSockets escuchando en: `ws://localhost:4000`

### 3. Iniciar el Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
* Abre en tu navegador: `http://localhost:5173`

---

## 🔑 Credenciales de Prueba (Generadas en el Seed)

| Rol | Método de Acceso | Credenciales |
| :--- | :--- | :--- |
| **Mesero 1 (Carlos)** | Teclado PIN en Móvil | **PIN:** `1234` (Cédula: `1020304050`) |
| **Mesero 2 (Laura)** | Teclado PIN en Móvil | **PIN:** `5678` (Cédula: `1098765432`) |
| **Gerente / Admin** | Formulario Web | **Email:** `admin@restaurante.com` / **Pass:** `admin123` |
