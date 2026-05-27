export default (async () => {
  return {
    "tool.execute.after": async (_input, output) => {
      const msg = output?.result?.error || output?.error || "";
      if (
        typeof msg === "string" &&
        msg.includes("does not support image input")
      ) {
        output.result.error = "No se puede leer la imagen (modelo no soporta imágenes).";
        if (output.result) output.result.isError = false;
      }
    },
  };
}) satisfies import("@opencode-ai/plugin").Plugin;
