
module.exports = {
  process(src, filename) {
    // Solo reemplazamos import.meta.env por una referencia segura
    // y dejamos que Jest/TS-Jest manejen el resto
    if (filename.endsWith('.ts') || filename.endsWith('.tsx') || filename.endsWith('.js') || filename.endsWith('.jsx')) {
      return {
        code: src.replace(/import\.meta\.env/g, '(globalThis.import_meta_env || {})')
      };
    }
    return { code: src };
  },
};
