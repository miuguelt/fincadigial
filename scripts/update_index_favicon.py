import os

file_path = 'frontend/index.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('<link rel="icon" type="image/svg+xml" href="/favicon.svg" />', '<link rel="icon" type="image/png" href="/pwa-64x64.png" />')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
