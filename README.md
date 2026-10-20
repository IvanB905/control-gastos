# 💰 Control de Gastos & Finanzas v2.0 (FinTech Edition)

Sistema integral de gestión de finanzas personales, presupuestos, alcancías de ahorro y control de billeteras multidivisa (**Pesos Colombianos - COP** y **Dólares Americanos - USD**), desarrollado con arquitectura moderna de alto rendimiento y diseño minimalista estilo *Linear / Revolut*.

---

## 🚀 Tecnologías & Arquitectura

- **Frontend:** React 19 + TypeScript + Vite 6
- **Estilos:** Tailwind CSS v4 (con Dark & Light mode reactivo)
- **Estado Global:** Zustand con actualizaciones optimistas y persistencia local
- **Iconografía:** Lucide React
- **Gráficos:** Chart.js + react-chartjs-2 (Doughnut de categorías con valor central y barras comparativas históricas)
- **Base de Datos & Auth:** Supabase (PostgreSQL en la nube con Row-Level Security y triggers automáticos de saldos)
- **Exportación:** Exportador nativo de transacciones a Excel/CSV con BOM UTF-8

---

## 📌 Funcionalidades Principales

1. **Dashboard Financiero en Tiempo Real:**
   - Métricas de Balance Neto, Ingresos, Gastos y Gastos Pendientes.
   - Carrusel de cuentas bancarias y billeteras digitales (Bancolombia, Nequi, Daviplata, Efectivo, etc.).
   - Comparativa de ingresos vs. gastos mensuales.
   - Distribución porcentual de gastos por categoría en gráfico Donut.
   - Seguimiento mensual de presupuestos y movimientos recientes.

2. **Multidivisa Nativo (COP / USD):**
   - **Pesos Colombianos (COP):** Formato contable oficial sin decimales (`$ 4.500.000`).
   - **Dólares Americanos (USD):** Formato con centavos (`$ 1,450.00`).
   - Conmutador rápido en la barra superior para alternar vistas sin recargar.

3. **Gestión de Movimientos & Exportación:**
   - Filtros por búsqueda de texto, cuenta de origen, tipo (gasto, ingreso, transferencia) y estado.
   - Modal de edición rápida y eliminación con recálculo automático de saldos.
   - **Botón de descarga a Excel (.csv)** con formato compatible directo con Microsoft Excel.

4. **Billeteras & Transferencias Entre Cuentas:**
   - Creación de cuentas en COP o USD.
   - Transferencia entre billeteras (ej. *Bancolombia ➔ Nequi*) sin distorsionar los ingresos o gastos del periodo.

5. **Presupuestos & Metas de Ahorro:**
   - Límites mensuales por categoría con semáforo de alerta (verde, ámbar, rojo).
   - Alcancías de Ahorro virtuales con barra de progreso y botón para abonar/ahorrar al instante.

6. **Configuración & Categorías:**
   - Creación y eliminación de categorías personalizadas con paleta de colores.
   - Estado de la conexión Supabase y panel de seguridad RLS.
   - Descarga de copia de seguridad en JSON y restablecimiento de datos.

---

## 💻 Puesta en Marcha Local

```bash
# 1. Entrar en la carpeta del proyecto
cd control-gastos-v2

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor de desarrollo
npm run dev
# Acceder a http://localhost:5174/

# 4. Compilar para producción
npm run build
```

---

## 🗄️ Base de Datos en Supabase

El script SQL completo con todas las tablas, relaciones, disparadores (triggers) y políticas RLS se encuentra en:
[`../database/schema.sql`](../database/schema.sql)

Variables de entorno configuradas en `.env`:
```env
VITE_SUPABASE_URL=https://tkdzsalivxswdezpnrtb.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_jV60VzgOLwZcwkgzZNmdpQ_41NY_4OE
```
