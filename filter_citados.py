import json
import os
from collections import defaultdict

def filter_citados():
    base_path = r"c:\Users\ACER\.gemini\antigravity\scratch\Explota"
    especialidades_file = os.path.join(base_path, "especialidades.json")
    consolidado_file    = os.path.join(base_path, "consolidado_citados.json")
    output_file         = os.path.join(base_path, "especialidades_citados.json")
    output_dir          = os.path.join(base_path, "citados_por_mes")

    # Cargar DNIs activos
    with open(especialidades_file, "r", encoding="utf-8") as f:
        especialidades = json.load(f)

    dni_set = {
        str(item.get("DNI", ""))
        for item in especialidades
        if item.get("ACTIVO", True)
    }
    print(f"DNIs activos cargados: {len(dni_set)}")

    # Cargar consolidado
    with open(consolidado_file, "r", encoding="utf-8") as f:
        consolidado = json.load(f)

    print(f"Registros en consolidado_citados.json: {len(consolidado)}")

    # Filtrar por DNI_MEDICO
    filtered = [
        record for record in consolidado
        if str(record.get("DNI_MEDICO", "")).strip() in dni_set
    ]
    print(f"Registros que coinciden con especialistas activos: {len(filtered)}")

    # Guardar archivo plano (compatibilidad anterior)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(filtered, f, indent=2, ensure_ascii=False)
    print(f"Archivo plano generado: {output_file}")

    # Agrupar por PERIODO (YYYYMM) y guardar en carpetas por mes
    por_mes = defaultdict(list)
    for record in filtered:
        periodo = str(record.get("PERIODO", "")).strip()
        if len(periodo) == 6:          # formato YYYYMM
            year  = periodo[:4]
            month = periodo[4:]
            clave = f"{year}-{month}"  # ej: "2026-02"
        else:
            clave = "sin-periodo"
        por_mes[clave].append(record)

    os.makedirs(output_dir, exist_ok=True)
    for mes, registros in por_mes.items():
        mes_dir = os.path.join(output_dir, mes)
        os.makedirs(mes_dir, exist_ok=True)
        out = os.path.join(mes_dir, "especialidades_citados.json")
        with open(out, "w", encoding="utf-8") as f:
            json.dump(registros, f, indent=2, ensure_ascii=False)
        print(f"  [{mes}] {len(registros)} registros -> {out}")

    print(f"\nMeses generados: {sorted(por_mes.keys())}")

if __name__ == "__main__":
    filter_citados()
