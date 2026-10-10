import os

file_path = 'frontend/src/widgets/dashboard-layout/Header.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('import logoSenaOrange from "@/shared/assets/logoSenaOrange.svg";', 'import logoVillaluz from "@/shared/assets/logo-villaluz.jpg";')
content = content.replace('src={logoSenaOrange}', 'src={logoVillaluz}')
content = content.replace('alt="Logo SENA"', 'alt="Logo Villa Luz"')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
