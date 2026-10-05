const fs = require('fs');
const fetch = require('node-fetch');
const ical = require('node-ical');

const currentYear = new Date().getFullYear();

const properties = [
    // --- ESSEN (Gerlingstr. 41 über abfall.io API) ---
    { 
        id: 6, 
        city: 'Essen', 
        address: 'Gerlingstr. 41, Essen', 
        tasks: ['Tonnen'], 
        binDay: 'Montag', 
        cleanDay: '', 
        icsUrl: 'https://api.abfall.io/?key=51be67f3758f1fb57b420efe065c0663&mode=export&idhousenumber=69956&wastetypes=66,177,42&timeperiod=20260101-20261231&showinactive=false&type=ics' 
    },

    // --- OBERHAUSEN (RegioIT) ---
    { 
        id: 7, 
        city: 'Oberhausen', 
        address: 'Linsingenstr. 2, Oberhausen', 
        tasks: ['Tonnen', 'Putzen'], 
        binDay: 'Freitag', 
        cleanDay: 'Mittwoch', 
        icsUrl: `https://abfallkalender.regioit.de/kalender-oberhausen/downloadfile.jsp?format=ics&jahr=${currentYear}&ort=Oberhausen&strStatic=T2JlcmhhdXNlbmRlZmF1bHRMaW5zaW5nZW5zdHJh32U%3D&hnrStatic=T2JlcmhhdXNlbjQ2MDQ1TGluc2luZ2Vuc3RyYd9lMg%3D%3D&zeit=-%3A00%3A00&fraktion=0&fraktion=5&fraktion=6&fraktion=7&fraktion=10&fraktion=11` 
    }
    // (Füge hier nach demselben Prinzip die anderen Adressen hinzu, sobald du deren api.abfall.io-Links hast)
];

function parseIcsData(rawData) {
    const events = ical.sync.parseICS(rawData);
    const upcomingEvents = [];

    for (const key in events) {
        const event = events[key];
        if (event.type === 'VEVENT') {
            let summaryText = typeof event.summary === 'string' ? event.summary : (event.summary?.val || 'Abfalltermin');
            let eventDate = event.start ? new Date(event.start).toISOString().split('T')[0] : '';
            if (eventDate) {
                upcomingEvents.push({ title: summaryText, date: eventDate });
            }
        }
    }
    return upcomingEvents;
}

async function fetchAndParseData() {
    console.log("Starte direkten API-Abruf der Kalender...");
    const outputData = [];

    for (const prop of properties) {
        console.log(`Lade Daten für: ${prop.address}`);
        let calendarEvents = [];

        try {
            const res = await fetch(prop.icsUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });

            if (res.ok) {
                const text = await res.text();
                if (text.includes('BEGIN:VCALENDAR')) {
                    calendarEvents = parseIcsData(text);
                    console.log(`  -> Erfolgreich: ${calendarEvents.length} Termine geladen.`);
                } else {
                    console.warn(`  -> Antwort war kein gültiger Kalender.`);
                }
            } else {
                console.error(`  -> HTTP-Fehler: ${res.status}`);
            }
        } catch (e) {
            console.error(`  -> Abruf-Fehler: ${e.message}`);
        }

        outputData.push({
            id: prop.id,
            city: prop.city,
            address: prop.address,
            tasks: prop.tasks,
            binDay: prop.binDay,
            cleanDay: prop.cleanDay,
            icsUrl: prop.icsUrl,
            calendarEvents: calendarEvents
        });
    }

    fs.writeFileSync('data.json', JSON.stringify(outputData, null, 2));
    console.log("data.json erfolgreich aktualisiert!");
}

fetchAndParseData();
