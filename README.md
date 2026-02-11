# LTI - Talent Tracking System  | EN

This project is a full-stack application with a React frontend and an Express backend using Prisma as an ORM. The frontend is initiated with Create React App, and the backend is written in TypeScript.

## Directory and File Explanation

- `backend/`: Contains the server-side code written in Node.js.
  - `src/`: Contains the source code for the backend.
    - `index.ts`: The entry point for the backend server.
    - `application/`: Contains the application logic.
    - `domain/`: Contains the business logic.
    - `infrastructure/`: Contains code that communicates with the database.
    - `presentation/`: Contains code related to the presentation layer (such as controllers).
    - `routes/`: Contains the route definitions for the API.
    - `tests/`: Contains test files.
  - `prisma/`: Contains the Prisma schema file for ORM.
  - `tsconfig.json`: TypeScript configuration file.
- `frontend/`: Contains the client-side code written in React.
  - `src/`: Contains the source code for the frontend.
  - `public/`: Contains static files such as the HTML file and images.
  - `build/`: Contains the production-ready build of the frontend.
- `.env`: Contains the environment variables.
- `docker-compose.yml`: Contains the Docker Compose configuration to manage your application's services.
- `README.md`: This file contains information about the project and instructions on how to run it.

## Project Structure

The project is divided into two main directories: `frontend` and `backend`.

### Frontend

The frontend is a React application, and its main files are located in the `src` directory. The `public` directory contains static assets, and the build directory contains the production `build` of the application.

### Backend

The backend is an Express application written in TypeScript. The `src` directory contains the source code, divided into several subdirectories:

- `application`:Contains the application logic.
- `domain`: Contains the domain models.
- `infrastructure`: Contains code related to the infrastructure.
- `presentation`: Contains code related to the presentation layer.
- `routes`: Contains the application's routes.
- `tests`: Contains the application's tests.

The `prisma` directory contains the Prisma schema.

You can find more information about good practices in the [good practices guide](./backend/ManifestoBuenasPracticas.md).

The specifications for all API endpoints are in [api-spec.yaml](./backend/api-spec.yaml).

The description and diagram of the data model are in [ModeloDatos.md](./backend/ModeloDatos.md).

## First steps

To get started with this project, follow these steps:

1. Clone the repo
2. install the dependencias for frontend and backend
```sh
cd frontend
npm install

cd ../backend
npm install
```
3. Build the backend server
```
cd backend
npm run build
````
4. Run the backend server
```
cd backend
npm start
```
5. In a new terminal window, build the frontend server:
```
cd frontend
npm run build
```
6. Start the frontend server
```
cd frontend
npm start
```

The backend server will be running at http://localhost:3010, and the frontend will be available at http://localhost:3000.

## Docker y PostgreSQL

This project uses Docker to run a PostgreSQL database. Here's how to get it up and running:

Install Docker on your machine if you haven't done so already. You can download it here.
Navigate to the root directory of the project in your terminal.
Run the following command to start the Docker container:
```
docker-compose up -d
```

This will start a PostgreSQL database in a Docker container. The -d flag runs the container in detached mode, meaning it runs in the background.

To access the PostgreSQL database, you can use any PostgreSQL client with the following connection details:

- Host: localhost
- Port: 5432
- User: postgres
- Password: password
- Database: mydatabase

Please replace User, Password, and Database with the actual user, password, and database name specified in your .env file.

To stop the Docker container, run the following command:
```
docker-compose down
```

To generate the database using Prisma, follow these steps:

Make sure the `.env` file in the root directory of the backend contains the `DATABASE_URL` variable with the correct connection string to your PostgreSQL database. If it doesn't work, try replacing the full URL directly in `schema.prisma`, in the `url` variable.

Open a terminal and navigate to the backend directory where the schema.prisma and seed.ts files are located.

Run the following commands to generate the Prisma structure, apply migrations to your database, and populate it with example data:

```
npx prisma generate
npx prisma migrate dev
ts-node seed.ts
```

Once you have completed all the steps, you should be able to save new candidates, both via the web and API, view them in the database, and retrieve them via GET by ID.

```
POST http://localhost:3010/candidates
{
    "firstName": "Albert",
    "lastName": "Saelices",
    "email": "albert.saelices@gmail.com",
    "phone": "656874937",
    "address": "Calle Sant Dalmir 2, 5ºB. Barcelona",
    "educations": [
        {
            "institution": "UC3M",
            "title": "Computer Science",
            "startDate": "2006-12-31",
            "endDate": "2010-12-26"
        }
    ],
    "workExperiences": [
        {
            "company": "Coca Cola",
            "position": "SWE",
            "description": "",
            "startDate": "2011-01-13",
            "endDate": "2013-01-17"
        }
    ],
    "cv": {
        "filePath": "uploads/1715760936750-cv.pdf",
        "fileType": "application/pdf"
    }
}
```

## Setting up EC2 and GitHub Actions

To run this project on an EC2 instance and ensure GitHub Actions works correctly, follow these steps:

### EC2 Configuration

1. **Create an EC2 Instance**:
  - Log in to the AWS console and navigate to EC2.
  - Launch a new instance using an Amazon Linux 2 or Ubuntu AMI.
  -Make sure to select an appropriate instance type (e.g., `t2.micro` for testing).

2.**Configure the Security Group**:
  - Ensure that the security group associated with your instance allows traffic on the following ports:
    - **22**: For SSH (remote access).
    - **80**: For HTTP (if you are using Nginx or a web server).
    - **8080**: For the backend (port where your application runs).
  - You can add inbound rules in the security group to allow access from any IP (0.0.0.0/0) for development purposes, but consider restricting it in production.

3. **Install Dependencies on EC2**:
  - Connect to your EC2 instance via SSH:
    ```
    ssh -i your-key.pem ec2-user@your-ec2-public-ip
    ```
  - Install Node.js and npm:
    ```
    curl -sL https://rpm.nodesource.com/setup_16.x | sudo bash -
    sudo yum install -y nodejs
    ```
  - Install PM2 to manage your application:
    ```
    sudo npm install -g pm2
    ```
  - Install Nginx if you need it:
    ```
    sudo yum install -y nginx
    ```

4.**Configure Environment Variables**:
  - Create a `.env` file in the backend root directory with the following variables:
    ```
    DATABASE_URL=postgresql://user:password@localhost:5432/mydatabase
    ```
  - Make sure to replace `user`, `password`, and `mydatabase` with the correct values.

### Variables in GitHub Actions

For the GitHub Actions workflow to work correctly, you must set the following variables in your repository's secrets:

1. **AWS_ACCESS_ID**: Your AWS access key ID (see [How to get AWS_ACCESS_ID](#how-to-get-aws_access_id) below).
2. **AWS_ACCESS_KEY**: The **full content of your EC2 SSH private key (`.pem` file)**. Paste the entire file contents (including the `-----BEGIN ... KEY-----` and `-----END ... KEY-----` lines).
3. **EC2_INSTANCE**: The public IP address or DNS name of your EC2 instance.

Optional: **EC2_USER** — SSH user (e.g. `ec2-user`, `ubuntu`). If not set, the pipeline uses `ec2-user`.

**Note**: For SSH-based deployment (current pipeline), only `AWS_ACCESS_KEY` (`.pem` content) and `EC2_INSTANCE` are required. `AWS_ACCESS_ID` is listed for completeness but is not used in the current SSH deployment workflow.

#### How to get AWS_ACCESS_ID

To obtain your AWS Access Key ID (`AWS_ACCESS_ID`) and Secret Access Key:

1. **Log in to AWS Console**:
   - Go to [AWS Console](https://console.aws.amazon.com/)
   - Sign in with your AWS account credentials.

2. **Navigate to IAM**:
   - In the AWS Console, search for "IAM" in the top search bar.
   - Click on **IAM** (Identity and Access Management).

3. **Go to Users**:
   - In the left sidebar, click on **Users**.
   - Click on your username (or the user for which you want to create access keys).

4. **Create Access Key**:
   - Click on the **Security credentials** tab.
   - Scroll down to the **Access keys** section.
   - Click **Create access key**.

5. **Select Use Case**:
   - Choose a use case (e.g., "Command Line Interface (CLI)", "Application running outside AWS", etc.).
   - Check the confirmation box and click **Next**.

6. **Download or Copy Credentials**:
   - **Important**: You will see your **Access key ID** (this is your `AWS_ACCESS_ID`) and **Secret access key**.
   - Click **Download .csv file** to save them securely, or copy both values immediately.
   - **⚠️ Warning**: The secret access key is shown only once. If you lose it, you'll need to create a new access key.

7. **Add to GitHub Secrets**:
   - Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**.
   - Click **New repository secret**.
   - Name: `AWS_ACCESS_ID`, Value: Your Access Key ID (e.g., `AKIAIOSFODNN7EXAMPLE`).
   - Create another secret: Name: `AWS_ACCESS_KEY` (for the `.pem` content, see step 2 above).

**Alternative**: If you're using AWS CLI locally, you can also create access keys via command line:
```bash
aws iam create-access-key --user-name YOUR_USERNAME
```

**Security Best Practices**:
- Never commit access keys to your repository.
- Use IAM roles with minimal required permissions.
- Rotate access keys regularly.
- Delete unused access keys.
### ⚠️ IMPORTANT: Development Workflow

**Before creating a Pull Request, you should make sure that everything works correctly in your fork:**

1. **Work on your fork of the repository**
   - Fork this repository to your personal account
   - Clone your fork locally
   - Make all changes and development in your personal repository

2. **Set your own environment variables**
   - Configure GitHub Secrets on your fork for your AWS credentials
   - Make sure your CI/CD pipeline works with your own variables
   - Fully test the deployment in your personal environment

3. **Validate that everything works before the PR**
   - Run all tests locally
   - Verify that the build works correctly
   - Confirm that the deployment to your AWS works without errors
   - Check that GitHub Actions run successfully on your fork

4. **Only then, create the Pull Request**
   - Once everything is working on your fork, create the PR to the main repository
   - In the PR, include evidence that your pipeline is working (screenshots of successful GitHub Actions, links to your deployment, etc.)
   - Describe the changes you made and how you tested that they work.

### 🔒 Security Considerations

- **NEVER** include credentials or secrets in your code
- Use GitHub Secrets for all sensitive variables
- Set up your own AWS resources for testing
- Do not share credentials between students

### ✅ Checklist before Pull Request

- [ ] The application builds without errors on my fork
- [ ] All tests pass successfully
- [ ] The CI/CD pipeline runs without errors in GitHub Actions
- [ ] The application is deployed successfully on my AWS
- [ ] I have documented the changes made
- [ ] I have included evidence that everything works (screenshots, links)

**Remember**: The goal is to demonstrate that you can build and maintain a functional CI/CD pipeline. Validation on your own fork is critical before requesting instructor review.

# LTI - Sistema de Seguimiento de Talento  | ES

Este proyecto es una aplicación full-stack con un frontend en React y un backend en Express usando Prisma como un ORM. El frontend se inicia con Create React App y el backend está escrito en TypeScript.

## Explicación de Directorios y Archivos

- `backend/`: Contiene el código del lado del servidor escrito en Node.js.
  - `src/`: Contiene el código fuente para el backend.
    - `index.ts`: El punto de entrada para el servidor backend.
    - `application/`: Contiene la lógica de aplicación.
    - `domain/`: Contiene la lógica de negocio.
    - `infrastructure/`: Contiene código que se comunica con la base de datos.
    - `presentation/`: Contiene código relacionado con la capa de presentación (como controladores).
    - `routes/`: Contiene las definiciones de rutas para la API.
    - `tests/`: Contiene archivos de prueba.
  - `prisma/`: Contiene el archivo de esquema de Prisma para ORM.
  - `tsconfig.json`: Archivo de configuración de TypeScript.
- `frontend/`: Contiene el código del lado del cliente escrito en React.
  - `src/`: Contiene el código fuente para el frontend.
  - `public/`: Contiene archivos estáticos como el archivo HTML e imágenes.
  - `build/`: Contiene la construcción lista para producción del frontend.
- `.env`: Contiene las variables de entorno.
- `docker-compose.yml`: Contiene la configuración de Docker Compose para gestionar los servicios de tu aplicación.
- `README.md`: Este archivo, contiene información sobre el proyecto e instrucciones sobre cómo ejecutarlo.

## Estructura del Proyecto

El proyecto está dividido en dos directorios principales: `frontend` y `backend`.

### Frontend

El frontend es una aplicación React y sus archivos principales están ubicados en el directorio `src`. El directorio `public` contiene activos estáticos y el directorio `build` contiene la construcción de producción de la aplicación.

### Backend

El backend es una aplicación Express escrita en TypeScript. El directorio `src` contiene el código fuente, dividido en varios subdirectorios:

- `application`: Contiene la lógica de aplicación.
- `domain`: Contiene los modelos de dominio.
- `infrastructure`: Contiene código relacionado con la infraestructura.
- `presentation`: Contiene código relacionado con la capa de presentación.
- `routes`: Contiene las rutas de la aplicación.
- `tests`: Contiene las pruebas de la aplicación.

El directorio `prisma` contiene el esquema de Prisma.

Tienes más información sobre buenas prácticas utilizadas en la [guía de buenas prácticas](./backend/ManifestoBuenasPracticas.md).

Las especificaciones de todos los endpoints de API los tienes en [api-spec.yaml](./backend/api-spec.yaml).

La descripción y diagrama del modelo de datos los tienes en [ModeloDatos.md](./backend/ModeloDatos.md).


## Primeros Pasos

Para comenzar con este proyecto, sigue estos pasos:

1. Clona el repositorio.
2. Instala las dependencias para el frontend y el backend:
```sh
cd frontend
npm install

cd ../backend
npm install
```
3. Construye el servidor backend:
```
cd backend
npm run build
````
4. Inicia el servidor backend:
```
cd backend
npm start
```
5. En una nueva ventana de terminal, construye el servidor frontend:
```
cd frontend
npm run build
```
6. Inicia el servidor frontend:
```
cd frontend
npm start
```

El servidor backend estará corriendo en http://localhost:3010 y el frontend estará disponible en http://localhost:3000.

## Docker y PostgreSQL

Este proyecto usa Docker para ejecutar una base de datos PostgreSQL. Así es cómo ponerlo en marcha:

Instala Docker en tu máquina si aún no lo has hecho. Puedes descargarlo desde aquí.
Navega al directorio raíz del proyecto en tu terminal.
Ejecuta el siguiente comando para iniciar el contenedor Docker:
```
docker-compose up -d
```
Esto iniciará una base de datos PostgreSQL en un contenedor Docker. La bandera -d corre el contenedor en modo separado, lo que significa que se ejecuta en segundo plano.

Para acceder a la base de datos PostgreSQL, puedes usar cualquier cliente PostgreSQL con los siguientes detalles de conexión:
- Host: localhost
- Port: 5432
- User: postgres
- Password: password
- Database: mydatabase

Por favor, reemplaza User, Password y Database con el usuario, la contraseña y el nombre de la base de datos reales especificados en tu archivo .env.

Para detener el contenedor Docker, ejecuta el siguiente comando:
```
docker-compose down
```

Para generar la base de datos utilizando Prisma, sigue estos pasos:

1. Asegúrate de que el archivo `.env` en el directorio raíz del backend contenga la variable `DATABASE_URL` con la cadena de conexión correcta a tu base de datos PostgreSQL. Si no te funciona, prueba a reemplazar la URL completa directamente en `schema.prisma`, en la variable `url`.

2. Abre una terminal y navega al directorio del backend donde se encuentra el archivo `schema.prisma` y `seed.ts`.

3. Ejecuta los siguientes comandos para generar la estructura de prisma, las migraciones a tu base de datos y poblarla con datos de ejemplo:
```
npx prisma generate
npx prisma migrate dev
ts-node seed.ts
```

Una vez has dado todos los pasos, deberías poder guardar nuevos candidatos, tanto via web, como via API, verlos en la base de datos y obtenerlos mediante GET por id.

```
POST http://localhost:3010/candidates
{
    "firstName": "Albert",
    "lastName": "Saelices",
    "email": "albert.saelices@gmail.com",
    "phone": "656874937",
    "address": "Calle Sant Dalmir 2, 5ºB. Barcelona",
    "educations": [
        {
            "institution": "UC3M",
            "title": "Computer Science",
            "startDate": "2006-12-31",
            "endDate": "2010-12-26"
        }
    ],
    "workExperiences": [
        {
            "company": "Coca Cola",
            "position": "SWE",
            "description": "",
            "startDate": "2011-01-13",
            "endDate": "2013-01-17"
        }
    ],
    "cv": {
        "filePath": "uploads/1715760936750-cv.pdf",
        "fileType": "application/pdf"
    }
}
```


## Configuración de EC2 y GitHub Actions

Para ejecutar este proyecto en una instancia EC2 y asegurarte de que GitHub Actions funcione correctamente, sigue estos pasos:

### Configuración de EC2

1. **Crear una Instancia EC2**:
  - Inicia sesión en la consola de AWS y navega a EC2.
  - Lanza una nueva instancia utilizando una AMI de Amazon Linux 2 o Ubuntu.
  - Asegúrate de seleccionar un tipo de instancia adecuado (por ejemplo, `t2.micro` para pruebas).

2. **Configurar el Grupo de Seguridad**:
  - Asegúrate de que el grupo de seguridad asociado a tu instancia permita el tráfico en los siguientes puertos:
    - **22**: Para SSH (acceso remoto).
    - **80**: Para HTTP (si estás usando Nginx o un servidor web).
    - **8080**: Para el backend (puerto donde se ejecuta tu aplicación).
  - Puedes agregar reglas de entrada en el grupo de seguridad para permitir el acceso desde cualquier IP (0.0.0.0/0) para propósitos de desarrollo, pero considera restringirlo en producción.

3. **Instalar Dependencias en EC2**:
  - Conéctate a tu instancia EC2 a través de SSH:
    ```
    ssh -i your-key.pem ec2-user@your-ec2-public-ip
    ```
  - Instala Node.js y npm:
    ```
    curl -sL https://rpm.nodesource.com/setup_16.x | sudo bash -
    sudo yum install -y nodejs
    ```
  - Instala PM2 para gestionar tu aplicación:
    ```
    sudo npm install -g pm2
    ```
  - Instala Nginx si lo necesitas:
    ```
    sudo yum install -y nginx
    ```

4. **Configurar Variables de Entorno**:
  - Crea un archivo `.env` en el directorio raíz del backend con las siguientes variables:
    ```
    DATABASE_URL=postgresql://user:password@localhost:5432/mydatabase
    ```
  - Asegúrate de reemplazar `user`, `password` y `mydatabase` con los valores correctos.

### Variables en GitHub Actions

Para que el flujo de trabajo de GitHub Actions funcione correctamente, debes configurar las siguientes variables en los secretos de tu repositorio:

1. **AWS_ACCESS_ID**: Tu ID de clave de acceso de AWS (ver [Cómo obtener AWS_ACCESS_ID](#cómo-obtener-aws_access_id) más abajo).
2. **AWS_ACCESS_KEY**: **Contenido completo de tu clave privada SSH de EC2 (archivo `.pem`)**. Pega todo el contenido del archivo (incluidas las líneas `-----BEGIN ... KEY-----` y `-----END ... KEY-----`).
3. **EC2_INSTANCE**: La dirección IP pública o el nombre DNS de tu instancia EC2.

Opcional: **EC2_USER** — Usuario SSH (p. ej. `ec2-user`, `ubuntu`). Si no se define, el pipeline usa `ec2-user`.

**Nota**: Para el despliegue por SSH (pipeline actual), solo se necesitan `AWS_ACCESS_KEY` (contenido del `.pem`) y `EC2_INSTANCE`. `AWS_ACCESS_ID` se lista por completitud pero no se usa en el workflow de despliegue por SSH actual.

#### Cómo obtener AWS_ACCESS_ID

Para obtener tu AWS Access Key ID (`AWS_ACCESS_ID`) y Secret Access Key:

1. **Inicia sesión en AWS Console**:
   - Ve a [AWS Console](https://console.aws.amazon.com/)
   - Inicia sesión con tus credenciales de AWS.

2. **Navega a IAM**:
   - En la consola de AWS, busca "IAM" en la barra de búsqueda superior.
   - Haz clic en **IAM** (Identity and Access Management).

3. **Ve a Usuarios**:
   - En el menú lateral izquierdo, haz clic en **Users** (Usuarios).
   - Haz clic en tu nombre de usuario (o el usuario para el cual quieres crear claves de acceso).

4. **Crear Access Key**:
   - Haz clic en la pestaña **Security credentials** (Credenciales de seguridad).
   - Desplázate hasta la sección **Access keys** (Claves de acceso).
   - Haz clic en **Create access key** (Crear clave de acceso).

5. **Seleccionar Caso de Uso**:
   - Elige un caso de uso (p. ej., "Command Line Interface (CLI)", "Application running outside AWS", etc.).
   - Marca la casilla de confirmación y haz clic en **Next** (Siguiente).

6. **Descargar o Copiar Credenciales**:
   - **Importante**: Verás tu **Access key ID** (este es tu `AWS_ACCESS_ID`) y **Secret access key**.
   - Haz clic en **Download .csv file** (Descargar archivo .csv) para guardarlos de forma segura, o copia ambos valores inmediatamente.
   - **⚠️ Advertencia**: La clave secreta de acceso solo se muestra una vez. Si la pierdes, tendrás que crear una nueva clave de acceso.

7. **Añadir a GitHub Secrets**:
   - Ve a tu repositorio de GitHub → **Settings** (Configuración) → **Secrets and variables** (Secretos y variables) → **Actions**.
   - Haz clic en **New repository secret** (Nuevo secreto del repositorio).
   - Nombre: `AWS_ACCESS_ID`, Valor: Tu Access Key ID (p. ej., `AKIAIOSFODNN7EXAMPLE`).
   - Crea otro secreto: Nombre: `AWS_ACCESS_KEY` (para el contenido del `.pem`, ver paso 2 arriba).

**Alternativa**: Si estás usando AWS CLI localmente, también puedes crear claves de acceso mediante la línea de comandos:
```bash
aws iam create-access-key --user-name TU_NOMBRE_USUARIO
```

**Mejores Prácticas de Seguridad**:
- Nunca subas las claves de acceso a tu repositorio.
- Usa roles de IAM con permisos mínimos necesarios.
- Rota las claves de acceso regularmente.
- Elimina las claves de acceso no utilizadas.
### ⚠️ IMPORTANTE: Flujo de Trabajo para el Desarrollo

**Antes de crear un Pull Request, debes asegurarte de que todo funcione correctamente en tu fork:**

1. **Trabaja en tu fork del repositorio**
   - Haz fork de este repositorio a tu cuenta personal
   - Clona tu fork localmente
   - Realiza todos los cambios y desarrollo en tu repositorio personal

2. **Configura tus propias variables de entorno**
   - Configura los GitHub Secrets en tu fork para tus credenciales de AWS
   - Asegúrate de que tu pipeline de CI/CD funcione con tus propias variables
   - Prueba completamente el despliegue en tu entorno personal

3. **Valida que todo funciona antes del PR**
   - Ejecuta todos los tests localmente
   - Verifica que el build funcione correctamente
   - Confirma que el despliegue a tu AWS funcione sin errores
   - Revisa que los GitHub Actions se ejecuten exitosamente en tu fork

4. **Solo entonces, crea el Pull Request**
   - Una vez que todo esté funcionando en tu fork, crea el PR al repositorio principal
   - En el PR, incluye evidencia de que tu pipeline funciona (screenshots de GitHub Actions exitosos, enlaces a tu despliegue, etc.)
   - Describe los cambios realizados y cómo probaste que funcionan

### 🔒 Consideraciones de Seguridad

- **NUNCA** incluyas credenciales o secrets en el código
- Usa GitHub Secrets para todas las variables sensibles
- Configura tus propios recursos de AWS para las pruebas
- No compartas credenciales entre estudiantes

### ✅ Checklist antes del Pull Request

- [ ] La aplicación se construye sin errores en mi fork
- [ ] Todos los tests pasan exitosamente
- [ ] El pipeline de CI/CD se ejecuta sin fallos en GitHub Actions
- [ ] La aplicación se despliega correctamente en mi AWS
- [ ] He documentado los cambios realizados
- [ ] He incluido evidencia de que todo funciona (capturas, enlaces)

**Recuerda**: El objetivo es demostrar que puedes crear y mantener un pipeline de CI/CD funcional. La validación en tu propio fork es fundamental antes de solicitar la revisión del instructor.
