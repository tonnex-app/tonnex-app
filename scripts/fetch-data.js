const fs = require('fs');
const path = require('path');
const ical = require('node-ical');

const properties = [
    { 
        id: 1, 
        city: 'Duisburg', 
        address: 'Turmstr. 36, 47119 Duisburg', 
        tasks: ['Tonnen', 'Putzen'], 
        binDay: 'Dienstag', 
        cleanDay: 'Montag', 
        localIcs: 'calendars/duisburg_36.ics' 
    },
    { 
        id: 2, 
        city: 'Duisburg', 
        address: 'Turmstr. 38, 47119 Duisburg', 
        tasks: ['Tonnen'], 
        binDay: 'Dienstag', 
        cleanDay: '', 
        localIcs: 'calendars/duisburg_38.ics' 
    },
    { 
        id: 3, 
        city: 'Duisburg', 
        address: 'Krummenhakstr. 36, Duisburg', 
        tasks: ['Tonnen', 'Putzen'], 
        binDay: 'Mittwoch', 
        cleanDay: 'Dienstag', 
        localIcs: 'calendars/duisburg_krummenhak.ics' 
    },
    { 
        id: 4, 
        city: 'Essen', 
        address: 'Pferdemarkt 10, Essen', 
        tasks: ['Tonnen'], 
        binDay: 'Donnerstag', 
        cleanDay: '', 
        localIcs: 'calendars/essen_pferdemarkt.ics' 
    },
    { 
        id: 5, 
        city: 'Essen', 
        address: 'Kreuzeskirchstr. 8, Essen', 
        tasks: ['Tonnen', 'Putzen'], 
        binDay: 'Freitag', 
        cleanDay: 'Donnerstag', 
        localIcs: 'calendars/essen_kreuzeskirch.ics' 
    },
    { 
        id: 6, 
        city: 'Essen', 
        address: 'Gerlingstr. 41, Essen', 
        tasks: ['Tonnen'], 
        binDay: 'Montag', 
        cleanDay: '', 
        localIcs: 'calendars/essen_gerling.ics' 
    },
    { 
        id: 7, 
        city: 'Oberhausen', 
        address: 'Linsingenstr. 2, Oberhausen', 
        tasks: ['Tonnen', 'Putzen'], 
        binDay: 'Freitag', 
        cleanDay: 'Mittwoch', 
        localIcs: 'calendars/oberhausen_linsingen.ics' 
    }
];

async function parseLocalCalendars() {
    console.log("Starte Verarbeitung der lokalen ICS-Dateien...");
    const outputData = [];

    for (const prop of properties) {
        try {
            const filePath = path.join(__dirname, '..', prop.localIcs);
            console.log(`Lese Datei für ${prop.address}: ${filePath}`);

            if (!fs.existsSync(filePath)) {
                throw new Error(`Datei nicht gefunden: ${filePath}`);
            }

            const rawData = fs.readFileSync(filePath, 'utf-8');
            const events = ical.sync.parseICS(rawData);
            const upcomingEvents = [];

            for (const key in events) {
                const event = events[key];
                if (event.type === 'VEVENT') {
                    let summaryText = '';
                    if (typeof event.summary === 'string') {
                        summaryText = event.summary;
                    } else if (event.summary && event.summary.val) {
                        summaryText = event.summary.val;
                    } else {
                        summaryText = 'Abfalltermin';
                    }

                    let eventDate = '';
                    if (event.start) {
                        const d = new Date(event.start);
                        if (!isNaN(d.getTime())) {
                            eventDate = d.toISOString().split('T')[0];
                        }
                    }

                    if (eventDate) {
                        upcomingEvents.push({
                            title: summaryText,
                            date: eventDate
                        });
                    }
                }
            }

            console.log(`  -> ${upcomingEvents.length} Termine geladen.`);

            outputData.push({
                ...prop,
                calendarEvents: upcomingEvents
            });

        } catch (error) {
            console.error(`  -> Fehler bei ${prop.address}:`, error.message);
            outputData.push({
                ...prop,
                calendarEvents: []
            });
        }
    }

    fs.writeFileSync('data.json', JSON.stringify(outputData, null, 2));
    console.log("data.json erfolgreich erstellt!");
}

parseLocalCalendars();
