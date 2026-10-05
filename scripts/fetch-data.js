const fs = require('fs');
const { execSync } = require('child_process');
const ical = require('node-ical');

const currentYear = new Date().getFullYear();

const properties = [
    // --- DUISBURG ---
    { id: 1, city: 'Duisburg', address: 'Turmstr. 36, 47119 Duisburg', tasks: ['Tonnen', 'Putzen'], binDay: 'Dienstag', cleanDay: 'Montag', icsUrl: 'https://ical.abfallplus.de/?icsdownload=4546-8c166460ba61e3d580099b718649f4b5.ics&c=1&d=0' },
    { id: 2, city: 'Duisburg', address: 'Turmstr. 38, 47119 Duisburg', tasks: ['Tonnen'], binDay: 'Dienstag', cleanDay: '', icsUrl: 'https://ical.abfallplus.de/?icsdownload=4546-7e14ab1c4f86434d9b8226e46c18daeb.ics&c=1&d=0' },
    { id: 3, city: 'Duisburg', address: 'Krummenhakstr. 36, Duisburg', tasks: ['Tonnen', 'Putzen'], binDay: 'Mittwoch', cleanDay: 'Dienstag', icsUrl: 'https://ical.abfallplus.de/?icsdownload=4546-e00afeba1db151d0f5198900451ef641.ics&c=1&d=0' },

    // --- ESSEN ---
    { id: 4, city: 'Essen', address: 'Pferdemarkt 10, Essen', tasks: ['Tonnen'], binDay: 'Donnerstag', cleanDay: '', icsUrl: 'https://ical.abfallplus.de/?icsdownload=5843-1609b31c11151d4f18ff6cef7f014a6e.ics&c=1&d=0' },
    { id: 5, city: 'Essen', address: 'Kreuzeskirchstr. 8, Essen', tasks: ['Tonnen', 'Putzen'], binDay: 'Freitag', cleanDay: 'Donnerstag', icsUrl: 'https://ical.abfallplus.de/?icsdownload=5843-ee8ea8013be00d2ba8750dd890b0369d.ics&c=1&d=0' },
    { id: 6, city: 'Essen', address: 'Gerlingstr. 41, Essen', tasks: ['Tonnen'], binDay: 'Montag', cleanDay: '', icsUrl: 'https://ical.abfallplus.de/?icsdownload=5843-d69c567e5165d5b703d869a79c9b1f44.ics&c=1&d=0' },

    // --- OBERHAUSEN ---
    { id: 7, city: 'Oberhausen', address: 'Linsingenstr. 2, Oberhausen', tasks: ['Tonnen', 'Putzen'], binDay: 'Freitag', cleanDay: 'Mittwoch', icsUrl: `https://abfallkalender.regioit.de/kalender-oberhausen/downloadfile.jsp?format=ics&jahr=${currentYear}&ort=Oberhausen&strStatic=T2JlcmhhdXNlbmRlZmF1bHRMaW5zaW5nZW5zdHJh32U%3D&hnrStatic=T2JlcmhhdXNlbjQ2MDQ1TGluc2luZ2Vuc3RyYd9lMg%3D%3D&zeit=-%3A00%3A00&fraktion=0&fraktion=5&fraktion=6&fraktion=7&fraktion=10&fraktion=11` }
];

async function fetchAndParseData() {
    console.log("Starte Abruf der Abfallkalender...");
    const outputData = [];

    for (const prop of properties) {
        try {
            console.log(`Lade Kalender für: ${prop.address}`);
            
            // Curl mit maximaler Browser-Mimetik
            const cmd = `curl -sL -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" -H "Accept: text/calendar,text/plain,*/*" "${prop.icsUrl}"`;
            const rawData = execSync(cmd, { encoding: 'utf-8', timeout: 10000 });

            if (!rawData || !rawData.includes('BEGIN:VCALENDAR')) {
                console.error(`  [FEHLER] Antwort von Server ist kein ICS-Kalender für ${prop.address}. Vorschau:`, rawData.slice(0, 150));
                outputData.push({ ...prop, calendarEvents: [] });
                continue;
            }

            const events = ical.sync.parseICS(rawData);
            const upcomingEvents = [];

            for (const key in events) {
                const event = events[key];
                if (event.type === 'VEVENT') {
                    let summaryText = typeof event.summary === 'string' ? event.summary : (event.summary?.val || 'Abfalltermin');
                    let eventDate = event.start ? new Date(event.start).toISOString().split('T')[0] : '';
                    if (eventDate) upcomingEvents.push({ title: summaryText, date: eventDate });
                }
            }

            console.log(`  -> Erfolgreich: ${upcomingEvents.length} Termine.`);
            outputData.push({ ...prop, calendarEvents: upcomingEvents });

        } catch (error) {
            console.error(`  [EXCEPT] Fehler bei ${prop.address}:`, error.message);
            outputData.push({ ...prop, calendarEvents: [] });
        }
    }

    fs.writeFileSync('data.json', JSON.stringify(outputData, null, 2));
    console.log("data.json aktualisiert!");
}

fetchAndParseData();
