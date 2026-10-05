const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const ical = require('node-ical');

// Stealth-Plugin aktivieren, um Bot-Erkennung zu umgehen
puppeteer.use(StealthPlugin());

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

async function fetchWithStealthBrowser(browser, url) {
    try {
        const page = await browser.newPage();
        
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');

        const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 35000 });
        const content = await response.text();
        await page.close();

        return content.includes('BEGIN:VCALENDAR') ? content : null;
    } catch (e) {
        console.error(`Stealth-Browser Fehler für ${url}:`, e.message);
        return null;
    }
}

async function fetchAndParseData() {
    console.log("Starte Abruf mit Puppeteer Stealth...");
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
        ]
    });

    const outputData = [];

    for (const prop of properties) {
        console.log(`Lade Daten für: ${prop.address}`);
        
        let targetUrl = prop.icsUrl;
        if (targetUrl.includes('abfallplus.de') && targetUrl.includes('?icsdownload=')) {
            targetUrl = targetUrl.replace('?icsdownload=', '?ics=');
        }

        const rawData = await fetchWithStealthBrowser(browser, targetUrl);
        const upcomingEvents = [];

        if (rawData) {
            try {
                const events = ical.sync.parseICS(rawData);
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
                console.log(`  -> Erfolgreich: ${upcomingEvents.length} Termine extrahiert.`);
            } catch (parseErr) {
                console.error(`  -> Fehler beim Parsen von ICS:`, parseErr.message);
            }
        } else {
            console.warn(`  -> Keine gültigen ICS-Daten empfangen.`);
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
