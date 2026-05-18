import requests

r = requests.get('http://127.0.0.1:18081/api/v1/users')
data = r.json()
users = data.get('data', [])
print(f"Total usuarios: {len(users)}\n")
print(f"{'ID':<15} {'Nombre':<25} {'Rol':<15} {'Finca':<15} {'Estado'}")
print("-" * 100)
for u in users:
    print(f"{str(u.get('identification','?')):<15} {str(u.get('fullname','?')):<25} {str(u.get('role','?')):<15} {str(u.get('finca_name','?')):<15} {str(u.get('approval_status','?'))}")
