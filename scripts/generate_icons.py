import os
from PIL import Image

logo_path = 'C:/Users/Miguel/.gemini/antigravity/brain/0987a128-7351-4b75-801b-85249c3955ae/villaluz_logo_1791576361725.jpg'
public_dir = 'frontend/public'

sizes = {
    'pwa-64x64.png': (64, 64),
    'pwa-192x192.png': (192, 192),
    'pwa-512x512.png': (512, 512),
    'apple-touch-icon-180x180.png': (180, 180),
    'maskable-icon-512x512.png': (512, 512)
}

try:
    with Image.open(logo_path) as img:
        img = img.convert('RGBA')
        for filename, size in sizes.items():
            resized = img.resize(size, Image.Resampling.LANCZOS)
            resized.save(os.path.join(public_dir, filename), 'PNG')
        
        # Save favicon.ico
        img.resize((32, 32), Image.Resampling.LANCZOS).save(os.path.join(public_dir, 'favicon.ico'))
        
    print("Logos resized and saved successfully.")
except Exception as e:
    print(f"Error: {e}")
