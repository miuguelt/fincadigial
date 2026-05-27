/**
 * Utilidad para optimizar imágenes en el cliente antes de la subida.
 * Reduce el tamaño del archivo redimensionando y ajustando la calidad,
 * ahorrando ancho de banda y batería en entornos rurales.
 */

interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

export async function optimizeImage(
  file: File,
  options: OptimizeOptions = {}
): Promise<File> {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.7,
    mimeType = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo el aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        
        // Dibujar en canvas para redimensionar
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto del canvas'));
          return;
        }
        
        // Dibujar imagen con suavizado
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a Blob/File
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Error al convertir canvas a blob'));
              return;
            }
            
            // Crear un nuevo objeto File manteniendo el nombre original pero con la nueva extensión/tipo
            const optimizedFile = new File(
              [blob], 
              file.name.replace(/\.[^/.]+$/, "") + ".jpg", 
              { type: mimeType, lastModified: Date.now() }
            );
            
            console.log(`[ImageOptimizer] Original: ${(file.size / 1024).toFixed(1)}KB -> Optimizado: ${(optimizedFile.size / 1024).toFixed(1)}KB`);
            resolve(optimizedFile);
          },
          mimeType,
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Error al cargar la imagen'));
    };
    
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
  });
}

