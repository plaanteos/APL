const Baileys = require('@whiskeysockets/baileys');
console.log('Baileys keys:', Object.keys(Baileys));
if (Baileys.default) {
    console.log('Baileys.default keys:', Object.keys(Baileys.default));
}
console.log('makeInMemoryStore on Baileys:', typeof Baileys.makeInMemoryStore);
if (Baileys.default) {
    console.log('makeInMemoryStore on Baileys.default:', typeof Baileys.default.makeInMemoryStore);
}
