# JRV BARF App - Contexto del Proyecto

## Descripción

Aplicación full-stack para gestionar alimentación BARF (dieta cruda biológicamente apropiada) para mascotas.

## Stack

- **Frontend:** Vue 3 + Vite + Pinia + Vue Router + Bootstrap + Chart.js + PWA
- **Backend:** Node.js + Express + MongoDB (Mongoose) + JWT + node-cron
- **Despliegue:** Backend en Render.com, Frontend en Netlify

## Scripts

```bash
npm run dev          # Frontend (Vite)
npm run dev:server   # Backend (Express)
npm run build        # Build producción
npm run start        # Iniciar backend producción
```

## Documentación

- `API_DOC.md` - Endpoints y modelos de la API
- `CONSUMO_DOC.md` - Sistema de gráfico de consumo
- `INVENTARIO_AUTOMATICO.md` - Rebajo automático/manual de inventario
- `DEPLOY.md` - Guía de despliegue

## Estructura clave

- `src/` - Frontend Vue
- `backend/` - API Express
- Variables de entorno en `.env` (ver `.env.example`)