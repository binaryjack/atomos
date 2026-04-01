const fs = require('fs');
const file = 'packages/web-ui/src/features/settings-page/create-settings-page.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/<svg class=\"w-6 h-6/g, '<svg width=\"24\" height=\"24\" class=\"w-6 h-6');
code = code.replace(/<svg class=\"w-4 h-4/g, '<svg width=\"16\" height=\"16\" class=\"w-4 h-4');
fs.writeFileSync(file, code);
