const fs = require('fs');
const ical = require('node-ical');

const currentYear = new Date().getFullYear();

const properties = [
    // --- DUISBURG ---
    { 
        id: 1, 
        city: 'Duisburg', 
        address: 'Turmstr. 36, Duisburg', 
        tasks: ['Tonnen', 'Putzen'], 
        binDay: 'Dienstag', 
        cleanDay: 'Montag', 
        icsUrl: `https://api.abfall.io/?key=80acad6c77fe9342ebafad29a8c58bf6&mode=export&idhousenumber=47629&wastetypes=18,127,27&timeperiod=${currentYear}0101-${currentYear}1231&showinactive=false&type=ics` 
    },
    { 
        id: 2, 
        city: 'Duisburg', 
        address: 'Turmstr. 38, Duisburg', 
        tasks: ['Tonnen'], 
        binDay: 'Dienstag', 
        cleanDay: '', 
        icsUrl: `https://api.abfall.io/?key=80acad6c77fe9342ebafad29a8c58bf6&mode=export&idhousenumber=47631&wastetypes=18,1075,127&timeperiod=${currentYear}0101-${currentYear}1231&showinactive=false&type=ics` 
    },
    { 
        id: 3, 
        city: 'Duisburg', 
        address: 'Krummenhakstr. 36, Duisburg', 
        tasks: ['Tonnen', 'Putzen'], 
        binDay: 'Mittwoch', 
        cleanDay: 'Dienstag', 
        icsUrl: `https://api.abfall.io/?key=80acad6c77fe9342ebafad29a8c58bf6&mode=export&idhousenumber=35330&wastetypes=18,127&timeperiod=${currentYear}0101-${currentYear}1231&showinactive=false&type=ics` 
    },

    // --- ESSEN ---
    { 
        id: 4, 
        city: 'Essen', 
        address: 'Pferdemarkt 10, Essen', 
        tasks: ['Tonnen'], 
        binDay: 'Donnerstag', 
        cleanDay: '', 
        icsUrl: `https://api.abfall.io/?key=51be67f3758f1fb57b420efe065c0663&mode=export&idhousenumber=78450&wastetypes=51,66,177&timeperiod=${currentYear}0101-${currentYear}1231&showinactive=false&type=ics` 
    },
    { 
        id: 5, 
        city: 'Essen', 
        address: 'Kreuzeskirchstr. 8, Essen', 
        tasks: ['Tonnen', 'Putzen'], 
        binDay: 'Freitag', 
        cleanDay: 'Donnerstag', 
        icsUrl: `https://api.abfall.io/?key=51be67f3758f1fb57b420efe065c0663&mode=export&idhousenumber=3382&wastetypes=66,1582&timeperiod=${currentYear}0101-${currentYear}1231&showinactive=false&type=ics` 
    },
    { 
        id: 6, 
        city: 'Essen', 
        address: 'Gerlingstr. 41, Essen', 
        tasks: ['Tonnen'], 
        binDay: 'Montag', 
        cleanDay: '', 
        icsUrl: `https://api.abfall.io/?key=51be67f3758f1fb57b420efe065c0663&mode=export&idhousenumber=69956&wastetypes=66,177&timeperiod=${currentYear}0101-${currentYear}1231&showinactive=false&type=ics` 
    },

    // --- OBERHAUSEN ---
    { 
        id: 7, 
        city: 'Oberhausen', 
        address: 'Linsingenstr. 2, Oberhausen', 
        tasks: ['Tonnen', 'Putzen'], 
        binDay: 'Freitag', 
        cleanDay: 'Mittwoch', 
        icsUrl: `https://abfallkalender.regioit.de/kalender-oberhausen/downloadfile.jsp?format=ics&jahr=${currentYear}&ort=Oberhausen&strStatic=T2JlcmhhdXNlbmRlZmF1bHRMaW5zaW5nZW5zdHJh32U%3D&hnrStatic=T2JlcmhhdXNlbjQ2MDQ1TGluc2luZ2Vuc3RyYd9lMg%3D%3D&zeit=-%3A00%3A00&fraktion=0&fraktion=5&fraktion=6&fraktion=7&fraktion=10&fraktion=11` 
    }
];

async function fetchAndParseData() {
    console.log(`Starte Live-Abruf für ${currentYear} (${properties.length} Immobilien)...`);
    const outputData = [];

    for (const prop of properties) {
        console.log(`Lade: ${prop.address}`);
        let calendarEvents = [];

        try {
            const res = await globalThis.fetch(prop.icsUrl, {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
                    'Accept': 'text/calendar, application/octet-stream, text/plain, */*'
                }
            });

            if (res.ok) {
                const text = await res.text();
                console.log(`  -> Antwort erhalten (${text.length} Zeichen). VCALENDAR: ${text.includes('BEGIN:VCALENDAR')}`);
                
                if (text.includes('BEGIN:VCALENDAR')) {
                    const events = ical.sync.parseICS(text);
                    for (const key in events) {
                        const event = events[key];
                        if (event.type === 'VEVENT') {
                            let summaryText = typeof event.summary === 'string' ? event.summary : (event.summary?.val || 'Abfalltermin');
                            let eventDate = event.start ? new Date(event.start).toISOString().split('T')[0] : '';
                            if (eventDate) {
                                calendarEvents.push({ title: summaryText, date: eventDate });
                            }
                        }
                    }
                    console.log(`  -> Erfolgreich geparst: ${calendarEvents.length} Termine gefunden.`);
                }
            } else {
                console.error(`  -> HTTP-Fehler: ${res.status} ${res.statusText}`);
            }
        } catch (e) {
            console.error(`  -> Fehler beim Abruf: ${e.message}`);
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
    console.log("data.json erfolgreich für alle Immobilien aktualisiert!");
}

fetchAndParseData();
