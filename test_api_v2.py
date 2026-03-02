import requests
import json

BASE_URL = "http://localhost:8000"

# 1. Get current data for ITEM 1
res = requests.get(f"{BASE_URL}/especialidades")
data = res.json()
target = next((x for x in data if x["ITEM"] == 1), None)

if target:
    print(f"Current state of ITEM 1: {target}")
    
    # 2. Update to ACTIVO: False
    update_payload = target.copy()
    update_payload["ACTIVO"] = False
    
    print(f"Sending PUT with: {update_payload}")
    res_put = requests.put(f"{BASE_URL}/especialidades/1", json=update_payload)
    print(f"PUT Status: {res_put.status_code}")
    print(f"PUT Response: {res_put.json()}")
    
    # 3. Verify with GET
    res_verify = requests.get(f"{BASE_URL}/especialidades")
    data_verify = res_verify.json()
    target_verify = next((x for x in data_verify if x["ITEM"] == 1), None)
    print(f"Verified state of ITEM 1: {target_verify}")
else:
    print("ITEM 1 not found")
