/**
 * Script de prueba para ejecutar el cron job manualmente
 * Uso: node backend/test-cron.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Pet from './models/Pet.js';
import { applyInventoryAutoUpdateForPet } from './routes/pet.routes.js';

dotenv.config();

const uri = process.env.URI_MONGO || process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME || 'foodBarf';

if (!uri) {
  console.error('No Mongo URI provided.');
  process.exit(1);
}

mongoose.set('strictQuery', true);

async function testCronJob() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(uri, { dbName });
    console.log('✅ MongoDB conectado\n');

    // Obtener todas las mascotas
    const allPets = await Pet.find({}).populate('ingredients.ingredient');

    if (allPets.length === 0) {
      console.log('📭 No hay mascotas en la base de datos');
      process.exit(0);
    }

    console.log(`🐾 Encontradas ${allPets.length} mascotas:\n`);

    // Mostrar estado actual de cada mascota
    for (const pet of allPets) {
      console.log(`🐕 ${pet.name}`);
      console.log(`   - mealsPerDay: ${pet.mealsPerDay}`);
      console.log(`   - totalInventory: ${pet.totalInventory}`);
      console.log(`   - lastInventoryUpdate: ${pet.lastInventoryUpdate || 'Nunca'}`);
      console.log(`   - feedingTimes: ${pet.feedingTimes?.join(', ') || 'No configurado'}`);
      
      if (pet.ingredients && pet.ingredients.length > 0) {
        console.log(`   - ingredientes:`);
        for (const ing of pet.ingredients) {
          const ingName = ing.ingredient?.name || 'Desconocido';
          console.log(`     • ${ingName}: ${ing.gramsPerBag}g por bolsa`);
        }
      } else {
        console.log(`   - ingredientes: No configurados`);
      }
      console.log('');
    }

    // Ejecutar el rebajo automático
    console.log('\n🚀 Ejecutando rebajo automático...\n');

    let updatedCount = 0;
    let skippedCount = 0;

    for (const pet of allPets) {
      try {
        const result = await applyInventoryAutoUpdateForPet(pet, pet.user._id);

        if (result.consumed > 0) {
          updatedCount++;
          console.log(`  ✅ [${pet.name}] Rebajadas ${result.consumed} comidas`);
          console.log(`     Inventario: ${result.oldInventory} → ${result.newInventory}`);
          console.log(`     Motivo: ${result.reason}\n`);
        } else {
          skippedCount++;
          console.log(`  ⏭️ [${pet.name}] Sin cambios`);
          console.log(`     Motivo: ${result.reason}\n`);
        }
      } catch (error) {
        console.error(`  ❌ [${pet.name}] Error: ${error.message}\n`);
      }
    }

    console.log('\n📊 Resumen:');
    console.log(`   ✅ Actualizadas: ${updatedCount}`);
    console.log(`   ⏭️ Sin cambios: ${skippedCount}`);

    // Verificar registros en ConsumptionHistory
    const { default: ConsumptionHistory } = await import('./models/ConsumptionHistory.js');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRecords = await ConsumptionHistory.find({
      consumptionDate: today
    }).populate('ingredient').populate('pet');

    if (todayRecords.length > 0) {
      console.log('\n📝 Registros creados hoy:');
      for (const record of todayRecords) {
        console.log(`   - ${record.pet?.name}: ${record.ingredient?.name} - ${record.gramsConsumed}g (${record.consumptionType})`);
      }
    }

    console.log('\n✅ Prueba completada\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testCronJob();
