from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os
import subprocess

app = FastAPI()

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

class Especialidad(BaseModel):
    ITEM: int
    ESPECIALIDAD: str
    NOMBRES_Y_APELLIDOS: str
    DNI: str
    ACTIVO: bool = True

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
            "ACTIVO": item.get("ACTIVO", True)
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
            "ACTIVO": bool(item.get("ACTIVO", True))
        }
        storage_data.append(storage_item)
    with open(ESPECIALIDADES_FILE, "w", encoding="utf-8") as f:
        json.dump(storage_data, f, indent=2, ensure_ascii=False)

@app.get("/especialidades")
def get_especialidades():
    return load_data()

@app.post("/especialidades")
def create_especialidad(item: Especialidad):
    data = load_data()
    data.append(item.dict())
    save_data(data)
    return item

@app.put("/especialidades/{item_id}")
def update_especialidad(item_id: int, updated_item: Especialidad):
    data = load_data()
    for i, item in enumerate(data):
        if str(item["ITEM"]) == str(item_id):
            data[i] = updated_item.dict()
            save_data(data)
            return updated_item
    raise HTTPException(status_code=404, detail="Not found")

@app.delete("/especialidades/{item_id}")
def delete_especialidad(item_id: int):
    data = load_data()
    new_data = [item for item in data if item["ITEM"] != item_id]
    save_data(new_data)
    return {"status": "deleted"}

@app.post("/import-txt")
def run_import():
    try:
        result = subprocess.run(["python", CONSOLIDATE_SCRIPT], capture_output=True, text=True)
        return {"output": result.stdout, "error": result.stderr}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process")
def run_process():
    try:
        result = subprocess.run(["python", FILTER_SCRIPT], capture_output=True, text=True)
        return {"output": result.stdout, "error": result.stderr}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/report-data")
def get_report_data():
    file_path = os.path.join(BASE_PATH, "especialidades_horas.json")
    if not os.path.exists(file_path):
        return []
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

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
def run_import_citados():
    try:
        result = subprocess.run(["python", CONSOLIDATE_CITADOS_SCRIPT], capture_output=True, text=True)
        return {"output": result.stdout, "error": result.stderr}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process-citados")
def run_process_citados():
    try:
        result = subprocess.run(["python", FILTER_CITADOS_SCRIPT], capture_output=True, text=True)
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
