import cron from 'node-cron';
import Pet from './models/Pet.js';
import { applyInventoryAutoUpdateForPet } from './routes/pet.routes.js';

/**
 * Cron job que se ejecuta cada día a medianoche (00:00)
 * para aplicar el rebajo automático del inventario de todas las mascotas.
 * 
 * Esto asegura que los datos de consumo en el gráfico sean precisos,
 * incluso si nadie accede a la aplicación por varios días.
 */
export function startInventoryAutoUpdateCron() {
  // Programar tarea: '0 0 * * *' = cada día a las 00:00 (medianoche)
  // Zona horaria: America/Costa_Rica (UTC-6)
  cron.schedule(
    '0 0 * * *',
    async () => {
      console.log('\n🕐 [CRON] Ejecutando rebajo automático de inventario...');
      const startTime = Date.now();

      try {
        // Obtener todas las mascotas de todos los usuarios
        const allPets = await Pet.find({}).populate('ingredients.ingredient');

        if (allPets.length === 0) {
          console.log('📭 [CRON] No hay mascotas para actualizar\n');
          return;
        }

        console.log(`🐾 [CRON] Encontradas ${allPets.length} mascotas para actualizar`);

        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        // Aplicar rebajo automático para cada mascota
        for (const pet of allPets) {
          try {
            const result = await applyInventoryAutoUpdateForPet(pet, pet.user._id);

            if (result.consumed > 0) {
              updatedCount++;
              console.log(
                `  ✅ [${pet.name}] Rebajadas ${result.consumed} comidas ` +
                `(${result.oldInventory} → ${result.newInventory})`
              );
            } else {
              skippedCount++;
            }
          } catch (error) {
            errorCount++;
            console.error(`  ❌ [${pet.name}] Error: ${error.message}`);
          }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(
          `\n📊 [CRON] Resumen: ${updatedCount} actualizadas, ` +
          `${skippedCount} sin cambios, ${errorCount} errores (${duration}s)\n`
        );
      } catch (error) {
        console.error('❌ [CRON] Error ejecutando rebajo automático:', error);
      }
    },
    {
      timezone: 'America/Costa_Rica' // Zona horaria de Costa Rica (UTC-6)
    }
  );

  console.log('✅ [CRON] Programado rebajo automático diario a medianoche (hora Costa Rica)');
}
