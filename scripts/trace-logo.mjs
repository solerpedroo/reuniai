const fs = require("fs");
const path = require("path");
const potrace = require("potrace");

const source = path.join(__dirname, "../public/brand/logo-zoom-source.png");
const output = path.join(__dirname, "../public/brand/logo-traced.svg");

potrace.trace(
  source,
  {
    color: "#0064F5",
    background: "transparent",
    threshold: 200,
    turdSize: 2,
    optTolerance: 0.2,
  },
  (err, svg) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    fs.writeFileSync(output, svg);
    console.log("Wrote", output, `(${svg.length} bytes)`);
  }
);
