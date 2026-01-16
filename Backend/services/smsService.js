import dotenv from 'dotenv';

dotenv.config();

const VERIFYWAY_API_KEY = process.env.VERIFYWAY_API_KEY;

async function getFetch() {
    if (typeof fetch !== 'undefined') return fetch;
    const mod = await import('node-fetch');
    return mod.default;
}

export function generateCode(length = 6) {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

function normalizeRecipient(phone) {
    if (!phone) return phone;
    let p = String(phone).trim();
    if (p.startsWith('00')) p = '+' + p.slice(2);
    if (!p.startsWith('+') && /^\d+$/.test(p)) {
        p = '+' + p;
    }
    return p;
}

async function sendViaVerifyWay(to, code, { channel, lang, fallback } = {}) {
    const recipient = normalizeRecipient(to);
    if (!VERIFYWAY_API_KEY) {
        console.log(`[DEV VerifyWay] to:${recipient} code:${code} channel:${channel} lang:${lang} fallback:${fallback}`);
        return { status: 'success', message_id: 'dev-verifyway', recipient, code };
    }
    const fetchFn = await getFetch();
    const payload = {
        recipient,
        type: 'otp',
        code,
        channel: 'whatsapp',
        fallback: 'no',
        lang: 'en',
    };
    const res = await fetchFn('https://api.verifyway.com/api/v1/', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${VERIFYWAY_API_KEY}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
        const detail = data.error || `HTTP ${res.status}`;
        throw new Error(`VerifyWay error: ${detail}`);
    }
    return data;
}

export async function sendVerificationCode(to, code, purpose = 'Verification', options = {}) {
    return sendViaVerifyWay(to, code, options);
}
