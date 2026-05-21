import { Router } from 'express';
import Pet from '../models/Pet.js';
import Bag from '../models/Bag.js';
import Ingredient from '../models/Ingredient.js';
import { authRequired } from '../middleware/auth.js';
import { applyInventoryAutoUpdateForPet } from './pet.routes.js';

const router = Router();

// Todas las rutas de este módulo requieren autenticación
router.use(authRequired);

// Obtener estadísticas del dashboard por mascota
router.get('/pet-statistics', async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Obtener todas las mascotas del usuario
    const pets = await Pet.find({ user: userId });

    // Aplicar rebajo automático de inventario para cada mascota
    for (const pet of pets) {
      await applyInventoryAutoUpdateForPet(pet, userId);
    }

    if (pets.length === 0) {
      return res.json([]);
    }

    const petStatistics = await Promise.all(
      pets.map(async (pet) => {
        // Obtener bolsas incompletas para esta mascota
        const incompleteBags = await Bag.find({
          user: userId,
          pet: pet._id,
          isComplete: false
        });

        // Contar bolsas incompletas
        const incompleteBagsCount = incompleteBags.reduce((sum, bag) => sum + bag.quantity, 0);

        // Calcular proyección de inventario basada en el consumo diario
        let projectedEmptyDate = null;
        let recommendedPurchaseDate = null;

        if (pet.totalInventory > 0 && pet.mealsPerDay > 0) {
          // Días que durarán las bolsas completas
          const daysUntilEmpty = Math.floor(pet.totalInventory / pet.mealsPerDay);

          projectedEmptyDate = new Date();
          projectedEmptyDate.setDate(projectedEmptyDate.getDate() + daysUntilEmpty);

          recommendedPurchaseDate = new Date(projectedEmptyDate);
          recommendedPurchaseDate.setDate(recommendedPurchaseDate.getDate() - 7);
        }

        return {
          pet: {
            id: pet._id,
            name: pet.name,
            age: pet.age,
            mealsPerDay: pet.mealsPerDay,
            totalInventory: pet.totalInventory,
            consumedCount: pet.consumedCount,
            feedingTimes: pet.feedingTimes || [],
            lastInventoryUpdate: pet.lastInventoryUpdate
          },
          completeBags: pet.totalInventory,
          incompleteBagsCount,
          projectedEmptyDate,
          recommendedPurchaseDate
        };
      })
    );

    res.json(petStatistics);
  } catch (error) {
    next(error);
  }
});

// Obtener resumen general del dashboard
router.get('/summary', async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Aplicar rebajo automático antes de calcular estadísticas
    const allPets = await Pet.find({ user: userId });
    for (const pet of allPets) {
      await applyInventoryAutoUpdateForPet(pet, userId);
    }

    const [pets, bags, ingredients] = await Promise.all([
      Pet.countDocuments({ user: userId }),
      Bag.countDocuments({ user: userId }),
      Ingredient.countDocuments({ user: userId })
    ]);

    // Contar bolsas completas (recetas completadas)
    const completedRecipes = await Bag.countDocuments({
      user: userId,
      isComplete: true
    });

    const incompleteRecipes = bags - completedRecipes;

    // Sumar el inventario total de todas las mascotas (esto represent las "bolsas completas" reales)
    const petsWithInventory = await Pet.find({ user: userId }).select('totalInventory');
    const totalInventory = petsWithInventory.reduce((sum, pet) => sum + (pet.totalInventory || 0), 0);

    res.json({
      totalPets: pets,
      totalBags: bags,
      completedBags: totalInventory, // Ahora usa el inventario total, no las recetas completadas
      incompleteBags: incompleteRecipes, // Estas son recetas incompletas, no inventario
      totalIngredients: ingredients,
      totalInventory
    });
  } catch (error) {
    next(error);
  }
});

export default router;