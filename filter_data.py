import json
import os
from collections import defaultdict

def filter_json():
    base_path = r"d:\Web_Cerete\Amalviva\Explota"
    especialidades_file = os.path.join(base_path, "especialidades.json")
    consolidado_file    = os.path.join(base_path, "consolidado_horas_efectivas.json")
    output_file         = os.path.join(base_path, "especialidades_horas.json")
    output_dir          = os.path.join(base_path, "horas_por_mes")

    # Cargar DNIs activos
    with open(especialidades_file, "r", encoding="utf-8") as f:
        especialidades = json.load(f)

    dni_set = {str(item["DNI"]) for item in especialidades if item.get("ACTIVO", True)}
    print(f"DNIs activos cargados: {len(dni_set)}")

    # Cargar consolidado
    with open(consolidado_file, "r", encoding="utf-8") as f:
        consolidado = json.load(f)

    print(f"Procesando {len(consolidado)} registros de consolidado_horas_efectivas.json")

    # Filtrar por DOC_PROFESIONAL
    filtered_results = [
        record for record in consolidado
        if str(record.get("DOC_PROFESIONAL")) in dni_set
    ]

    print(f"Registros coincidentes: {len(filtered_results)}")

    # ── Guardar archivo plano (compatibilidad anterior) ──────────────────────
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(filtered_results, f, indent=2, ensure_ascii=False)
    print(f"Archivo plano guardado: {output_file}")

    # ── Agrupar por mes desde PERIODO (formato DD/MM/YYYY) ───────────────────
    # Ejemplo: "07/02/2026" → clave "2026-02"
    por_mes = defaultdict(list)
    for record in filtered_results:
        periodo = str(record.get("PERIODO", "")).strip()
        partes  = periodo.split("/")
        if len(partes) == 3:              # DD / MM / YYYY
            clave = f"{partes[2]}-{partes[1].zfill(2)}"   # "2026-02"
        else:
            clave = "sin-periodo"
        por_mes[clave].append(record)

    os.makedirs(output_dir, exist_ok=True)
    for mes, registros in por_mes.items():
        mes_dir = os.path.join(output_dir, mes)
        os.makedirs(mes_dir, exist_ok=True)
        out = os.path.join(mes_dir, "especialidades_horas.json")
        with open(out, "w", encoding="utf-8") as f:
            json.dump(registros, f, indent=2, ensure_ascii=False)
        print(f"  [{mes}] {len(registros)} registros -> {out}")

    print(f"\nMeses generados: {sorted(por_mes.keys())}")

if __name__ == "__main__":
    filter_json()
