import { build } from "vite";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const watch = process.argv.includes("--watch") ? {} : null;

const sharedBuild = {
  configFile: false,
  publicDir: "public",
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: true,
    watch,
  },
};

async function collectJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectJavaScriptFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && fullPath.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
}

function escapeNonAscii(text) {
  let output = "";

  for (let index = 0; index < text.length; index += 1) {
    const codeUnit = text.charCodeAt(index);

    const isSafeAscii =
      codeUnit <= 0x7f &&
      (codeUnit >= 0x20 || codeUnit === 0x0a || codeUnit === 0x0d || codeUnit === 0x09);

    if (isSafeAscii) {
      output += text[index];
      continue;
    }

    output += `\\u${codeUnit.toString(16).padStart(4, "0")}`;
  }

  return output;
}

async function normalizeJavaScriptEncoding(directory) {
  const files = await collectJavaScriptFiles(directory);

  for (const file of files) {
    const text = await readFile(file, "utf8");
    const normalized = escapeNonAscii(text);

    if (normalized !== text) {
      await writeFile(file, normalized, "utf8");
    }
  }
}

await build({
  ...sharedBuild,
  build: {
    ...sharedBuild.build,
    emptyOutDir: true,
    lib: {
      entry: "src/background/index.ts",
      formats: ["iife"],
      fileName: () => "background.js",
      name: "XCleanerBackground",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});

await build({
  ...sharedBuild,
  build: {
    ...sharedBuild.build,
    emptyOutDir: false,
    lib: {
      entry: "src/content/index.ts",
      formats: ["iife"],
      fileName: () => "content.js",
      name: "XCleanerContent",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});

await build({
  ...sharedBuild,
  build: {
    ...sharedBuild.build,
    emptyOutDir: false,
    rollupOptions: {
      input: {
        options: "options.html",
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});

await normalizeJavaScriptEncoding("dist");
