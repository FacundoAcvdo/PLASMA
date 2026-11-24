<p align="center">
  <img src="web/public/logo.png" alt="PLASMA Logo" width="110" />
</p>

<h1 align="center">PLASMA</h1>
<h3 align="center">Plataforma de Lenguaje y Análisis de Salud Mental Automatizado — Trabajo Final de la carrera (UNSL)</h3>

# Descripción del proyecto

PLASMA permite cargar corpus textuales (CSV, Excel, TXT o ZIP) y ejecutar distintos análisis de Procesamiento del Lenguaje Natural (PLN) y Machine Learning, explorando los resultados de forma interactiva desde web o móvil: estadísticas exploratorias (EDA), limpieza, embeddings, nube de palabras, emociones, modelado de tópicos, evolución temporal, clasificación de menciones de suicidio, estimación de nivel de riesgo, chatbots con RAG e informes PDF.

## Estructura del repositorio

```text
PLASMA/
├── compose.yaml Orquestación completa con Docker Compose (web + backend + ChromaDB + Ollama)
├── backend/     Microservicios en Python / FastAPI y esquemas de Supabase
├── web/         Aplicación web en Next.js 16 + React 19 + Tailwind CSS 4
└── mobile/      Aplicación móvil en Expo (SDK 58) + React Native + NativeWind
```

## Arquitectura general

```text
┌──────────────────┐
│  web/ (Next.js)  │ ──┐
└──────────────────┘   │   HTTP (:7500)   ┌──────────────┐   JWT + proxy   ┌────────────────────────┐
                       ├────────────────> │ api-gateway  │ ──────────────> │ Microservicios Python  │
┌──────────────────┐   │                  │  (FastAPI)   │                 │ analysis-service       │
│ mobile/ (Expo)   │ ──┘                  └──────┬───────┘                 │ dataset-service        │
└──────────────────┘                             │                         │ cleaning-service       │
                                          ┌──────▼───────┐                 │ evolution-service      │
                                          │ auth-service │                 │ classification-service │
                                          │    :5050     │                 │ rag-service            │
                                          └──────────────┘                 │ report-service         │
                                                                           └───┬────────┬─────────┬─┘
                                                                               │        │         │
                                                                      ┌────────▼──┐  ┌──▼──────┐ ┌▼───────┐
                                                                      │ Supabase  │  │ChromaDB │ │ Ollama │
                                                                      │Auth/DB/   │  │ :8000   │ │(qwen3) │
                                                                      │Storage    │  └─────────┘ └────────┘
                                                                      └───────────┘
```

- Todas las peticiones de `web/` y `mobile/` pasan por `api-gateway` (puerto `7500`), que valida el JWT de Supabase y deriva el tráfico al microservicio correspondiente.
- **Supabase** se usa para autenticación, almacenamiento de datasets, estado de jobs y resultados agregados.
- **ChromaDB** almacena los embeddings de los documentos y los chunks de chat.
- Los servicios de ML cargan modelos de Hugging Face y comparten una imagen base con PyTorch (`ml-base`).
- `analysis-service` agrupa clustering, topic modeling, wordcloud, EDA, emociones y riesgo en un único runtime; el gateway conserva los prefijos públicos originales.

## Características

- Inicio de sesión contra Supabase Auth a través del gateway (cookie `httpOnly` en `web/` y `Authorization: Bearer` con `expo-secure-store` en `mobile/`).
- Carga de datasets en CSV y Excel, con importación de TXT/ZIP que se convierten automáticamente a CSV, y mapeo de columnas.
- Análisis estadístico (EDA) y limpieza configurable del corpus.
- Visualización de embeddings (UMAP + clustering).
- Nube de palabras interactiva y evolución temporal de términos.
- Detección de emociones y evolución de sentimientos en el tiempo.
- Modelado de tópicos (BERTopic) con títulos generados por LLM.
- Construcción de clasificadores de menciones de suicidio y estimación de nivel de riesgo.
- Chatbots con RAG (general y sobre el dataset), historial de conversaciones y selector de **modo privacidad** (Qwen3 local vía Ollama).
- Generación y descarga de informes PDF.
- Administración de usuarios y del almacenamiento.

---

## Stack tecnológico

### Backend (`backend/`)
- **Python 3.11 / 3.12**, FastAPI + Uvicorn.
- **Supabase** (Postgres, Auth, Storage) mediante `supabase-py`.
- **ChromaDB** como base vectorial.
- **PyTorch, Transformers, sentence-transformers** para embeddings y modelos de clasificación.
- **scikit-learn, UMAP, HDBSCAN, BERTopic** para clustering y tópicos.
- **Google Gemini / Groq / Ollama (Qwen3)** para el servicio RAG y títulos de tópicos.
- **pandas, numpy, matplotlib, reportlab** para análisis, gráficos y PDF.
- **Docker Compose** para orquestación; imágenes con soporte CUDA para los servicios de ML.

### Web (`web/`)
- **Framework:** Next.js 16 (App Router, RSC), React 19, TypeScript 5.7.
- **UI:** Tailwind CSS 4, shadcn/ui + Base UI, `lucide-react`, Sonner.
- **Estado / datos:** TanStack Query, Context API.
- **Gráficos y archivos:** Recharts, PapaParse, SheetJS (`xlsx`), JSZip, `react-markdown` + `remark-gfm`.

### Mobile (`mobile/`)
- **Framework:** Expo SDK 58 (Expo Router), React Native 0.88, React 19.3, TypeScript 6.
- **UI:** NativeWind (`tailwindcss`), `lucide-react-native`, `@react-navigation/drawer`, `react-native-reanimated`, `react-native-svg`.
- **Estado / almacenamiento / archivos:** TanStack Query, `expo-secure-store`, `expo-document-picker`, `expo-file-system`, `expo-sharing`, PapaParse, SheetJS (`xlsx`), JSZip, `react-native-marked`.

---

## Requisitos previos

- **Docker Engine** y **Docker Compose v2**.
- **Proyecto de Supabase** con el esquema aplicado (ver [Base de datos](#base-de-datos)).
- **Opcional (GPU):** GPU NVIDIA + [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) para los servicios marcados con GPU. Sin GPU funcionan en CPU (más lentos).
- **Node.js 20 o superior** (la imagen Docker de `web/` usa Node 24) y `npm`.
- Para desarrollo local del backend sin Docker: Python 3.12 y acceso a Supabase/Chroma.

---

## Backend (`backend/`)

### Microservicios

| Servicio | Puerto | Prefijo en el gateway | Responsabilidad | GPU |
| --- | --- | --- | --- | --- |
| `api-gateway` | 7500 | — | Autenticación, proxy y logging de requests | No |
| `auth-service` | 5050 | `/auth` | Login, logout, sesión y administración de usuarios | No |
| `dataset-service` | 8082 | `/dataset` | Carga, parseo, chunking e indexación de datasets | Sí |
| `cleaning-service` | 8089 | `/datacleaning` | Limpieza del texto | No |
| `analysis-service` | 8080 | `/eda`, `/clustering`, `/wordcloud`, `/emotions`, `/topicmodeling`, `/suicide` | Runtime agrupado de análisis | Sí |
| `evolution-service` | 8090 | `/evolution` | Evolución temporal de palabras y emociones | No |
| `classification-service` | 8087 | `/classification` | Entrenamiento de clasificadores de menciones | Sí |
| `rag-service` | 8088 | `/rag` | Chat RAG con LLM e historial | Sí |
| `report-service` | 8092 | `/report` | Generación de informes y gráficos | No |
| `chroma-service` | 8000 | — | Vector store (imagen oficial `chromadb/chroma`) | No |
| `ollama` | 11434 | — | Inferencia local para modo privacidad (`qwen3:8b`) | Sí (opcional) |

### Configuración de variables de entorno

Cada microservicio tiene su propio `.env`. Los archivos de ejemplo están versionados como `.env.example`; los `.env` reales **no** se deben commitear.

#### 1. Crear los `.env`

Desde `backend/`:

**Bash**
```bash
cd backend
for f in */.env.example; do cp -n "$f" "${f%.example}"; done
```

**PowerShell**
```powershell
cd backend
Get-ChildItem -Recurse -Filter .env.example | ForEach-Object {
  $target = Join-Path $_.DirectoryName ".env"
  if (-not (Test-Path $target)) { Copy-Item $_.FullName $target }
}
```

Luego completá en cada archivo las credenciales de Supabase, los tokens de Hugging Face y las claves de los proveedores de LLM.

#### 2. Variables compartidas

La siguiente tabla indica **en qué servicios el código realmente lee cada variable**.

| Variable | Servicios que la usan | Descripción |
| --- | --- | --- |
| `SUPABASE_URL` | Todos los servicios Python (`api-gateway`, `auth`, `dataset`, `cleaning`, `analysis-service`, `evolution`, `classification`, `rag`, `report`) | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Todos menos `api-gateway` | Clave pública (`anon` / publishable) |
| `SUPABASE_SECRET_KEY` | `dataset`, `cleaning`, `analysis-service` | Clave de servicio (service role) |
| `SUPABASE_SERVICE_ROLE_KEY` | `auth` | Clave de servicio para administrar usuarios |
| `SUPABASE_DATASETS_TABLE` | `dataset`, `cleaning`, `analysis-service` | Tabla de datasets (por defecto `datasets`) |
| `CHROMA_HOST` / `CHROMA_PORT` | `dataset`, `cleaning`, `analysis-service`, `rag` | Host y puerto de Chroma. En Docker: `chroma-service` / `8000`. `classification` y `evolution` los tienen hardcodeados |
| `CHROMA_COLLECTION` | `classification`, `cleaning`, `analysis-service`, `rag` | Colección de documentos (`documents`) |
| `CHROMA_COLLECTION_NAME` | `dataset`, `analysis-service` | Nombre de la colección de documentos (equivalente a `CHROMA_COLLECTION`) |
| `CHROMA_CHUNKED_COLLECTION` | `analysis-service` | Colección de chunks de chat (`chunked_chats`) |
| `CHROMA_CHUNKED_COLLECTION_NAME` | `dataset` | Colección de chunks de chat (`chunked_chats`) |
| `CHROMA_COLLECTION_DOCUMENTS` / `CHROMA_COLLECTION_CHUNKED` | `rag` | Colecciones auxiliares usadas por el chatbot del dataset |
| `CHROMA_PAGE_SIZE` | `cleaning`, `analysis-service` | Tamaño de página al leer Chroma (`2000`) |
| `CHROMA_TOKEN` | `dataset`, `analysis-service` | Token opcional de Chroma. `analysis-service` lo declara para topic modeling aunque el cliente actual no lo envía |
| `CHROMA_FALLBACK_LOCAL` | `rag` | Si es `true`, usa Chroma persistente local cuando no hay servidor |
| `HF_TOKEN` | `dataset`, `analysis-service`, `evolution`, `classification`, `rag` | Token de Hugging Face para descargar modelos. `evolution` también acepta `HUGGING_FACE_HUB_TOKEN` |
| `TOKENIZERS_PARALLELISM` | `classification` | Desactiva el paralelismo de tokenizers (`false`) |
| `CORS_ORIGINS` | `dataset` | Orígenes permitidos, separados por coma. Es obligatoria en ese servicio |
| `LOG_LEVEL` | Todos | Nivel de logging (`INFO` por defecto) |

> Las claves de servicio otorgan privilegios elevados. Usalas solo en los servicios que las necesitan y nunca las expongas en `web/` ni en `mobile/`.

#### 3. Caché de modelos y VRAM

`model_cache.py` está copiado en ocho servicios, pero **no todos instancian `ModelSlot`**. Según el código, estas son las variables que tienen efecto real:

| Variable | Servicios donde tiene efecto | Default | Qué controla |
| --- | --- | --- | --- |
| `WARMUP` | `analysis-service`, `evolution`, `rag` | `true` | Precarga de modelos al iniciar. Con `false` la carga queda lazy |
| `MODEL_TTL_SECONDS` | `dataset`, `analysis-service`, `evolution`, `rag` | `600` | Segundos de inactividad antes de descargar un `ModelSlot` |
| `MODEL_VRAM_MARGIN_MB` | `dataset`, `analysis-service`, `evolution`, `rag` | `512` | VRAM adicional que se exige libre antes de cargar un modelo |
| `MODEL_EVICT_POLL_SECONDS` | `dataset`, `analysis-service`, `evolution`, `rag` | `0` (automático) | Cada cuántos segundos el hilo de evicción revisa si puede liberar el modelo |

Detalles que no son obvios:

- Los módulos `clustering` y `topicmodeling` solo llaman a `check_fits_or_raise()`, por lo que únicamente les afecta `MODEL_VRAM_MARGIN_MB`; no instancian `ModelSlot` y por eso `WARMUP`, `MODEL_TTL_SECONDS` y `MODEL_EVICT_POLL_SECONDS` no hacen nada en ellos.
- `classification` tiene una copia de `model_cache.py` pero no la importa. Su `MODEL_TTL_HOURS` es distinto: controla cuántas horas se conservan los ZIP de modelos entrenados en disco.
- `dataset` usa `ModelSlot` para el modelo de embeddings, pero no llama a `warmup_enabled()`: su `WARMUP` no tiene efecto.
- `risk` usa `ModelSlot` solo para el verificador RoBERTa; su `WARMUP` tampoco se lee.

#### 4. Variables por servicio

Se listan solo las variables propias; las compartidas de las tablas anteriores también aplican.

| Servicio | Variables propias |
| --- | --- |
| `api-gateway` | `CLUSTERING_SERVICE_URL`, `DATASET_SERVICE_URL`, `TOPIC_MODELING_SERVICE_URL`, `WORDCLOUD_SERVICE_URL`, `EDA_SERVICE_URL`, `EMOTIONS_SERVICE_URL`, `CLASSIFICATION_SERVICE_URL`, `RAG_SERVICE_URL`, `DATA_CLEANING_SERVICE_URL`, `EVOLUTION_SERVICE_URL`, `SUICIDE_SERVICE_URL`, `REPORT_SERVICE_URL`, `AUTH_SERVICE_URL` |
| `auth-service` | `SUPABASE_SERVICE_ROLE_KEY` |
| `dataset-service` | `APP_NAME`, `APP_VERSION`, `MAX_UPLOAD_SIZE_MB=50`, `INTERNAL_SERVICE_TOKEN`, `EMBEDDING_PROVIDER=local`, `EMBEDDING_MODEL`, `EMBEDDING_BATCH_SIZE=64`, `EMBEDDING_DEVICE=auto`, `EMBEDDING_FP16=true`, `EMBEDDING_VRAM_MB=1500`, `INGEST_CHUNK_SIZE=2000`, `CHAT_CHUNK_SIZE=20`, `CHAT_CHUNK_OVERLAP=4`, `CORS_ORIGINS`, `CHROMA_CHUNKED_COLLECTION_NAME`, `MODEL_TTL_SECONDS`, `MODEL_VRAM_MARGIN_MB`, `MODEL_EVICT_POLL_SECONDS` |
| `cleaning-service` | `CLEANING_DOWNLOAD_PATH=./data/temp_downloads` |
| `analysis-service` | `WARMUP`, `MODEL_TTL_SECONDS`, `MODEL_VRAM_MARGIN_MB`, `MODEL_EVICT_POLL_SECONDS`, `VERIFY_MODEL_ID`, `VERIFY_VRAM_MB`, `GOOGLE_API_KEY`, `LLM_MODEL`, `TITLE_*`, `CHROMA_*` |
| `evolution-service` | `WARMUP`, `MODEL_TTL_SECONDS`, `MODEL_VRAM_MARGIN_MB`, `MODEL_EVICT_POLL_SECONDS`, `HUGGING_FACE_HUB_TOKEN`. Chroma está hardcodeado a `chroma-service:8000` / `documents` |
| `classification-service` | `CHROMA_COLLECTION=documents`, `EMBEDDING_MODEL_NAME`, `MAX_CLASES=7`, `MODEL_STORAGE_PATH=/app/data/modelos`, `MODEL_TTL_HOURS=24`, `CLASSIFICATION_FORCE_DEVICE` (vacío = auto), `TOKENIZERS_PARALLELISM=false` |
| `rag-service` | `CHROMA_COLLECTION=rag_docs`, `CHROMA_COLLECTION_DOCUMENTS`, `CHROMA_COLLECTION_CHUNKED`, `CHROMA_FALLBACK_LOCAL=false`, `EMBEDDING_MODEL=intfloat/multilingual-e5-large`, `EMBEDDING_BATCH_SIZE=32`, `RAG_EMB_VRAM_MB=800`, `DOCS_PATH=/app/data/rag_docs`, `CHUNK_SIZE=2000`, `CHUNK_OVERLAP=200`, `RAG_INIT_ON_STARTUP=false`, `TOP_K=4`, `RETRIEVE_K=12`, `RERANK=true`, `RERANK_MODEL`, `RERANK_MIN_SCORE=-2.0`, `HISTORY_TAIL=4`, `HISTORY_MSG_CHARS=600`, `HISTORY_MAX_CHARS=2000`, `LLM_PROVIDER`, `GOOGLE_API_KEY`, `LLM_MODEL`, `GROQ_API_KEY`, `GROQ_MODEL`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL=qwen3:8b`, `OLLAMA_KEEP_ALIVE=5m`, `OLLAMA_NUM_CTX=4096`, `WARMUP`, `MODEL_TTL_SECONDS`, `MODEL_VRAM_MARGIN_MB`, `MODEL_EVICT_POLL_SECONDS` |
| `report-service` | Sin variables propias; usa Supabase |

El detalle completo de cada variable está documentado en el `.env.example` de cada carpeta; las variables de los análisis agrupados están en `backend/analysis-service/.env.example`.

### Ejecución con Docker (stack completo)

El `compose.yaml` de la raíz levanta el frontend web (`frontend` en el puerto `6001`), todos los microservicios del backend (`api-gateway` en el puerto `7500`), ChromaDB, Ollama y la red `microservicios`. La app `mobile/` se ejecuta aparte con Expo.

1. **Construir la imagen base de ML** (los servicios `dataset-service`, `classification-service`, `rag-service` y `analysis-service` usan `FROM proyecto/ml-base`):

```bash
docker build -f backend/ml-base/Dockerfile -t proyecto/ml-base backend/ml-base
```

2. **Levantar el sistema** (desde la raíz del repositorio):

```bash
docker compose up -d --build
```

Servicios expuestos al host:
- Frontend Web: <http://localhost:6001>
- API Gateway: <http://localhost:7500>
- Chroma y Ollama: solo internos en la red `microservicios` (`chroma-service:8000`, `ollama:11434`).

3. **Operación**:

```bash
docker compose ps
docker compose logs -f api-gateway
docker compose logs -f frontend
docker compose down
```

### Volúmenes

Rutas relativas a la raíz del repositorio:

| Ruta local | Uso |
| --- | --- |
| `data/chroma-data` | Persistencia de ChromaDB |
| `data/hf_cache` | Caché de modelos de Hugging Face (compartida por los servicios de ML) |
| `data/modelos` | Clasificadores entrenados por `classification-service` |
| `data/rag_docs` | Documentos fuente del RAG (solo lectura) |
| `data/ollama` | Modelos y estado persistente de Ollama |
| `data/temp_downloads` | Archivos temporales de limpieza |

Compose crea las carpetas si no existen y `data/` está ignorado por Git. Antes de usar el RAG, colocá los documentos a indexar en `data/rag_docs`.

### Desarrollo local de un servicio

```bash
cd backend/dataset-service
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8082
```

Cada servicio carga su `.env` desde su propio directorio (`pydantic-settings` o `os.environ`). Para desarrollo local, apuntá `CHROMA_HOST=localhost`, `CHROMA_PORT=8000` y publicá el puerto de Chroma o levantalo aparte.

### API Gateway y autenticación

- `POST /auth/login` es el único endpoint público: delega en `auth-service` y propaga la cookie `access_token` (y el token en el cuerpo para clientes móviles).
- El resto de rutas requiere un JWT válido, enviado como cookie `access_token` o como `Authorization: Bearer <token>`.
- La firma se valida contra el JWKS de Supabase (`{SUPABASE_URL}/auth/v1/.well-known/jwks.json`).
- El gateway agrega `X-User-Token`, `X-User-ID` y `X-Request-ID` antes de reenviar la petición.
- Las rutas `/auth/admin/*` verifican además que el usuario tenga `app_metadata.role = "admin"`.
- Los servicios no reciben tráfico directo en producción: solo el gateway publica el puerto 7500.

#### Formato de rutas

```text
/{servicio}/{operación}       -> {SERVICE_URL}/{operación}
/{servicio}/jobs              -> listado de jobs del usuario
/{servicio}/jobs/{job_id}     -> estado de un job
/{servicio}/descargar/{id}    -> descarga de resultados
```

El gateway centraliza el mapa explícito de servicios en `backend/api-gateway/config.py`. Las URLs pueden incluir una barra final, que se normaliza al unirlas con las rutas. Cada URL se valida al resolver el servicio; si falta o no usa `http`/`https` con un host válido, la petición se rechaza con un error de configuración.

#### Endpoints por servicio

| Servicio | Endpoints |
| --- | --- |
| `auth` | `POST /login`, `GET /me`, `POST /logout`, CRUD `/admin/users` |
| `dataset` | `POST /uploadDataset`, `GET /getDatasets`, `DELETE /deleteDataset`, `DELETE /deleteDatasetsByUser`, `GET /jobs` |
| `datacleaning` | `POST /cleanDataset`, `POST /download`, `GET /jobs` |
| `eda` | `POST /eda`, `POST /getResults`, `GET /jobs` |
| `clustering` | `POST /visualizeEmbeddings`, `POST /getEmbeddingsImage`, `GET /jobs` |
| `wordcloud` | `POST /visualizeWordCloud`, `POST /getWordCloudImage`, `GET /jobs` |
| `emotions` | `POST /analyzeEmotions`, `POST /getResults`, `GET /jobs` |
| `evolution` | `POST /users`, `POST /word-evolution`, `POST /emotions-evolution`, `GET /jobs` |
| `topicmodeling` | `POST /getTopics`, `POST /getTopicResults`, `GET /jobs` |
| `classification` | `POST /detectar_menciones`, `GET /descargar_modelo`, `GET /jobs` |
| `suicide` | `POST /analyzeRisk`, `POST /getResults`, `GET /jobs` |
| `rag` | `POST /chat`, `POST /message`, `PATCH /chat/mode`, `GET /chat`, `GET /chats`, `DELETE /chat`, `DELETE /chats`, `POST /activate_chat` |
| `report` | `POST /datos-graficos`, `GET /disponibles`, `POST /generar`, `GET /descargar/{job_id}`, `GET /jobs` |

### Jobs asíncronos

Los análisis pesados no bloquean la request. El runtime agrupado usa helpers compartidos para persistir jobs y configurar logging:

1. El servicio crea un registro en la tabla `jobs` de Supabase (`status = queued`).
2. Responde `202 Accepted` con `{ "job_id": "...", "status": "queued" }`.
3. El trabajo corre en `BackgroundTasks` y actualiza el estado a `running`, `succeeded` o `failed`.
4. El cliente (`web/` o `mobile/`) consulta `GET /<servicio>/jobs/<job_id>` hasta obtener un estado final.

Los jobs sin actualización durante **30 minutos** se consideran obsoletos. Cada fila guarda `user_id`, `service`, `job_type`, `dataset_name`, `params`, `result`, `error_code` y `error_detail`.

### Modo privacidad del RAG

Cada chat guarda `privacy_mode` por usuario. En modo estándar se mantiene el proveedor configurado (`LLM_PROVIDER=groq` o `google`). En modo privacidad, la recuperación sigue usando los embeddings `intfloat/multilingual-e5-large` y Ollama genera la respuesta y el título con `qwen3:8b`; el texto no se envía a Groq ni Gemini. `OLLAMA_KEEP_ALIVE=5m` hace que Ollama descargue el modelo de VRAM tras cinco minutos sin solicitudes. Después de levantar Compose, descargar el modelo una vez con:

```bash
docker compose exec ollama ollama pull qwen3:8b
```

Aplicá `backend/_schemas/migrations/20261024_add_chat_privacy_mode.sql` en Supabase antes de usar el selector.

### Base de datos

#### Esquema base

`backend/_schemas/schema_public.sql` es un dump **solo de esquema** del proyecto Supabase remoto. Contiene las 12 tablas de `public`, funciones de trigger, índices, RLS, políticas y grants. No contiene filas, usuarios de Auth ni objetos de Storage.

Para un proyecto nuevo, usalo como baseline:

```powershell
$env:SUPABASE_DB_URL = "postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
psql $env:SUPABASE_DB_URL -f backend/_schemas/schema_public.sql
```

También podés pegar el contenido en el SQL Editor de Supabase.

> El dump está pensado para Supabase: usa `auth.uid()`, los roles `anon`, `authenticated` y `service_role`, y dueños como `postgres`. No lo apliques tal cual sobre un PostgreSQL sin el esquema `auth` de Supabase ni dos veces sobre el mismo proyecto (las políticas y `ALTER TABLE` no son idempotentes).

#### Regenerar el dump

Con Docker corriendo y el proyecto vinculado (requiere Supabase CLI):

```powershell
supabase login
supabase link --project-ref <project-ref>
supabase db dump --linked --schema public --keep-comments -f backend/_schemas/schema_public.sql
```

#### Almacenamiento

- **Supabase Postgres:** usuarios, datasets, jobs y resultados agregados.
- **Supabase Storage:** archivos originales de datasets e informes.
- **ChromaDB:** colecciones `documents` (documentos), `chunked_chats` (fragmentos para RAG por chat) y `rag_docs` (documentación del asistente general).

### Modelos y GPU

Los servicios de ML tienen una copia de `model_cache.py`:
- `dataset`, los módulos de `analysis-service`, `evolution` y `rag` instancian `ModelSlot` (carga perezosa, control de admisión por VRAM, TTL y evicción).
- `clustering` y `topicmodeling` solo usan `check_fits_or_raise()`.
- `classification` no importa `model_cache.py`.
- Evicción automática tras `MODEL_TTL_SECONDS` (600 s por defecto) y margen de `MODEL_VRAM_MARGIN_MB` (512 MB por defecto). Respuesta **HTTP 503** (`ModelBusyError`) cuando no hay VRAM suficiente.
- Si no hay GPU, funcionan en CPU (con `CLASSIFICATION_FORCE_DEVICE` o `EMBEDDING_DEVICE`).

Modelos principales:
- **Embeddings:** `sentence-transformers/all-MiniLM-L6-v2`, `intfloat/multilingual-e5-large`.
- **Emociones:** `pysentimiento/robertuito-base-uncased-emotion` (ES), `j-hartmann/emotion-english-distilroberta-base` (EN).
- **Riesgo:** modelo propio (`backend/analysis-service/risk/model_artifacts/risk_model.pkl`) + verificación con `vibhorag101/roberta-base-suicide-prediction-phr`.
- **Tópicos:** BERTopic + títulos con LLM.
- **RAG:** embeddings multilingües, reranking con cross-encoder y LLM Gemini / Groq / Ollama.

### Observabilidad

- Cada servicio registra método, ruta, estado, latencia y `request_id` en formato estructurado.
- El gateway propaga `X-Request-ID` y lo devuelve en la respuesta.
- Los errores no controlados se registran con stacktrace y se mapean a respuestas HTTP claras (`502`, `503`, `504`).

---

## Frontend Web (`web/`)

### Configuración

```bash
cd web
cp .env.example .env.local
```

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `API_BASE_SERVER` | Sí | URL del `api-gateway` vista desde el **servidor** de Next.js (SSR, route handlers y rewrites). En local: `http://localhost:7500`. En Docker: `http://api-gateway:7500`. |

> En el navegador las llamadas se hacen a rutas relativas (`/dataset/...`, `/rag/...`, etc.) y Next.js las redirige al gateway mediante los `rewrites` de `web/next.config.mjs`. Por eso no hace falta CORS ni una URL pública del backend.

### Desarrollo y scripts

```bash
cd web
npm install
npm run dev
```

Disponible en <http://localhost:3000>.

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build de producción (puerto 3000 en local; 6001 en Docker por `PORT`) |
| `npm run lint` | Ejecuta ESLint |

### Docker (`web/`)

```bash
cd web
docker build -t plasma-web .
docker run --rm -p 6001:6001 -e API_BASE_SERVER=http://host.docker.internal:7500 plasma-web
```

En Linux, agregá `--add-host=host.docker.internal:host-gateway` si el gateway corre en el puerto `7500` del host.

### Estructura y rutas

```text
web/
  app/
    (auth)/login/          Pantalla de inicio de sesión
    (dashboard)/           Vistas protegidas (una ruta por funcionalidad)
    api/auth/              Route handlers que proxyean login, me y logout al gateway
  components/
    ui/                    Componentes base (shadcn/ui)
    views/                 Vistas de cada funcionalidad
    charts/                Gráficos reutilizables
  context/                 Providers de React Query, dataset y jobs
  lib/                     Cliente HTTP, auth, navegación y utilidades
  proxy.ts                 Middleware de protección de rutas
  next.config.mjs          Rewrites hacia el api-gateway
```

| Ruta | Funcionalidad |
| --- | --- |
| `/login` | Inicio de sesión |
| `/cargar-dataset` | Carga y configuración del dataset |
| `/estadisticas` | Estadísticas generales (EDA) |
| `/limpieza-datos` | Limpieza del corpus |
| `/embeddings` | Visualización de embeddings |
| `/nube-palabras` | Nube de palabras |
| `/emociones-negativas` | Detección de emociones |
| `/topicos` | Tópicos principales |
| `/evolucion-palabras` | Evolución de palabras |
| `/sentimientos-tiempo` | Sentimiento en el tiempo |
| `/mencion-suicidio` | Construcción del clasificador de menciones |
| `/nivel-riesgo` | Nivel de riesgo |
| `/chatbot-general` | Chatbot general (RAG) |
| `/chatbot-dataset` | Chatbot sobre el dataset |
| `/historial-chats` | Historial de conversaciones |
| `/informes` | Generación de informes |
| `/usuarios` | Gestión de usuarios |
| `/gestion-almacenamiento` | Administración del almacenamiento |

### Autenticación y polling de jobs en Web

1. `POST /api/auth/login` reenvía las credenciales al gateway; el `auth-service` las valida con Supabase y devuelve una cookie `access_token` (`httpOnly`).
2. `web/proxy.ts` valida la cookie en cada request y redirige a `/login` si no hay sesión válida.
3. Las llamadas a la API usan `credentials: 'include'` para enviar la cookie al gateway.
4. `POST /api/auth/logout` cierra la sesión y elimina la cookie.
5. `JobsProvider` consulta `GET /<servicio>/jobs/<job_id>` inicialmente a los 2 s con backoff independiente por job (2, 4, 8 y hasta 15 s), limitado a 3 consultas simultáneas.

---

## Frontend Mobile (`mobile/`)

Aplicación móvil construida con Expo (SDK 58), Expo Router, React Native y NativeWind.

### Configuración

```bash
cd mobile
cp .env.example .env
```

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `EXPO_PUBLIC_API_BASE` | Sí | URL base del `api-gateway` accesible desde el dispositivo o emulador (ej. `http://localhost:7500` en web, `http://10.0.2.2:7500` en emulador Android, o la IP/host del servidor). |

> `mobile/app.json` mantiene `usesCleartextTraffic: true` en Android para permitir la conexión por HTTP al servidor.

### Desarrollo y scripts

```bash
cd mobile
npm install
npm start
```

| Comando | Descripción |
| --- | --- |
| `npm start` | Inicia Metro / Expo Dev Server |
| `npm run android` | Abre la app en emulador o dispositivo Android |
| `npm run ios` | Abre la app en simulador iOS |
| `npm run web` | Ejecuta la versión web de Expo |
| `npm run lint` | Ejecuta `expo lint` |

### Estructura y rutas

```text
mobile/
  app/
    _layout.tsx            Layout raíz, providers y drawer de navegación
    index.tsx              Redirección inicial
    login.tsx              Inicio de sesión
    datasets.tsx           Listado y selección de datasets
    upload.tsx             Carga y mapeo de columnas
    func/                  Pantallas de cada análisis (estadisticas, limpieza, embeddings,
                           nube, emociones, topicos, evolucion, sentimientos, mencion,
                           riesgo, chatbot, chatbot-dataset, historial, informes,
                           usuarios, almacenamiento)
  components/              Componentes UI, gráficos, chat y diálogo de términos
  context/                 Providers de dataset, jobs y tema
  lib/                     Cliente HTTP (`api-fetch.ts`), auth (`expo-secure-store`), parsers y tipos
```

---

## Seguridad

- No commitear archivos `.env` ni `.env.local` (están en `.gitignore`); solo se versionan los `.env.example`.
- Rotar periódicamente las claves de Supabase, Hugging Face, Gemini y Groq.
- La `service role key` solo debe estar en `auth-service`, `dataset-service`, `cleaning-service` y `analysis-service` (nunca en `web/` ni `mobile/`).
- En producción, servir el gateway detrás de HTTPS y no exponer los microservicios internos.
- En `web/`, las cookies usan `httpOnly` y `samesite=lax`; para HTTPS conviene habilitar `secure`.

## Solución de problemas

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| `pull access denied for proyecto/ml-base` | Falta construir la imagen base | Ejecutar `docker build -f backend/ml-base/Dockerfile -t proyecto/ml-base backend/ml-base` |
| `503 Servicio no disponible` | Microservicio caído o nombre DNS incorrecto | Revisar `docker compose ps` y los `*_SERVICE_URL` |
| `401 No autenticado` | Cookie/JWT ausente o vencido | Volver a iniciar sesión |
| `403 Sin permiso` en `/auth/admin/*` | El usuario no tiene rol `admin` | Asignar `app_metadata.role = "admin"` en Supabase |
| `CORS_ORIGINS` vacío en dataset | Falta la variable en el `.env` | Definir `CORS_ORIGINS=http://localhost:8080,http://localhost:7500` |
| `503` al cargar un modelo | VRAM insuficiente | Liberar GPU, reducir modelos concurrentes o usar CPU |
| Descargas de modelos lentas | Caché de Hugging Face vacía | Montar `data/hf_cache` y definir `HF_TOKEN` |

## Licencia

Proyecto académico desarrollado para el Trabajo Final de la carrera (UNSL). Consultá con los autores antes de reutilizar el código o los modelos.
