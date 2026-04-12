# 📊 Sistema de Consumo por Ingrediente - Documentación Completa

## 🎯 Resumen General

El gráfico "Consumo por Ingrediente" muestra cuántos gramos de cada ingrediente han consumido tus mascotas durante un mes específico. Los datos se generan automáticamente mediante el sistema de rebajo de inventario.

---

## 🔄 Flujo Completo de Datos

### 1️⃣ **Configuración de la Mascota**

Cada mascota tiene configurada:
- ✅ **mealsPerDay**: Número de comidas por día (ej: 2)
- ✅ **feedingTimes**: Horarios específicos (opcional, ej: ["08:00", "18:00"])
- ✅ **totalInventory**: Cantidad de bolsas completas disponibles
- ✅ **ingredients**: Ingredientes que componen cada bolsa con sus gramos

**Ejemplo:**
```javascript
{
  name: "Max",
  mealsPerDay: 2,
  feedingTimes: ["08:00", "18:00"],
  totalInventory: 30,
  ingredients: [
    { ingredient: "pollo", gramsPerBag: 150 },
    { ingredient: "arroz", gramsPerBag: 100 },
    { ingredient: "zanahoria", gramsPerBag: 50 }
  ]
}
```

---

### 2️⃣ **Rebajo Automático del Inventario**

**¿Cuándo se ejecuta?**

El rebajo automático (`applyInventoryAutoUpdateForPet`) se ejecuta en dos situaciones:

#### **A) Manual/Cuando se usa la app:**
- Al cargar el dashboard
- Al cargar la lista de mascotas
- Al completar una bolsa
- Al forzar actualización desde el dashboard

#### **B) Automático/Cron Job (DIARIO):**
- **Todos los días a medianoche** (00:00 hora Costa Rica UTC-6)
- Se ejecuta automáticamente sin intervención del usuario
- Procesa TODAS las mascotas de TODOS los usuarios

**¿Cómo calcula el consumo?**

```javascript
// Escenario 1: Sin horarios específicos (feedingTimes vacío)
díasTranscurridos = hoy - últimaActualización
comidasConsumir = díasTranscurridos × mealsPerDay

// Escenario 2: Con horarios específicos (feedingTimes configurado)
comidasConsumir = contarHorariosEntre(lastInventoryUpdate, ahora)

// Luego, para cada ingrediente:
gramsConsumed = gramsPerBag × comidasConsumir
```

**Ejemplo práctico:**
```
Tu perro Max:
- mealsPerDay: 2
- Última actualización: hace 3 días
- Ingredientes por bolsa: Pollo 150g, Arroz 100g, Zanahoria 50g

Cálculo:
- Comidas a rebajar: 3 días × 2 comidas = 6 comidas
- Pollo consumido: 150g × 6 = 900g
- Arroz consumido: 100g × 6 = 600g
- Zanahoria consumida: 50g × 6 = 300g
```

---

### 3️⃣ **Registro en ConsumptionHistory**

Cada vez que se ejecuta el rebajo automático, se crea un registro en la base de datos:

```javascript
{
  user: userId,
  pet: petId,
  ingredient: ingredientId,
  gramsConsumed: 900,        // Gramos consumidos
  bagsConsumed: 6,           // Bolsas/comidas consumidas
  consumptionDate: 2026-04-11, // Fecha (sin hora)
  consumptionType: 'automatic'  // Tipo: 'automatic' o 'manual'
}
```

**Importante:**
- Se crea UN registro por ingrediente por día
- Si ya existe un registro para ese día, se **actualiza** (suma los gramos)
- Evita duplicados con registros manuales

---

### 4️⃣ **Generación del Gráfico**

**Endpoint:** `GET /api/dashboard/monthly-consumption?year=2026&month=4`

**Proceso:**
1. Busca todos los registros de `ConsumptionHistory` del mes seleccionado
2. Agrupa por ingrediente y suma los `gramsConsumed`
3. Formatea los datos (convierte a kg si >= 1000g)
4. Ordena por cantidad descendente

**Respuesta:**
```json
{
  "year": 2026,
  "month": 4,
  "monthName": "abril",
  "hasData": true,
  "totalRecords": 60,
  "consumption": [
    {
      "ingredient": "pollo",
      "amount": "2.5 kg",
      "gramsTotal": 2500
    },
    {
      "ingredient": "arroz",
      "amount": "1.8 kg",
      "gramsTotal": 1800
    },
    {
      "ingredient": "zanahoria",
      "amount": "900 g",
      "gramsTotal": 900
    }
  ]
}
```

---

### 5️⃣ **Visualización con Chart.js**

El frontend recibe los datos y crea un gráfico de barras:

**Características del gráfico:**
- ✅ Barras verticales con colores diferentes por ingrediente
- ✅ Eje Y con formato automático (g o kg)
- ✅ Tooltips con valores formateados
- ✅ Responsive (se adapta al tamaño de pantalla)
- ✅ Se actualiza al cambiar mes/año

**Código clave:**
```javascript
// Crear el gráfico
createConsumptionChart() {
  const labels = consumption.map(item => item.ingredient);
  const data = consumption.map(item => item.gramsTotal);
  
  new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [...] },
    options: { responsive: true, ... }
  });
}
```

---

## 🕐 Cron Job - Detalles Técnicos

**Configuración:**
- **Librería:** `node-cron`
- **Schedule:** `'0 0 * * *'` (cada día a medianoche)
- **Timezone:** `America/Costa_Rica` (UTC-6)

**Funcionamiento:**
```
00:00 AM (hora Costa Rica)
  ↓
Obtener TODAS las mascotas de TODOS los usuarios
  ↓
Para cada mascota:
  - Calcular comidas pendientes
  - Rebajar inventario
  - Crear registros en ConsumptionHistory
  ↓
Mostrar resumen en consola:
  ✅ Mascotas actualizadas
  ⏭️ Mascotas sin cambios
  ❌ Errores (si los hay)
```

**Logs de ejemplo:**
```
🕐 [CRON] Ejecutando rebajo automático de inventario...
🐾 [CRON] Encontradas 5 mascotas para actualizar
  ✅ [Max] Rebajadas 2 comidas (30 → 28)
  ✅ [Luna] Rebajadas 2 comidas (25 → 23)
  ⏭️ [Rocky] Sin cambios (inventario vacío)

📊 [CRON] Resumen: 2 actualizadas, 3 sin cambios, 0 errores (1.23s)
```

---

## 🔍 Troubleshooting

### ❓ El gráfico no muestra datos

**Causas posibles:**
1. ✅ No hay mascotas registradas
2. ✅ Las mascotas no tienen `ingredients` configurados
3. ✅ El inventario está vacío (`totalInventory = 0`)
4. ✅ No han pasado días desde la última actualización

**Solución:**
```bash
# Forzar actualización manual desde el dashboard
# O llamar al endpoint:
curl -X POST http://localhost:4000/api/pets/auto-update-all
```

### ❓ Los datos del gráfico son incorrectos

**Verificar:**
1. ✅ Que `mealsPerDay` esté configurado correctamente
2. ✅ Que los ingredientes tengan `gramsPerBag` definidos
3. ✅ Que `lastInventoryUpdate` no sea una fecha futura
4. ✅ Revisar logs del cron job para ver cuánto se rebajó

### ❓ El cron job no se está ejecutando

**Verificar:**
```bash
# Ver logs del servidor backend
# Deberías ver este mensaje al iniciar:
✅ [CRON] Programado rebajo automático diario a medianoche (hora Costa Rica)

# A medianoche deberías ver:
🕐 [CRON] Ejecutando rebajo automático de inventario...
```

---

## 📝 Resumen Visual del Flujo

```
┌─────────────────────────────────────────────────────────────┐
│  CONFIGURACIÓN DE MASCOTA                                   │
│  - mealsPerDay: 2                                           │
│  - ingredients: [{pollo: 150g}, {arroz: 100g}, ...]        │
│  - totalInventory: 30 bolsas                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  REBAJO AUTOMÁTICO (2 veces/día)                            │
│  ┌─────────────────┐    ┌──────────────────────────────────┐│
│  │ Manual:         │    │ Cron Job:                        ││
│  │ - Usar app      │    │ - Todos los días 00:00 AM        ││
│  │ - Dashboard     │    │ - Procesa TODAS las mascotas     ││
│  │ - Completar bolsa│   │ - Sin intervención del usuario   ││
│  └─────────────────┘    └──────────────────────────────────┘│
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  REGISTRO EN BASE DE DATOS (ConsumptionHistory)             │
│  - ingredient: pollo                                        │
│  - gramsConsumed: 300 (150g × 2 comidas)                   │
│  - consumptionDate: 2026-04-11                              │
│  - consumptionType: 'automatic'                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  GRÁFICO "CONSUMO POR INGREDIENTE"                          │
│  - Agrupa por ingrediente                                   │
│  - Suma gramsConsumed del mes                               │
│  - Muestra barras de colores                                │
│  - Formato: g o kg automáticamente                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Mejores Prácticas

1. **Configurar bien los horarios**: Si usas `feedingTimes`, pon horarios realistas
2. **Revisar el dashboard semanalmente**: Asegura que el gráfico muestre datos correctos
3. **Monitorear logs del cron job**: Verifica que se ejecute correctamente
4. **Mantener inventario actualizado**: El gráfico es tan preciso como el inventario

---

## 📚 Archivos Clave

| Archivo | Función |
|---------|---------|
| `backend/cron-inventory-update.js` | Cron job diario automático |
| `backend/routes/pet.routes.js` | Función `applyInventoryAutoUpdateForPet` |
| `backend/routes/dashboard.routes.js` | Endpoint `/monthly-consumption` |
| `backend/models/ConsumptionHistory.js` | Modelo de registros de consumo |
| `src/views/DashboardView.vue` | Gráfico Chart.js + UI |

---

**Última actualización:** Abril 11, 2026
