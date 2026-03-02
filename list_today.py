import json
try:
    with open('especialidades_horas.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    today = '28/02/2026'
    profs = set()
    for d in data:
        if d.get('PERIODO') == today:
            try:
                pro = int(d.get('PRO', 0)) if d.get('PRO') else 0
                if pro > 0:
                    profs.add(f"{d['PROFESIONAL']} ({d.get('SERVICIO', 'N/A')})")
            except:
                pass
    for p in sorted(list(profs)):
        print(p)
except Exception as e:
    print(f"Error: {e}")
