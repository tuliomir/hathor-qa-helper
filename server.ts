// server.ts - Serves built React app from dist/ folder
const PORT = process.env.PORT || 5173;
const distPath = "./dist";

Bun.serve({
  port: Number(PORT),
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname === "/" ? "/index.html" : url.pathname;

    // Try to serve the file, fall back to index.html for SPA routing
    let file = Bun.file(distPath + pathname);
    if (!(await file.exists())) {
      file = Bun.file(distPath + "/index.html");
    }

    return new Response(file);
  },
});

console.log(`QA Helper Standalone running at http://localhost:${PORT}`);
