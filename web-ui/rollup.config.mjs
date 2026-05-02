import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import serve from "rollup-plugin-serve";
import livereload from "rollup-plugin-livereload";

// Dev plugins only run under `rollup -w`, never on one-shot builds.
const isWatch = Boolean(process.env.ROLLUP_WATCH);

export default {
  input: "src/main.js",
  output: {
    file: "dist/bundle.js",
    format: "iife",
    name: "GlitzerStudio",
    sourcemap: true
  },
  plugins: [
    resolve(),
    commonjs(),
    json(),
    isWatch && serve({
      contentBase: ".",
      port: 6969,
      open: false
    }),
    isWatch && livereload({
      watch: ["dist", "index.html", "styles.css"]
    })
  ].filter(Boolean)
};
