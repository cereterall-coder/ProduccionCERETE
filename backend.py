from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os
import subprocess

app = FastAPI()

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_PATH = os.path.dirname(os.path.abspath(__file__))
ESPECIALIDADES_FILE = os.path.join(BASE_PATH, "especialidades.json")
CONSOLIDADO_FILE = os.path.join(BASE_PATH, "consolidado_horas_efectivas.json")

FILTER_SCRIPT = os.path.join(BASE_PATH, "filter_data.py")
CONSOLIDATE_SCRIPT = os.path.join(BASE_PATH, "consolidate_txt.py")

# Scripts de Citados
CONSOLIDATE_CITADOS_SCRIPT = os.path.join(BASE_PATH, "consolidate_citados.py")
FILTER_CITADOS_SCRIPT = os.path.join(BASE_PATH, "filter_citados.py")
CITADOS_POR_MES_DIR = os.path.join(BASE_PATH, "citados_por_mes")
HORAS_POR_MES_DIR   = os.path.join(BASE_PATH, "horas_por_mes")

# Scripts de Terminalistas (Digitadores)
DIGITADORES_FILE = os.path.join(BASE_PATH, "digitadores.json")
CONSOLIDATE_TERMINALISTAS_SCRIPT = os.path.join(BASE_PATH, "consolidate_terminalistas.py")
FILTER_TERMINALISTAS_SCRIPT = os.path.join(BASE_PATH, "filter_terminalistas.py")
FOTOS_DIR = os.path.join(BASE_PATH, "fotos")
if not os.path.exists(FOTOS_DIR):
    os.makedirs(FOTOS_DIR)

app.mount("/fotos", StaticFiles(directory=FOTOS_DIR), name="fotos")

class Especialidad(BaseModel):
    ITEM: int
    ESPECIALIDAD: str
    NOMBRES_Y_APELLIDOS: str
    DNI: str
    ACTIVO: bool = True
    FOTO_URL: str = ""

def load_data():
    if not os.path.exists(ESPECIALIDADES_FILE):
        return []
    with open(ESPECIALIDADES_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # Normalizar llaves para uso interno en el backend y frontend
    normalized_data = []
    for item in data:
        new_item = {
            "ITEM": int(item.get("ITEM", 0)),
            "ESPECIALIDAD": item.get("ESPECIALIDAD", ""),
            "NOMBRES_Y_APELLIDOS": item.get("NOMBRES Y APELLIDOS") or item.get("NOMBRES_Y_APELLIDOS", ""),
            "DNI": str(item.get("DNI", "")),
            "ACTIVO": item.get("ACTIVO", True),
            "FOTO_URL": item.get("FOTO_URL", "")
        }
        normalized_data.append(new_item)
    return normalized_data

def save_data(data):
    storage_data = []
    for item in data:
        # Convertir de vuelta al formato de archivo (con espacios en los nombres si es necesario)
        storage_item = {
            "ITEM": int(item["ITEM"]),
            "ESPECIALIDAD": item["ESPECIALIDAD"],
            "NOMBRES Y APELLIDOS": item["NOMBRES_Y_APELLIDOS"],
            "DNI": str(item["DNI"]),
            "ACTIVO": bool(item.get("ACTIVO", True)),
            "FOTO_URL": item.get("FOTO_URL", "")
        }
        storage_data.append(storage_item)
    with open(ESPECIALIDADES_FILE, "w", encoding="utf-8") as f:
        json.dump(storage_data, f, indent=2, ensure_ascii=False)

@app.get("/especialidades")
def get_especialidades():
    return load_data()

@app.post("/especialidades")
async def create_especialidad(item: Especialidad):
    data = load_data()
    data.append(item.dict())
    save_data(data)
    await manager.broadcast("refresh")
    return item

@app.put("/especialidades/{item_id}")
async def update_especialidad(item_id: int, updated_item: Especialidad):
    data = load_data()
    for i, item in enumerate(data):
        if str(item["ITEM"]) == str(item_id):
            data[i] = updated_item.dict()
            save_data(data)
            await manager.broadcast("refresh")
            return updated_item
    raise HTTPException(status_code=404, detail="Not found")

@app.delete("/especialidades/{item_id}")
async def delete_especialidad(item_id: int):
    data = load_data()
    new_data = [item for item in data if item["ITEM"] != item_id]
    save_data(new_data)
    await manager.broadcast("refresh")
    return {"status": "deleted"}

@app.post("/import-txt")
async def run_import():
    try:
        result = subprocess.run(["python", CONSOLIDATE_SCRIPT], capture_output=True, text=True)
        await manager.broadcast("refresh")
        return {"output": result.stdout, "error": result.stderr}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process")
async def run_process():
    try:
        result = subprocess.run(["python", FILTER_SCRIPT], capture_output=True, text=True)
        await manager.broadcast("refresh")
        return {"output": result.stdout, "error": result.stderr}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/report-data")
def get_report_data():
    """
    Obtiene la data unificada. 
    Busca archivos .json en 'Horas Efectivas' y los combina.
    """
    combined_data = []
    lan_dir = os.path.join(BASE_PATH, "Horas Efectivas")
    
    # 1. Buscar archivos JSON en "Horas Efectivas"
    if os.path.exists(lan_dir):
        import glob
        json_files = glob.glob(os.path.join(lan_dir, "*.json"))
        for f_path in json_files:
            try:
                with open(f_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        combined_data.extend(data)
            except Exception as e:
                print(f"Error cargando {f_path}: {e}")

    # 2. Si no hay nada en la carpeta LAN, buscar el archivo raíz antiguo
    if not combined_data:
        file_path_base = os.path.join(BASE_PATH, "especialidades_horas.json")
        if os.path.exists(file_path_base):
            with open(file_path_base, "r", encoding="utf-8") as f:
                combined_data = json.load(f)
                
    return combined_data

@app.get("/horas-meses")
def get_horas_meses():
    """Devuelve la lista de meses disponibles en horas_por_mes/."""
    if not os.path.exists(HORAS_POR_MES_DIR):
        return []
    return sorted([
        d for d in os.listdir(HORAS_POR_MES_DIR)
        if os.path.isdir(os.path.join(HORAS_POR_MES_DIR, d))
    ])

@app.get("/report-data-mes")
def get_report_data_mes(mes: str):
    """Devuelve horas efectivas filtradas de un mes. mes=YYYY-MM"""
    file_path = os.path.join(HORAS_POR_MES_DIR, mes, "especialidades_horas.json")
    if not os.path.exists(file_path):
        return []
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

# ──────────────────────────────────────────────
# Endpoints de Citados
# ──────────────────────────────────────────────

@app.post("/import-citados")
async def run_import_citados():
    try:
        result = subprocess.run(["python", CONSOLIDATE_CITADOS_SCRIPT], capture_output=True, text=True)
        await manager.broadcast("refresh")
        return {"output": result.stdout, "error": result.stderr}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process-citados")
async def run_process_citados():
    try:
        result = subprocess.run(["python", FILTER_CITADOS_SCRIPT], capture_output=True, text=True)
        await manager.broadcast("refresh")
        return {"output": result.stdout, "error": result.stderr}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/citados-data")
def get_citados_data():
    file_path = os.path.join(BASE_PATH, "especialidades_citados.json")
    if not os.path.exists(file_path):
        return []
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

@app.get("/citados-meses")
def get_citados_meses():
    """Devuelve la lista de meses disponibles (carpetas en citados_por_mes/)."""
    if not os.path.exists(CITADOS_POR_MES_DIR):
        return []
    meses = sorted([
        d for d in os.listdir(CITADOS_POR_MES_DIR)
        if os.path.isdir(os.path.join(CITADOS_POR_MES_DIR, d))
    ])
    return meses

@app.get("/citados-data-mes")
def get_citados_data_mes(mes: str):
    """Devuelve los citados filtrados de un mes especifico. mes=YYYY-MM"""
    file_path = os.path.join(CITADOS_POR_MES_DIR, mes, "especialidades_citados.json")
    if not os.path.exists(file_path):
        return []
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

# ──────────────────────────────────────────────
# Endpoints de Terminalistas (Digitadores)
# ──────────────────────────────────────────────

@app.post("/import-terminalista")
async def run_import_terminalista():
    try:
        result = subprocess.run(["python", CONSOLIDATE_TERMINALISTAS_SCRIPT], capture_output=True, text=True)
        await manager.broadcast("refresh")
        return {"output": result.stdout, "error": result.stderr}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process-terminalista")
async def run_process_terminalista():
    try:
        result = subprocess.run(["python", FILTER_TERMINALISTAS_SCRIPT], capture_output=True, text=True)
        await manager.broadcast("refresh")
        return {"output": result.stdout, "error": result.stderr}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/digitadores")
async def get_digitadores():
    if not os.path.exists(DIGITADORES_FILE):
        return []
    with open(DIGITADORES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

@app.get("/terminalista-data")
async def get_terminalista_data():
    file_path = os.path.join(BASE_PATH, "digitadores_citas.json")
    if not os.path.exists(file_path):
        return []
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

@app.get("/terminalista-meses")
async def get_terminalista_meses():
    if not os.path.exists(TERMINALISTAS_POR_MES_DIR):
        return []
    return sorted([
        d for d in os.listdir(TERMINALISTAS_POR_MES_DIR)
        if os.path.isdir(os.path.join(TERMINALISTAS_POR_MES_DIR, d))
    ])

@app.get("/terminalista-data-mes")
async def get_terminalista_data_mes(mes: str):
    file_path = os.path.join(TERMINALISTAS_POR_MES_DIR, mes, "digitadores_citas.json")
    if not os.path.exists(file_path):
        return []
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

# ── Servir Frontend (SPA) ───────────────────────
DIST_PATH = os.path.join(BASE_PATH, "app", "dist")

if os.path.exists(DIST_PATH):
    # Primero las rutas del API se declaran arriba. 
    # Al montar "/" después, servirá los estáticos para cualquier ruta no capturada por el API.
    app.mount("/", StaticFiles(directory=DIST_PATH, html=True), name="static")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    index_file = os.path.join(DIST_PATH, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"detail": "Frontend no encontrado. Ejecute 'npm run build' en la carpeta app."}

if __name__ == "__main__":
    import uvicorn
    # Cambiamos al puerto 8080 para producción
    uvicorn.run(app, host="0.0.0.0", port=8080)
