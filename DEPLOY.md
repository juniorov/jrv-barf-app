# Guía de Despliegue en Render.com

## Configuración del Backend en Render.com

### 1. Variables de Entorno Requeridas

En la sección "Environment" de tu servicio de Render.com, configura:

```
NODE_ENV=production
MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/barf_prod
JWT_SECRET=tu_jwt_secret_muy_largo_y_seguro_para_produccion
PREFIX=barf
```

### 2. Variables Opcionales

```
PORT=10000
CORS_ORIGIN=https://tudominio-personalizado.com
```

**Nota:** No es necesario configurar `CORS_ORIGIN` si usas Netlify con `foodbarf.netlify.app`, ya está incluido por defecto.

### 3. Configuración de Build

- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Node Version:** 18.x o superior

### 4. Verificación del Deploy

1. Ve a `https://tu-app.onrender.com/api/health`
2. Deberías ver: `{"status": "ok"}`
3. Revisa los logs en Render.com para mensajes de CORS:
   ```
   Allowed CORS origins: [...]
   API listening on http://localhost:10000
   ```

## Configuración del Frontend en Netlify

### Variables de Entorno en Netlify

En la sección "Environment variables" de tu sitio de Netlify:

```
VITE_API_URL=https://jrv-barf-app.onrender.com/api
```

### Build Settings

- **Build Command:** `npm run build`
- **Publish Directory:** `dist`
- **Node Version:** 18.x o superior

## Troubleshooting CORS

Si sigues teniendo problemas de CORS:

1. **Verifica los logs de Render.com** buscando:
   ```
   CORS request from origin: https://foodbarf.netlify.app
   CORS: Origin allowed
   ```

2. **Si ves "CORS: Origin blocked"**, verifica que tu dominio de Netlify esté en la lista permitida

3. **Prueba el endpoint directamente** en tu navegador:
   `https://jrv-barf-app.onrender.com/api/health`

4. **Verifica que Netlify tenga la variable correcta**:
   - Netlify Site Settings → Environment Variables
   - `VITE_API_URL` debe apuntar a tu app de Render.com

## URLs Importantes

- **Backend Health Check:** https://jrv-barf-app.onrender.com/api/health
- **Frontend en Netlify:** https://foodbarf.netlify.app
- **Logs de Render:** https://dashboard.render.com → tu servicio → Logs