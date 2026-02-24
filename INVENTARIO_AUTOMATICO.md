# Sistema de Rebajo Automático de Inventario

## ¿Qué es el rebajo automático?

El sistema de rebajo automático de inventario reduce automáticamente las bolsas disponibles de tus mascotas según sus horarios de comida configurados. **Se integra perfectamente con el botón "Registrar día de comida" existente**, evitando rebajo duplicado.

## Integración con rebajo manual

### 🔴 Sistema Manual (existente)
- **Botón**: "Registrar día de comida" en la sección de mascotas
- **Función**: Rebaja manualmente todas las comidas del día (`mealsPerDay`)
- **Registro**: Crea entradas con tipo `'manual'` en el historial
- **Uso**: Cuando quieres registrar manualmente un día completo de alimentación

### 🟢 Sistema Automático (nuevo)
- **Ejecución**: Se activa automáticamente al abrir dashboard, ver mascotas, etc.
- **Función**: Rebaja automáticamente según horarios y tiempo transcurrido
- **Registro**: Crea entradas con tipo `'automatic'` en el historial
- **Inteligencia**: **Detecta y respeta los rebajos manuales existentes**

### ⚡ Prevención de doble rebajo
El sistema automático es inteligente y:
1. **Consulta el historial** antes de hacer rebajo automático
2. **Detecta registros manuales** en el período a procesar
3. **Resta las comidas ya rebajadas manualmente** del cálculo automático
4. **Solo rebaja lo que realmente falta** según los horarios programados

## ¿Cómo funciona?

### 1. Configuración de mascotas
Para que funcione correctamente, cada mascota debe tener configurado:
- **Comidas por día** (`mealsPerDay`): Número de comidas diarias
- **Horarios de comida** (`feedingTimes`): Opcional, horarios específicos (ej: ["08:00", "20:00"])
- **Inventario total** (`totalInventory`): Número de bolsas completas disponibles

### 2. Lógica de rebajo

#### Modo simple (sin horarios específicos)
- Si no hay horarios configurados, el sistema usa `mealsPerDay`
- El rebajo se hace por días completos transcurridos
- Ejemplo: Si una mascota come 2 veces al día y han pasado 2 días desde la última actualización, se rebajarán 4 bolsas (2×2)

#### Modo detallado (con horarios específicos)
- Si hay horarios configurados (ej: ["09:00", "21:00"]), el sistema cuenta cada comida individual
- El rebajo se hace según la hora actual vs los horarios programados
- Ejemplo: Si son las 15:00 y la mascota come a las 09:00 y 21:00, solo se rebaja la comida de las 09:00

### 3. ¿Cuándo se ejecuta?

El rebajo automático se ejecuta:
- **Al abrir el dashboard** - Principal punto de entrada
- **Al ver las mascotas** - En la sección de mascotas
- **Al ver las bolsas** - Al consultar bolsas de comida
- **Manualmente** - Usando el botón "Forzar" en el dashboard
- **Automáticamente** - Opcional: Se puede configurar un cron job para medianoche

### 4. Registro de consumo

Cada rebajo automático:
- Reduce el `totalInventory` de la mascota
- Incrementa el `consumedCount` de la mascota
- Crea registros en `ConsumptionHistory` con tipo `'automatic'`
- Actualiza `lastInventoryUpdate` con la fecha/hora actual

## Mejores prácticas

### 🎯 ¿Cuándo usar cada sistema?

**Usa el botón "Registrar día de comida" (manual) cuando:**
- Quieres hacer un rebajo inmediato de un día completo
- No has configurado horarios específicos para la mascota
- Necesitas ajustar manualmente el inventario por situaciones especiales
- Quieres un control más granular día por día

**Deja que el sistema automático trabaje cuando:**
- Has configurado horarios específicos de comida (`feedingTimes`)
- Quieres automatización completa basada en tiempo real
- Tienes rutinas regulares de alimentación
- Quieres minimizar el trabajo manual

### ✅ Configuración recomendada

1. **Configura horarios específicos** en tus mascotas (ej: ["08:00", "18:00"])
2. **Deja que el automático funcione** para el día a día
3. **Usa el manual solo cuando sea necesario** (ajustes, irregularidades)
4. **Revisa el dashboard regularmente** para verificar el estado

### ⚠️ Lo que debes saber

- **No hay rebajo duplicado**: Los sistemas se coordinan automáticamente
- **El manual prevalece**: Si registras manualmente, el automático lo respeta
- **Historial completo**: Ambos tipos de rebajo se registran para auditoría
- **Flexibilidad total**: Puedes alternar entre ambos sin problemas

## Estado de actualización en el Dashboard

En el dashboard puedes ver el estado de actualización de cada mascota:

- **🟢 Actualizado** - Última actualización hace menos de 1 hora
- **🔵 Reciente** - Última actualización hace menos de 24 horas
- **🟡 Pendiente** - Última actualización hace 24-72 horas
- **🔴 Desactualizado** - Última actualización hace más de 72 horas

## Forzar actualización manual

Si necesitas forzar una actualización del inventario:

1. Ve al Dashboard
2. Busca la tarjeta de la mascota
3. Haz clic en el botón **"Forzar"**
4. El sistema aplicará inmediatamente el rebajo según las comidas pendientes

## Configuración automática (Cron Job)

Para automatizar completamente el proceso, puedes configurar un cron job que llame al endpoint del sistema:

```bash
# Ejecutar todos los días a medianoche
0 0 * * * curl -X POST http://tu-servidor.com/api/pets/system/auto-inventory-update \
  -H "Content-Type: application/json" \
  -d '{"systemToken": "tu-token-secreto"}'
```

## Ejemplos prácticos

### Ejemplo 1: Integración manual + automático
- **Mascota**: Luna
- **Comidas**: 2 por día ["08:00", "20:00"]
- **Inventario**: 50 bolsas
- **Último rebajo automático**: Ayer a las 06:00

**Escenario**: Ayer a las 15:00 usaste **"Registrar día de comida"** manualmente
- Rebajo manual: 2 bolsas (día completo)
- Inventario después del manual: 48 bolsas

**Hoy a las 10:00** el sistema automático verifica:
- ✅ Detecta rebajo manual de ayer
- ✅ Solo rebaja la comida de hoy 08:00 (1 bolsa)
- ✅ **No duplica** el rebajo de ayer
- **Inventario final**: 47 bolsas

### Ejemplo 2: Solo rebajo automático
- **Mascota**: Max
- **Comidas**: 3 por día (sin horarios específicos)
- **Inventario**: 30 bolsas
- **Sin rebajo manual en 2 días**

**Resultado automático**:
- Se rebajan 6 bolsas (3 × 2 días completos)
- Inventario final: 24 bolsas

### Ejemplo 3: Combinación compleja
- **Mascotas**: Firulais
- **Comidas**: 2 por día ["07:00", "19:00"]
- **Período**: 3 días sin revisión

**Día 1**: Rebajo automático (2 bolsas)
**Día 2**: Usuario usa "Registrar día de comida" manualmente (2 bolsas)
**Día 3**: Sistema automático detecta el manual del día 2 y solo rebaja día 3 (2 bolsas)

**Total rebajado**: 6 bolsas (sin duplicación)

## Mejores prácticas

### 🎯 ¿Cuándo usar cada sistema?

**Usa el botón "Registrar día de comida" (manual) cuando:**
- Quieres hacer un rebajo inmediato de un día completo
- No has configurado horarios específicos para la mascota
- Necesitas ajustar manualmente el inventario por situaciones especiales
- Quieres un control más granular día por día

**Deja que el sistema automático trabaje cuando:**
- Has configurado horarios específicos de comida (`feedingTimes`)
- Quieres automatización completa basada en tiempo real
- Tienes rutinas regulares de alimentación
- Quieres minimizar el trabajo manual

### ✅ Configuración recomendada

1. **Configura horarios específicos** en tus mascotas (ej: ["08:00", "18:00"])
2. **Deja que el automático funcione** para el día a día
3. **Usa el manual solo cuando sea necesario** (ajustes, irregularidades)
4. **Revisa el dashboard regularmente** para verificar el estado

### ⚠️ Lo que debes saber

- **No hay rebajo duplicado**: Los sistemas se coordinan automáticamente
- **El manual prevalece**: Si registras manualmente, el automático lo respeta
- **Historial completo**: Ambos tipos de rebajo se registran para auditoría
- **Flexibilidad total**: Puedes alternar entre ambos sin problemas

## Troubleshooting

### El inventario no se ha rebajado automáticamente
1. ✅ Verifica que la mascota tenga `mealsPerDay > 0`
2. ✅ Confirma que hay inventario disponible (`totalInventory > 0`)
3. ✅ Revisa la fecha de `lastInventoryUpdate`
4. ✅ **Verifica si ya usaste "Registrar día de comida"** - el automático respeta rebajos manuales
5. 🔧 Usa el botón "Forzar" en el dashboard para probar manualmente

### El rebajo automático es menor de lo esperado
1. 🔍 **Revisa el historial de consumo** - puede que hayas usado rebajo manual anteriormente
2. 🔍 El sistema resta automáticamente los registros manuales existentes
3. 🔍 Verifica que los horarios de comida estén bien configurados
4. 🔍 Consulta los logs del sistema para ver los detalles del cálculo

### Rebajo incorrecto o inesperado
1. 🔧 Revisa el formato de `feedingTimes` (debe ser ["HH:MM"])
2. 🔧 Verifica la zona horaria del servidor
3. 🔧 **Consulta el historial** para ver registros manuales vs automáticos
4. 🔧 Compara las fechas de `lastInventoryUpdate` con tus registros manuales

### Integración manual vs automático
- **✅ Normal**: El automático rebaja menos cuando hay registros manuales
- **✅ Normal**: Diferentes días pueden tener diferentes tipos de registro
- **❌ Problema**: Si ves rebajo duplicado para el mismo día (reportar bug)
- **❌ Problema**: Si el automático no detecta registros manuales (verificar fechas)

### Horarios no funcionan
- Los horarios deben estar en formato 24 horas: "08:00", "14:30", "20:00"
- Deben ser strings válidos que coincidan con el patrón `/^\d{1,2}:\d{2}$/`

## Endpoints de la API

### Sistema Automático
- `GET /pets/` - Aplica rebajo automático y obtiene mascotas
- `GET /dashboard/pet-statistics` - Aplica rebajo automático y obtiene estadísticas
- `GET /dashboard/summary` - Aplica rebajo automático y obtiene resumen
- `GET /pets/inventory-status` - Obtiene estado de inventario de todas las mascotas
- `POST /pets/:id/force-inventory-update` - Forzar rebajo automático para una mascota específica
- `POST /pets/system/auto-inventory-update` - Rebajo automático del sistema (para cron jobs)

### Sistema Manual (existente)
- `POST /pets/:id/feed-day` - **Registrar día de comida manual** (botón en sección mascotas)
- `PUT /pets/:id` - Actualizar mascota (incluye inventario directo)
- `PATCH /pets/:id/inventory` - Actualizar solo el inventario de una mascota

### Integración
Ambos sistemas:
- Usan el mismo campo `totalInventory` en la mascota
- Generan entradas en `ConsumptionHistory` (tipo `'manual'` o `'automatic'`)
- Se coordinan para evitar rebajo duplicado
- Respetan el límite de inventario disponible

## Seguridad y Garantías

- ✅ **Sin duplicación**: El sistema automático detecta y respeta registros manuales existentes
- ✅ **Límites**: Nunca rebaja más inventario del disponible (no puede ser negativo)
- ✅ **Auditoría**: Todos los rebajos se registran en historial con timestamp y tipo (`'manual'` o `'automatic'`)
- ✅ **Autenticación**: Todos los endpoints requieren autenticación (excepto el cron del sistema)
- ✅ **Precisión temporal**: Solo rebaja comidas que han "pasado" según horarios reales
- ✅ **Reversibilidad**: El historial permite rastrear y entender todos los cambios
- ✅ **Coordinación**: Manual y automático trabajan juntos sin conflictos
- ✅ **Flexibilidad**: Puedes usar solo manual, solo automático, o ambos sistemas