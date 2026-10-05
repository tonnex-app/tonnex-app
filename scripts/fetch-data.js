const fs = require('fs');
const puppeteer = require('puppeteer');
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

async function fetchWithBrowser(browser, url) {
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        
        const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        const content = await response.text();
        await page.close();
        
        return content.includes('BEGIN:VCALENDAR') ? content : null;
    } catch (e) {
        console.error(`Browser-Download fehlgeschlagen: ${e.message}`);
        return null;
    }
}

async function fetchAndParseData() {
    console.log("Starte Abruf mit Puppeteer...");
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const outputData = [];

    for (const prop of properties) {
        console.log(`Lade Daten für: ${prop.address}`);
        
        // Bei AbfallPlus den Feed-Link verwenden
        let targetUrl = prop.icsUrl;
        if (targetUrl.includes('abfallplus.de') && targetUrl.includes('?icsdownload=')) {
            targetUrl = targetUrl.replace('?icsdownload=', '?ics=');
        }

        const rawData = await fetchWithBrowser(browser, targetUrl);
        const upcomingEvents = [];

        if (rawData) {
            const events = ical.sync.parseICS(rawData);
            for (const key in events) {
                const event = events[key];
                if (event.type === 'VEVENT') {
                    let summaryText = typeof event.summary === 'string' ? event.summary : (event.summary?.val || 'Abfalltermin');
                    let eventDate = event.start ? new Date(event.start).toISOString().split('T')[0] : '';
                    if (eventDate) upcomingEvents.push({ title: summaryText, date: eventDate });
                }
            }
            console.log(`  -> Extrahiert: ${upcomingEvents.length} Termine.`);
        } else {
            console.warn(`  -> Keine Termine empfangen.`);
        }

        outputData.push({
            id: prop.id,
            city: prop.city,
            address: prop.address,
            tasks: prop.tasks,
            binDay: prop.binDay,
            cleanDay: prop.cleanDay,
            icsUrl: prop.icsUrl,
            calendarEvents: upcomingEvents
        });
    }

    await browser.close();
    fs.writeFileSync('data.json', JSON.stringify(outputData, null, 2));
    console.log("data.json erfolgreich generiert!");
}

fetchAndParseData();
