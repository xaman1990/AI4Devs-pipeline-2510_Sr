# 🚀 Documentación del Pipeline CI/CD

Documentación técnica del pipeline de integración y despliegue continuo para el backend Node.js + Express, con tests (Jest + MySQL), build de producción y deploy a AWS EC2 con PM2.

---

## 1. Descripción general

### ¿Qué hace el pipeline?

El pipeline automatiza:

- **Tests**: Ejecuta pruebas con Jest contra MySQL 8.0 en un contenedor de servicio, genera coverage (mínimo 70%) y comenta el resumen en el PR.
- **Build**: Compila TypeScript, genera el paquete de producción (solo dependencias prod), incluye Prisma y PM2, y sube un artifact listo para deploy.
- **Deploy**: Solo en **Pull Requests hacia `main`**: transfiere el artifact a EC2 vía SSH/rsync, hace backup, despliega con PM2, health check y rollback automático si falla.
- **Summary**: Genera un resumen en la pestaña *Summary* del workflow con estado de jobs, coverage y versión.

### ¿Cuándo se ejecuta?

| Evento | Condición | Jobs que corren |
|--------|-----------|------------------|
| **Push** | A cualquier rama **excepto** `main` | test → build → summary |
| **Pull Request** | Hacia la rama `main` (opened, synchronize, reopened) | test → build → deploy (si PR a main) → summary |

- No se ejecuta en **push directo a `main`** (evita desplegar sin PR).
- Si llega un nuevo push a la misma rama, la ejecución anterior se **cancela** (concurrency).

### Diagrama de flujo

```mermaid
flowchart LR
  subgraph Triggers
    A[Push a rama] --> T
    B[PR hacia main] --> T
  end

  subgraph Pipeline
    T[🧪 test]
    T --> BLD[🏗️ build]
    BLD --> D{¿PR a main?}
    D -->|Sí| DEP[🚀 deploy]
    D -->|No| SUM
    DEP --> SUM[📋 summary]
    T --> SUM
    BLD --> SUM
  end

  subgraph test[" "]
    T1[Checkout]
    T2[MySQL 8.0]
    T3[Jest + coverage]
    T4[Upload artifact]
  end

  subgraph build[" "]
    B1[Checkout]
    B2[Prisma + tsc]
    B3[Deploy package]
    B4[Upload artifact]
  end

  subgraph deploy[" "]
    D1[Download artifact]
    D2[SSH + backup]
    D3[rsync + PM2]
    D4[Health check]
    D5[Rollback si falla]
  end
```

```mermaid
flowchart TD
  Start([Inicio]) --> Test[🧪 test]
  Test --> TestOK{¿Tests OK?}
  TestOK -->|No| Summary[📋 summary]
  TestOK -->|Sí| Build[🏗️ build]
  Build --> BuildOK{¿Build OK?}
  BuildOK -->|No| Summary
  BuildOK -->|Sí| IsPR{¿PR a main?}
  IsPR -->|No| Summary
  IsPR -->|Sí| Deploy[🚀 deploy]
  Deploy --> Health{¿Health check OK?}
  Health -->|No| Rollback[🔄 Rollback]
  Rollback --> Summary
  Health -->|Sí| Summary
  Summary --> End([Fin])
```

---

## 2. Requisitos previos

### Secrets en GitHub

Deben estar configurados en **Settings → Secrets and variables → Actions** del repositorio:

| Secret | Obligatorio para | Descripción |
|--------|-------------------|-------------|
| `EC2_INSTANCE` | Deploy | IP pública o DNS del servidor EC2 |
| `EC2_USER` | Deploy | Usuario SSH (`ec2-user` o `ubuntu`) |
| `EC2_SSH_KEY` | Deploy | Contenido completo del archivo `.pem` |

Opcionales (no se usan en el deploy por SSH, pero puedes tenerlos para otras integraciones):

| Secret | Uso |
|--------|-----|
| `AWS_ACCESS_ID` | ID de clave de acceso AWS (no usado por este pipeline) |
| `AWS_ACCESS_KEY` | Clave secreta AWS (no usado por este pipeline) |
| `HEALTH_CHECK_URL` | URL completa para el health check. Si no se define, se usa `http://EC2_INSTANCE:3000/` |

### Configuración del servidor EC2

- **SO**: Amazon Linux 2023 o Ubuntu 22.04.
- **Usuario**: `ec2-user` (Amazon Linux) o `ubuntu` (Ubuntu).
- **Software**: Node.js 18.x, PM2, Nginx (opcional, como reverse proxy).
- **Directorio de la app**: `/home/ec2-user/app` o `/home/ubuntu/app`.
- **Puerto de la aplicación**: 3000 (la app escucha aquí; Nginx puede exponer 80/443).

### Permisos del workflow

El pipeline usa los siguientes permisos (definidos en el YAML):

- `contents: read` — leer el repositorio.
- `pull-requests: write` — comentar en PRs (coverage, resultado de deploy).
- `id-token: write` — para uso con OIDC/AWS si en el futuro se usa autenticación sin acceso directo a claves.

---

## 3. Jobs del pipeline

### 🧪 Job: `test`

| Campo | Detalle |
|--------|---------|
| **Propósito** | Ejecutar tests con Jest, MySQL 8.0 y generar coverage (mín. 70%). |
| **Cuándo corre** | Siempre que se dispara el workflow (push a rama o PR). |
| **Runner** | `ubuntu-latest`. |
| **Dependencias** | Ninguna (es el primer job). |

#### Condiciones / triggers

- Se ejecuta en **cada** push a ramas distintas de `main` y en cada **pull_request** hacia `main`.

#### Steps principales

1. **Checkout** — Código del repo.
2. **Setup Node.js** — Versión definida en `env.NODE_VERSION` (18.x), con caché npm.
3. **Install dependencies** — Root y backend (`npm ci`).
4. **Run linter** — ESLint en backend (`continue-on-error: true`).
5. **Run tests with coverage** — `npm run test:coverage` en backend (Jest + MySQL).
6. **Set coverage output** — Lee `coverage/coverage-summary.json` y expone el porcentaje de líneas.
7. **Upload coverage report** — Sube la carpeta `backend/coverage/` como artifact.
8. **Comment coverage on PR** — Comenta o actualiza un comentario con la tabla de coverage en el PR.

#### Inputs y outputs

- **Inputs**: Ninguno (usa código del repo y variables de entorno del job).
- **Outputs**:
  - `coverage_percentage`: Porcentaje de cobertura de líneas (usado por el job **summary**).

#### Posibles errores y soluciones

| Error | Causa típica | Solución |
|-------|----------------|----------|
| Tests fallan en CI pero no en local | Diferencias de entorno (DB, timezone, paths) o tests no aislados | Revisar variables de test y mocks; ejecutar localmente con `DATABASE_URL` y `NODE_ENV=test`. |
| Coverage por debajo del 70% | Umbral en `jest.config.js` no alcanzado | Aumentar tests o ajustar temporalmente el umbral; revisar `coverageThreshold`. |
| MySQL no listo | Health check del service container | El workflow ya espera al health check; si falla, revisar que la imagen y el puerto 3306 sean correctos. |
| `coverage-summary.json` no encontrado | Fallo previo en Jest o ruta distinta | Asegurar que Jest genera `coverage-summary` (en `jest.config.js`: `coverageReporters: ['json-summary', ...]`). |

---

### 🏗️ Job: `build`

| Campo | Detalle |
|--------|---------|
| **Propósito** | Compilar TypeScript, generar paquete de producción y subir artifact para deploy. |
| **Cuándo corre** | Solo si el job **test** termina con éxito. |
| **Runner** | `ubuntu-latest`. |
| **Dependencias** | `needs: test`. |

#### Condiciones / triggers

- Se ejecuta **solo si** `test` ha finalizado correctamente.

#### Steps principales

1. **Checkout** — Con `fetch-depth: 0` para tener SHA completo.
2. **Setup Node.js** — Con caché npm para `backend/package-lock.json`.
3. **Install dependencies** — `npm ci` en backend.
4. **Prisma generate** — Generar cliente Prisma.
5. **Compile TypeScript** — `npm run build` (tsc).
6. **Generate build info** — Crea `build-info.json` (version, commit, branch, buildTime, buildNumber) y expone `version`.
7. **Create deployment package** — Copia `dist/`, `prisma/`, `package.json`, `package-lock.json`, `ecosystem.config.js`, `.env.example`, `build-info.json` y ejecuta `npm ci --production` en el paquete.
8. **Compress** — `tar czf deploy-package.tar.gz deploy-package`.
9. **Upload artifact** — Sube `deploy-package.tar.gz` como artifact `deploy-package`.

#### Inputs y outputs

- **Inputs**: Resultados del job `test` (no consume outputs; solo la condición de éxito).
- **Outputs**:
  - `build_version`: Versión leída de `package.json`.
  - `artifact_name`: `deploy-package`.

#### Posibles errores y soluciones

| Error | Causa típica | Solución |
|-------|----------------|----------|
| `npm run build` falla | Errores de TypeScript o dependencias | Corregir tipos y compilación en local; revisar `tsconfig.json`. |
| Prisma generate falla | Schema o binarios no compatibles | Revisar `prisma/schema.prisma` y `binaryTargets` si usas plataforma específica. |
| Artifact demasiado grande | `node_modules` con muchas dependencias | El job ya usa solo producción; revisar dependencias opcionales y tamaños. |

---

### 🚀 Job: `deploy`

| Campo | Detalle |
|--------|---------|
| **Propósito** | Desplegar el artifact en EC2: backup, rsync, PM2 y health check; rollback automático si falla. |
| **Cuándo corre** | Solo en **Pull Requests hacia `main`** y si **build** termina con éxito. |
| **Runner** | `ubuntu-latest`. |
| **Dependencias** | `needs: build`. |

#### Condiciones / triggers

- `if: github.event_name == 'pull_request' && github.base_ref == 'main'`.

#### Steps principales

1. **Download build artifact** — Descarga el artifact `deploy-package`.
2. **Extract** — Descomprime el tarball en `backend-deploy/`.
3. **Setup SSH** — Escribe la clave PEM, `known_hosts`, inicia agente SSH y añade la clave.
4. **Create backup on EC2** — Si existe `/home/<user>/app` con contenido, crea una copia con timestamp.
5. **Transfer files** — Crea `app-new` en el servidor y hace `rsync` del contenido del artifact.
6. **Deploy on EC2** — Por SSH: `pm2 stop all`, mueve `app` → `app.old`, mueve `app-new` → `app`, `pm2 start ecosystem.config.js`, `pm2 save`.
7. **Wait** — Espera 30 segundos.
8. **Health check** — Hasta 3 intentos contra `HEALTH_CHECK_URL` o `http://EC2_INSTANCE:3000/` (y opcionalmente `/api/health`).
9. **Rollback on failure** — Si el job falla, restaura desde `app.old` y reinicia PM2.
10. **Notify PR** — Comenta en el PR éxito o fallo del deploy.

#### Inputs y outputs

- **Inputs**: Artifact `deploy-package`; secrets `EC2_INSTANCE`, `EC2_USER`, `EC2_SSH_KEY`; opcional `HEALTH_CHECK_URL`.
- **Outputs**:
  - `deploy_version`: Misma versión que `build_version`.
  - `deploy_url`: `https://${{ secrets.EC2_INSTANCE }}`.

#### Posibles errores y soluciones

| Error | Causa típica | Solución |
|-------|----------------|----------|
| **Error loading key "...": error in libcrypto** | El contenido de `EC2_SSH_KEY` tiene saltos de línea incorrectos (CRLF), espacios extra o está mal copiado | Ver [Solución: Error libcrypto con EC2_SSH_KEY](#solución-error-libcrypto-con-ec2_ssh_key) más abajo. |
| SSH: Permission denied | Clave incorrecta, usuario o permisos del `.pem` | Verificar secret `EC2_SSH_KEY` (todo el contenido del .pem, incl. header/footer). Comprobar `EC2_USER` y que la clave esté asociada a la instancia. |
| Host key verification failed | Host no en `known_hosts` | El workflow ya ejecuta `ssh-keyscan`; si usas proxy o saltos, revisar conectividad. |
| rsync or SSH timeout | Firewall, security group, IP incorrecta | Abrir puerto 22 al IP del runner de GitHub (o usar self-hosted runner). Ver [GitHub IP ranges](https://api.github.com/meta). |
| Health check timeout | App no responde en 30s o URL incorrecta | Aumentar espera o reintentos; definir `HEALTH_CHECK_URL` si la app está detrás de Nginx (puerto 80/443). |
| PM2 not found | PM2 no instalado en EC2 | Instalar: `npm i -g pm2` y asegurar que esté en el PATH del usuario de deploy. |

#### Solución: Error libcrypto con EC2_SSH_KEY

Si el step **Setup SSH** falla con `Error loading key "...": error in libcrypto`, la clave privada en el secret está mal formateada (saltos de línea Windows, truncada o con caracteres extra). Sigue estos pasos:

1. **Obtener el contenido correcto del `.pem`** (en tu máquina, donde tienes el archivo):
   ```bash
   cat tu-clave.pem
   ```
   Debe verse exactamente así (ejemplo):
   ```
   -----BEGIN RSA PRIVATE KEY-----
   MIIEowIBAAKCAQEA...
   (varias líneas en base64)
   ...
   -----END RSA PRIVATE KEY-----
   ```
   - Debe empezar por `-----BEGIN` y terminar por `-----END ... KEY-----`.
   - No debe haber líneas extra al inicio o al final (salvo una sola línea en blanco al final, que no suele dar problema).

2. **Copiar sin tocar el formato**:
   - Abre el `.pem` con un editor de texto (VS Code, Notepad++, etc.).
   - Selecciona **todo** (desde `-----BEGIN` hasta `-----END ... KEY-----`).
   - Copia (Ctrl+C / Cmd+C). No copies desde una terminal que pueda añadir colores o espacios.

3. **Si usaste Windows o pegas desde un correo/docs**:
   - Convierte a saltos de línea Unix antes de pegar en GitHub:
     ```bash
     # En Git Bash / WSL / Mac/Linux
     sed 's/\r$//' tu-clave.pem | pbcopy   # Mac
     # o sed 's/\r$//' tu-clave.pem y luego copia la salida a mano
     ```

4. **Actualizar el secret en GitHub**:
   - Repositorio → **Settings** → **Secrets and variables** → **Actions**.
   - Localiza **EC2_SSH_KEY** → **Update**.
   - Pega **solo** el contenido del `.pem` (nada antes de `-----BEGIN` ni después de `-----END`).
   - Guarda.

5. **Vuelve a ejecutar el workflow** (re-run del job "Deploy to EC2" o del workflow completo).

El pipeline también normaliza la clave al escribirla (quita `\r` y ajusta saltos de línea); si tras estos pasos sigue fallando, revisa que no hayas pegado dos veces el bloque o que no falte la línea final `-----END ... KEY-----`.

---

### 📋 Job: `summary`

| Campo | Detalle |
|--------|---------|
| **Propósito** | Escribir en la pestaña *Summary* del workflow el estado de test/build, coverage y versión. |
| **Cuándo corre** | Siempre que **test** y **build** hayan terminado (éxito o fallo), independientemente de deploy. |
| **Runner** | `ubuntu-latest`. |
| **Dependencias** | `needs: [test, build]`. |

#### Condiciones / triggers

- `if: always() && (needs.test.result == 'success' || needs.test.result == 'failure') && (needs.build.result == 'success' || needs.build.result == 'failure')`.

#### Steps principales

1. **Write summary** — Genera Markdown con tabla de estados (test, build, nota de deploy), coverage, versión, artifact y mención a la URL del servidor.

#### Inputs y outputs

- **Inputs**: `needs.test.outputs.coverage_percentage`, `needs.build.outputs.build_version`, `needs.build.outputs.artifact_name`.
- **Outputs**: Ninguno (solo escribe en `GITHUB_STEP_SUMMARY`).

---

## 4. Secrets de GitHub

| Secret | Descripción | Cómo obtenerlo | Ejemplo |
|--------|-------------|----------------|---------|
| **EC2_INSTANCE** | IP pública o DNS del servidor EC2 | En AWS: EC2 → Instancias → IPv4 pública; o dominio apuntando a esa IP | `3.12.34.56` o `api.midominio.com` |
| **EC2_USER** | Usuario SSH para conectarse a la instancia | Depende del SO: Amazon Linux → `ec2-user`; Ubuntu → `ubuntu` | `ec2-user` |
| **EC2_SSH_KEY** | Contenido del archivo de clave privada `.pem` | Al crear la instancia EC2 (par de claves) o desde la consola AWS; copiar **todo** el archivo | `-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----` |
| **AWS_ACCESS_ID** | (Opcional) ID de clave de acceso AWS | IAM → Usuarios → Claves de acceso. **No se usa** en el deploy por SSH de este pipeline | — |
| **AWS_ACCESS_KEY** | (Opcional) Clave secreta AWS | Misma clave que el ID anterior. **No se usa** en el deploy por SSH | — |
| **HEALTH_CHECK_URL** | (Opcional) URL para el health check tras el deploy | URL pública de la app (raíz o endpoint tipo `/api/health`) | `https://api.midominio.com/` o `https://api.midominio.com/api/health` |

Cómo añadirlos en GitHub:

1. Repositorio → **Settings** → **Secrets and variables** → **Actions**.
2. **New repository secret**.
3. Nombre (ej. `EC2_INSTANCE`) y valor (sin espacios extra al inicio/final en el `.pem`).

---

## 5. Configuración del servidor EC2

### Requisitos del servidor

- **Sistema operativo**: Amazon Linux 2023 o Ubuntu 22.04 LTS.
- **Acceso**: SSH con clave (el mismo `.pem` que guardas en `EC2_SSH_KEY`).
- **Seguridad**: Security group con puerto 22 (SSH) permitido desde los [IP ranges de GitHub](https://api.github.com/meta) o desde tu IP; puerto 3000 (o 80/443 si usas Nginx) según tu diseño.

### Software necesario

- **Node.js 18.x** (LTS recomendado):

  ```bash
  # Amazon Linux 2023
  sudo dnf install -y nodejs

  # Ubuntu 22.04
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

- **PM2** (gestor de procesos):

  ```bash
  sudo npm install -g pm2
  ```

- **Nginx** (opcional, reverse proxy):

  ```bash
  # Amazon Linux
  sudo dnf install -y nginx

  # Ubuntu
  sudo apt-get update && sudo apt-get install -y nginx
  ```

### Estructura de directorios

En el usuario con el que se hace deploy (p. ej. `ec2-user` o `ubuntu`):

```text
/home/ec2-user/
└── app/                    # Directorio de la aplicación (creado por el pipeline)
    ├── dist/                # Código compilado
    ├── node_modules/        # Dependencias de producción
    ├── prisma/
    ├── package.json
    ├── package-lock.json
    ├── ecosystem.config.js  # Configuración PM2
    ├── .env                 # Variables de entorno (crear manualmente la primera vez)
    ├── .env.example
    └── build-info.json
```

El pipeline despliega en `app`; mantiene `app.old` como copia anterior y backups con timestamp en el mismo home si los configuras.

### Comandos de setup inicial

Ejecutar una sola vez en la instancia (ajustar usuario si usas `ubuntu`):

```bash
# 1. Instalar Node.js 18 (según tu distro, ver arriba)
node -v   # debe ser v18.x

# 2. Instalar PM2 globalmente
sudo npm install -g pm2

# 3. Crear directorio de la app (opcional; el pipeline puede crearlo)
mkdir -p /home/ec2-user/app

# 4. Crear .env desde el template (después del primer deploy tendrás .env.example)
# Editar con tus valores reales: DATABASE_URL, JWT_SECRET, etc.
nano /home/ec2-user/app/.env

# 5. (Opcional) Configurar Nginx como reverse proxy
sudo nano /etc/nginx/conf.d/app.conf
```

Ejemplo mínimo para Nginx (proxy a Node en 3000):

```nginx
server {
    listen 80;
    server_name api.midominio.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 6. Troubleshooting

### Los tests pasan en local pero fallan en CI

- **Entorno**: En CI se usa MySQL 8.0 en un service container y variables como `DATABASE_URL=mysql://root:root@127.0.0.1:3306/test_db`. Ejecutar localmente con las mismas variables y, si usas Prisma, mismo provider (MySQL/PostgreSQL) que en CI.
- **Timezone y locale**: Pueden afectar fechas y orden. Usar `TZ=UTC` en el job si es necesario.
- **Paths y permisos**: Evitar rutas absolutas o dependencias del sistema de archivos local; usar rutas relativas al proyecto.

### Deploy falla por SSH

- **Permission denied (publickey)**  
  - Comprobar que el secret `EC2_SSH_KEY` contiene **todo** el contenido del `.pem`, incluyendo las líneas `-----BEGIN ...` y `-----END ...`.  
  - Verificar que la clave está asociada a la instancia EC2 y que `EC2_USER` es el correcto para el SO.

- **Host key verification failed**  
  - El workflow ya añade el host con `ssh-keyscan`. Si falla, revisar que `EC2_INSTANCE` sea resoluble y que el puerto 22 esté abierto.

- **Connection timed out**  
  - Security group: permitir SSH (22) desde los IPs de GitHub Actions o desde tu IP.  
  - Comprobar que la instancia tiene IP pública o que el runner puede alcanzar la IP/DNS que pones en `EC2_INSTANCE`.

### Health check timeout

- La app tiene 30 segundos para arrancar y luego se hacen hasta 3 peticiones (con 10 s entre ellas). Si la app tarda más en estar lista, considerar:
  - Aumentar el `sleep` antes del health check en el workflow.
  - Asegurar que el endpoint responde (por ejemplo `GET /` o `GET /api/health`) con 200.
- Si la app está detrás de Nginx en 80/443, definir **HEALTH_CHECK_URL** (ej. `https://api.midominio.com/`) para no depender del puerto 3000.

### Rollback manual en EC2

Si necesitas volver atrás sin re-ejecutar el pipeline:

```bash
ssh -i tu-clave.pem ec2-user@<EC2_INSTANCE>

cd /home/ec2-user/app
pm2 stop all
# Restaurar desde el backup con timestamp (listar con ls -la)
rm -rf app
mv /home/ec2-user/app-backup-YYYYMMDDHHMMSS app
# O si usas el .old que deja el pipeline:
# rm -rf app && mv app.old app
cd app
pm2 start ecosystem.config.js
pm2 save
```

---

## 7. Mantenimiento

### Cómo actualizar el pipeline

- El workflow está en **`.github/workflows/pipeline.yml`**.
- Tras editar, hacer commit y push; los próximos runs usarán la nueva versión.
- Para probar sin afectar `main`, usar una rama y abrir un PR hacia `main` (así se ejecuta test, build y deploy en ese PR).

### Cómo agregar nuevos secrets

1. **Settings** → **Secrets and variables** → **Actions**.
2. **New repository secret**.
3. Nombre en MAYÚSCULAS_SNAKE_CASE (ej. `HEALTH_CHECK_URL`).
4. En el YAML, usar `${{ secrets.NOMBRE_SECRET }}`.

No subir nunca claves ni datos sensibles al repositorio; solo referenciarlos como secrets.

### Cómo modificar la configuración de EC2

- **Ruta de la app**: En el workflow, la ruta se construye con `secrets.EC2_USER` (ej. `/home/ec2-user/app`). Para otra ruta, habría que parametrizar (variable de entorno o secret) y usarla en los pasos de deploy.
- **Usuario o host**: Cambiar los secrets `EC2_USER` y `EC2_INSTANCE`; no es necesario tocar el código del pipeline si todo se expone por secrets.
- **PM2**: El archivo `backend/ecosystem.config.js` se incluye en el artifact; para cambiar nombre de app, instancias o rutas de logs, editar ese archivo en el repo y volver a desplegar.

---

## Referencia rápida

| Qué | Dónde |
|-----|--------|
| Workflow | `.github/workflows/pipeline.yml` |
| Configuración PM2 | `backend/ecosystem.config.js` |
| Variables de entorno (template) | `backend/.env.example` |
| Jest / coverage | `backend/jest.config.js`, `backend/package.json` (scripts `test`, `test:coverage`) |
| Secrets | GitHub → Settings → Secrets and variables → Actions |

Si añades un endpoint dedicado de health (p. ej. `GET /api/health`), documenta la URL y configúrala en **HEALTH_CHECK_URL** para que el pipeline la use en el paso de health check.
