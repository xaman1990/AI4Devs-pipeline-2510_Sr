# Prompts utilizados

## CI/CD Pipeline (GitHub Actions) - 2025-02-10

**Prompt:**

```
Eres un experto en DevOps y GitHub Actions. Necesito que crees la estructura base de un workflow de CI/CD.

## Requerimientos

1. El archivo debe ubicarse en: `.github/workflows/pipeline.yml`

2. El workflow debe dispararse SOLO cuando:
   - Hay un push a cualquier rama
   - Y esa rama tiene un Pull Request abierto hacia `main`
   
3. Debe tener 3 jobs secuenciales:
   - `test`: Ejecutar pruebas automatizadas
   - `build`: Generar build de producción
   - `deploy`: Desplegar a EC2 (solo si es PR hacia main)

4. Variables de entorno necesarias (usar GitHub Secrets):
   - NODE_ENV
   - DATABASE_URL (o variables individuales de DB)
   - JWT_SECRET
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY
   - EC2_HOST (IP o DNS del servidor)
   - EC2_USER (usuario SSH, ej: ec2-user, ubuntu)
   - EC2_SSH_KEY (clave privada PEM)

5. Usar Ubuntu latest como runner

## Estructura esperada
```yaml
name: CI/CD Pipeline

on:
  push:
    branches-ignore:
      - main  # No ejecutar en push directo a main
  pull_request:
    branches:
      - main
    types: [opened, synchronize, reopened]

jobs:
  test:
    # ...
  build:
    needs: test
    # ...
  deploy:
    needs: build
    if: github.event_name == 'pull_request'
    # ...
```

## Entregable

Genera el archivo YAML completo con:
- Comentarios explicativos en cada sección
- Placeholders claros para secretos
- La estructura de los 3 jobs (contenido básico, los detalles se agregarán después)
```

---

## Job de pruebas (test) para pipeline CI/CD - 2025-02-10

**Prompt:**

```
Eres un experto en testing y CI/CD. Necesito que generes el job de pruebas para un pipeline de GitHub Actions.

## Contexto del Proyecto

- Runtime: Node.js 18.x (o 20.x)
- Package Manager: npm
- Framework de Testing: Jest
- Base de datos para tests: MySQL 8.0 (usar service container)
- Ubicación de tests: `/test/` o `/__tests__/`
- Comando de tests: `npm test`
- Comando de coverage: `npm run test:coverage`

## Requerimientos del Job "test"

1. **Service Container de MySQL**:
   - Imagen: mysql:8.0
   - Variables de entorno para crear DB de test
   - Health check para esperar que MySQL esté listo

2. **Steps del job**:
   a. Checkout del código
   b. Configurar Node.js con caché de npm
   c. Instalar dependencias
   d. Ejecutar linter (si existe)
   e. Ejecutar pruebas con coverage
   f. Subir reporte de coverage como artifact
   g. Comentar coverage en el PR (opcional)

3. **Variables de entorno para tests**:
NODE_ENV: test
DB_HOST: 127.0.0.1
DB_PORT: 3306
DB_USER: root
DB_PASSWORD: root
DB_NAME: test_db
JWT_SECRET: test-secret-key

4. **Condiciones de fallo**:
   - Si algún test falla
   - Si el coverage es menor al 70%

## Formato esperado
```yaml
test:
  name: 🧪 Run Tests
  runs-on: ubuntu-latest
  
  services:
    mysql:
      # configuración del service container
  
  steps:
    - name: 📥 Checkout code
      # ...
    
    - name: 📦 Setup Node.js
      # ...
    
    # ... más steps
```
```

---

## Job de build para pipeline CI/CD - 2025-02-10

**Prompt:**

```
Eres un experto en DevOps y Node.js. Necesito que generes el job de build para un pipeline de GitHub Actions.

## Contexto

- El proyecto es un backend Node.js/Express
- NO usa TypeScript (JavaScript puro) [o SÍ usa TypeScript si aplica]
- El build debe preparar la aplicación para producción
- Los artifacts deben estar listos para deploy a EC2

## Requerimientos del Job "build"

1. **Dependencia**: Solo ejecutar si el job "test" pasó exitosamente

2. **Steps del job**:
   a. Checkout del código
   b. Configurar Node.js
   c. Instalar SOLO dependencias de producción (`npm ci --production`)
   d. [Si usa TypeScript] Compilar TypeScript a JavaScript
   e. Crear archivo de versión/build info
   f. Comprimir artifacts para deploy
   g. Subir artifacts

3. **Artifacts a generar**:
deploy-package/
├── src/              # Código fuente (o dist/ si es TS)
├── node_modules/     # Dependencias de producción
├── package.json
├── package-lock.json
├── .env.example      # Template de variables
└── build-info.json   # Metadata del build

4. **Build info** debe incluir:
```json
   {
     "version": "desde package.json",
     "commit": "SHA del commit",
     "branch": "nombre de la rama",
     "buildTime": "timestamp ISO",
     "buildNumber": "número de run de GitHub"
   }
```

5. **Optimizaciones**:
   - Usar caché de npm
   - Excluir archivos innecesarios (tests, docs, etc.)
   - El artifact debe ser lo más pequeño posible

## Formato esperado
```yaml
build:
  name: 🏗️ Build Application
  runs-on: ubuntu-latest
  needs: test
  
  steps:
    - name: 📥 Checkout code
      # ...
    
    - name: 📦 Setup Node.js
      # ...
    
    - name: 📥 Install production dependencies
      # ...
    
    - name: 📝 Generate build info
      # ...
    
    - name: 📦 Create deployment package
      # ...
    
    - name: 📤 Upload artifact
      # ...
```
```

---

## Job de deploy a EC2 para pipeline CI/CD - 2025-02-10

**Prompt:**

```
Eres un experto en DevOps, AWS y despliegues automatizados. Necesito que generes el job de deploy a EC2 para un pipeline de GitHub Actions.

## Contexto del Servidor EC2

- Sistema Operativo: Amazon Linux 2023 / Ubuntu 22.04
- Usuario SSH: ec2-user (Amazon Linux) o ubuntu (Ubuntu)
- Ubicación de la app: /home/ec2-user/app (o /home/ubuntu/app)
- Process Manager: PM2
- Puerto de la aplicación: 3000
- La app está detrás de Nginx como reverse proxy

## Requerimientos del Job "deploy"

1. **Condiciones de ejecución**:
   - Solo ejecutar si el job "build" pasó
   - Solo ejecutar en Pull Requests hacia main
   - [Opcional] Solo ejecutar si el PR tiene label "ready-to-deploy"

2. **Secrets de GitHub necesarios**:
EC2_HOST: IP pública o DNS del servidor
EC2_USER: Usuario SSH (ec2-user o ubuntu)
EC2_SSH_KEY: Contenido completo de la clave .pem

3. **Steps del job**:
   a. Descargar artifact del build
   b. Configurar SSH agent con la clave privada
   c. Agregar host a known_hosts
   d. Crear backup del deployment actual en EC2
   e. Transferir archivos via SCP
   f. Ejecutar comandos de deploy via SSH (PM2, mover archivos, etc.)
   g. Health check del endpoint
   h. [Si falla] Rollback automático
   i. Notificar resultado (comentario en PR)

4. **Script de deploy en EC2**: cd app, pm2 stop all, actualizar archivos, pm2 start ecosystem.config.js, pm2 save

5. **Health check**: Esperar 30s, GET /api/health, reintentar 3 veces, rollback si falla.

6. **Rollback**: Restaurar desde backup, reiniciar PM2, notificar.

## Formato esperado
```yaml
deploy:
  name: 🚀 Deploy to EC2
  runs-on: ubuntu-latest
  needs: build
  if: github.event_name == 'pull_request' && github.base_ref == 'main'
  environment:
    name: production
    url: http://${{ secrets.EC2_HOST }}:3000
  steps:
    - name: 📥 Download build artifact
    - name: 🔑 Setup SSH
    - name: 📦 Deploy to EC2
    - name: ✅ Health Check
    - name: 🔄 Rollback on failure
      if: failure()
```
```

---

## Pipeline completo integrado (CI/CD) - 2025-02-10

**Prompt:**

```
Eres un experto senior en DevOps y CI/CD. Necesito que integres todos los componentes en un pipeline completo y funcional.

## Contexto del Proyecto
- Nombre: [nombre-del-proyecto]
- Stack: Node.js 18.x + Express.js + MySQL 8.0
- Testing: Jest con coverage mínimo 70%
- Servidor: AWS EC2 con PM2
- Rama principal: main

## Componentes a integrar
1. Configuración de triggers: push a cualquier rama (excepto main), Pull Request hacia main
2. Job: test (ya definido anteriormente)
3. Job: build (ya definido anteriormente)
4. Job: deploy (ya definido anteriormente)

## Requerimientos adicionales
1. Concurrency: cancelar runs anteriores, agrupar por rama
2. Permisos: contents: read, pull-requests: write, id-token: write
3. Variables de entorno globales: NODE_VERSION: '18.x', APP_NAME: 'mi-backend'
4. Outputs entre jobs: test → build: coverage percentage; build → deploy: artifact name, build version
5. Resumen del workflow: estado de cada job, coverage, versión desplegada, URL del servidor (job summary al final)
```

---

## Error "Error loading key ... error in libcrypto" en Deploy EC2 - 2025-02-11

**Prompt:**

```
en la etapa de subida a produccion me dio el siguiente error [imagen del pipeline con fallo en Setup SSH: Error loading key "/home/runner/.ssh/deploy_key.pem": error in libcrypto]. dame el paso a paso como solucionarlo
```

**Acciones realizadas:** Documentación en `docs/PIPELINE.md` (tabla de errores + sección "Solución: Error libcrypto con EC2_SSH_KEY") con pasos para reemplazar el secret `EC2_SSH_KEY` correctamente; ajuste en `.github/workflows/pipeline.yml` para normalizar la clave PEM al escribir (sed para quitar `\r`).
