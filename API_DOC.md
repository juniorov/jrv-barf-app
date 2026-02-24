## API - JRV BARF (Node.js + Express + MongoDB)

Documentación rápida de la API REST usada por el frontend Vue.

---

## 1) Requisitos

- Node.js (recomendado LTS).
- MongoDB (Atlas o local).

---

## 2) Variables de entorno (`.env`)

Ejemplo mínimo:

```env
URI_MONGO="mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority"
MONGO_DB_NAME="foodBarf"
PREFIX="barf"

JWT_SECRET="appssecret"
JWT_EXPIRES_IN="8d"

# Opcional: permitir frontend desde otro origen
# CORS_ORIGIN="http://localhost:5173"

# Opcional: puerto del backend
# PORT=4000
```

### Notas importantes

- **`MONGO_DB_NAME`**: nombre de la base de datos lógica. La API se conectará a esa base.
- **`PREFIX`**: prefijo para colecciones. Con `PREFIX=barf` las colecciones quedan:
  - **`barf_users`**
  - **`barf_ingredients`**
  - **`barf_bags`**
- **`JWT_SECRET`**: clave usada para firmar tokens JWT. No la compartas.
- **`CORS_ORIGIN`**: si tu frontend no corre en `http://localhost:5173`, define aquí el origen exacto.

---

## 3) Cómo ejecutar (desarrollo)

En la raíz del proyecto:

```bash
npm install
```

### Backend (API)

```bash
npm run dev:server
```

Por defecto: `http://localhost:4000`

### Frontend (Vite)

```bash
npm run dev
```

Por defecto: `http://localhost:5173`

---

## 4) URL base de la API

- Base local: `http://localhost:4000/api`

En el frontend se usa `VITE_API_URL` (opcional). Si no existe, se usa:
- `http://localhost:4000/api`

---

## 5) Formato de errores

Cuando hay error de negocio/validación, la API responde normalmente con JSON:

```json
{ "message": "Descripción del error" }
```

Ejemplos de códigos:
- **400**: datos inválidos o faltantes.
- **401**: no autenticado / token inválido.
- **404**: recurso no encontrado.
- **409**: conflicto (por ejemplo email o código duplicado).
- **500**: error interno.

---

## 6) Autenticación (JWT)

La API usa JWT en el header:

```
Authorization: Bearer <token>
```

El frontend guarda el token en `localStorage` bajo `barf_token`.

---

## 7) Endpoints

### 7.1 Healthcheck

**GET** `/health`

Respuesta:

```json
{ "status": "ok" }
```

---

### 7.2 Auth

#### Registrar usuario

**POST** `/auth/register`

Body:

```json
{ "email": "user@mail.com", "password": "123456" }
```

Respuesta (201):

```json
{
  "token": "jwt...",
  "user": {
    "id": "mongoId",
    "email": "user@mail.com",
    "maxIngredientsPerBag": 5
  }
}
```

#### Login

**POST** `/auth/login`

Body:

```json
{ "email": "user@mail.com", "password": "123456" }
```

Respuesta (200): igual que register (token + user).

#### Usuario actual (requiere token)

**GET** `/auth/me`

Respuesta:

```json
{ "id": "mongoId", "email": "user@mail.com", "maxIngredientsPerBag": 5 }
```

#### Recuperación de contraseña (demo)

**POST** `/auth/forgot-password`

Body:

```json
{ "email": "user@mail.com" }
```

Respuesta (200):

```json
{ "message": "..." }
```

Nota: en este demo el backend imprime en consola el token de recuperación.

#### Resetear contraseña (demo)

**POST** `/auth/reset-password`

Body:

```json
{ "token": "tokenGenerado", "password": "nuevaClave123" }
```

Respuesta:

```json
{ "message": "Contraseña actualizada correctamente" }
```

---

### 7.3 Ingredientes (requiere token)

#### Listar ingredientes

**GET** `/ingredients`

Respuesta:

```json
[
  {
    "_id": "mongoId",
    "user": "mongoUserId",
    "name": "Pollo",
    "code": "POLLO",
    "desiredPortions": 0
  }
]
```

#### Crear ingrediente

**POST** `/ingredients`

Body:

```json
{
  "name": "Pollo",
  "code": "POLLO",
  "desiredPortions": 0
}
```

Respuesta (201): ingrediente creado.

Restricciones:
- `code` es único por usuario (`user + code`).
- `desiredPortions` mínimo 0.

#### Editar ingrediente

**PUT** `/ingredients/:id`

Body (se envía el objeto completo):

```json
{
  "name": "Pollo",
  "code": "POLLO",
  "desiredPortions": 10
}
```

Respuesta: ingrediente actualizado.

#### Eliminar ingrediente

**DELETE** `/ingredients/:id`

Respuesta (204): sin body.

---

### 7.4 Bolsas / platos incompletos (requiere token)

#### Listar bolsas

**GET** `/bags`

Respuesta:

```json
[
  {
    "_id": "mongoId",
    "name": "Bolsa Pollo + Ternera",
    "quantity": 2,
    "completedCount": 0,
    "isCompleted": false,
    "ingredients": [
      { "ingredient": { "_id": "ingId", "name": "Pollo" }, "gramsPerBag": 200 }
    ]
  }
]
```

#### Crear bolsa

**POST** `/bags`

Body:

```json
{
  "name": "Bolsa Pollo + Ternera",
  "quantity": 2,
  "ingredients": [
    { "ingredient": "ingredientMongoId", "gramsPerBag": 200 }
  ]
}
```

Restricciones:
- `ingredients.length` **no puede superar** `maxIngredientsPerBag` del usuario.
- Los `ingredient` deben existir y pertenecer al usuario.

#### Editar bolsa

**PUT** `/bags/:id`

Body: igual a crear.

#### Eliminar bolsa

**DELETE** `/bags/:id`

Respuesta (204).

#### Marcar bolsa como completada

**POST** `/bags/:id/complete`

Body: `{}` (vacío).

Efecto:
- `completedCount += quantity`
- `isCompleted = true`

Respuesta: bolsa actualizada.

---

### 7.5 Mascotas (requiere token)

#### Listar mascotas

**GET** `/pets`

Respuesta:

```json
[
  {
    "_id": "mongoId",
    "user": "mongoUserId",
    "name": "Rocky",
    "age": 3,
    "ingredients": [
      {
        "ingredient": {
          "_id": "ingredientId",
          "name": "Pollo",
          "code": "POLLO"
        },
        "gramsPerPortion": 150
      }
    ],
    "mealsPerDay": 2,
    "maxIngredientsPerBag": 5,
    "totalInventory": 10,
    "feedingTimes": ["08:00", "20:00"]
  }
]
```

#### Crear mascota

**POST** `/pets`

Body:

```json
{
  "name": "Rocky",
  "age": 3,
  "mealsPerDay": 2,
  "maxIngredientsPerBag": 5,
  "feedingTimes": ["08:00", "20:00"]
}
```

Respuesta (201): mascota creada.

#### Editar mascota

**PUT** `/pets/:id`

Body: igual a crear.

#### Eliminar mascota

**DELETE** `/pets/:id`

Respuesta (204).

#### Obtener ingredientes de una mascota

**GET** `/pets/:id/ingredients`

Respuesta:

```json
[
  {
    "ingredient": {
      "_id": "ingredientId",
      "name": "Pollo",
      "code": "POLLO"
    },
    "gramsPerPortion": 150
  }
]
```

#### Actualizar ingredientes de una mascota

**PUT** `/pets/:id/ingredients`

Body:

```json
{
  "ingredients": [
    {
      "ingredient": "ingredientMongoId",
      "gramsPerPortion": 150
    }
  ]
}
```

Respuesta: ingredientes actualizados de la mascota.

---

### 7.6 Configuración (requiere token)

#### Ver configuración

**GET** `/config/settings`

Respuesta:

```json
{ "maxIngredientsPerBag": 5 }
```

#### Guardar configuración

**PUT** `/config/settings`

Body:

```json
{ "maxIngredientsPerBag": 6 }
```

Respuesta:

```json
{ "maxIngredientsPerBag": 6 }
```

---

## 8) Problemas comunes

### “Failed to fetch” en el frontend

Suele ser:
- Backend no levantado (`npm run dev:server`).
- CORS: el frontend no está en `http://localhost:5173`.

Prueba:
- Abrir `http://localhost:4000/api/health` y verificar `{"status":"ok"}`.
- Si el frontend corre en otro origen, define `CORS_ORIGIN` en `.env` (ej: `http://127.0.0.1:5173`).

