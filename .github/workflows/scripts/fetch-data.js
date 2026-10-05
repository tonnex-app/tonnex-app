const fs = require('fs');
const ical = require('node-ical');

// Konfiguration der Kalender-URLs der Städte für die jeweiligen Objekte
const properties = [
    { id: 1, city: 'Duisburg', address: 'Turmstr. 36, 47119 Duisburg', tasks: ['Tonnen', 'Putzen'], binDay: 'Dienstag', cleanDay: 'Montag', icsUrl: 'https://beispiel-duisburg.de/kalender.ics' },
    { id: 2, city: 'Duisburg', address: 'Turmstr. 38, 47119 Duisburg', tasks: ['Tonnen', 'Putzen'], binDay: 'Dienstag', cleanDay: 'Montag', icsUrl: 'https://beispiel-duisburg.de/kalender.ics' },
    { id: 3, city: 'Duisburg', address: 'Krummenhakstr. 26, Duisburg', tasks: ['Tonnen', 'Putzen'], binDay: 'Mittwoch', cleanDay: 'Dienstag', icsUrl: '' },
    { id: 4, city: 'Essen', address: 'Pferdemarkt 10, Essen', tasks: ['Tonnen'], binDay: 'Donnerstag', cleanDay: '', icsUrl: '' },
    { id: 5, city: 'Essen', address: 'Kreuzeskirchstr. 8, Essen', tasks: ['Tonnen'], binDay: 'Freitag', cleanDay: '', icsUrl: '' },
    { id: 6, city: 'Essen', address: 'Gerlingstr. 43, Essen', tasks: ['Tonnen'], binDay: 'Freitag', cleanDay: '', icsUrl: '' },
    { id: 7, city: 'Oberhausen', address: 'Linsingenstr. 2, Oberhausen', tasks: ['Tonnen'], binDay: 'Dienstag', cleanDay: '', icsUrl: '' }
];

async function syncTrashData() {
    console.log("Starte automatischen Datenabruf...");

    let updatedEvents = [];

    for (let prop of properties) {
        if (prop.icsUrl) {
            try {
                const events = await ical.async.fromURL(prop.icsUrl);
                for (let k in events) {
                    if (events[k].type === 'VEVENT') {
                        updatedEvents.push({
                            propertyId: prop.id,
                            summary: events[k].summary,
                            date: events[k].start.toISOString().slice(0, 10)
                        });
                    }
                }
            } catch (err) {
                console.error(`Fehler beim Abrufen von ${prop.address}:`, err);
            }
        }
    }

    const payload = {
        lastUpdate: new Date().toISOString(),
        properties: properties,
        events: updatedEvents
    };

    fs.writeFileSync('data.json', JSON.stringify(payload, null, 2));
    console.log("data.json erfolgreich aktualisiert!");
}

syncTrashData();
