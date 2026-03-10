import json
import os

base_path = r"d:\Web_Cerete\Amalviva\Explota"
json_path = os.path.join(base_path, "especialidades.json")
fotos_dir = os.path.join(base_path, "fotos")

with open(json_path, "r", encoding="utf-8") as f:
    data = json.load(f)

foto_files = os.listdir(fotos_dir)
# Map DNI (filename without extension) to actual filename
dni_to_file = {os.path.splitext(f)[0]: f for f in foto_files}

updated_count = 0
for item in data:
    dni = str(item.get("DNI", ""))
    if dni in dni_to_file:
        item["FOTO_URL"] = f"/fotos/{dni_to_file[dni]}"
        updated_count += 1

with open(json_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Sincronización completada. Se actualizaron {updated_count} profesionales con sus fotos.")
