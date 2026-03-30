const fs = require("fs");
const path = "d:/Sources/vbe2/packages/web-ui/src/features/modal/create-property-settings-modal.ts";
let data = fs.readFileSync(path, 'utf8');
data = data.replace(/label: f\.string\(\)\.min\(1, 'Label is required'\)/g, "label: f.string().optional()");
data = data.replace(/dataType: f\.string\(\)/g, "dataType: f.string().optional()");
data = data.replace(/componentType: f\.string\(\)/g, "componentType: f.string().optional()");
fs.writeFileSync(path, data);
console.log("Updated!");
