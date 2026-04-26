const API = window.location.origin;
let token = null;
let userRole = localStorage.getItem('userRole');
let currentFormat = 'json';
let ticketsCache = {};

async function register() {
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;
    const msg = document.getElementById('regMsg');
    try {
        const res = await fetch(`${API}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        msg.className = 'success';
        msg.textContent = 'Korisnik kreiran! Možeš se prijaviti.';
    } catch (e) {
        msg.className = 'error';
        msg.textContent = e.message;
    }
}

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    try {
        const res = await fetch(`${API}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        token = data.accessToken;
        userRole = data.role;
        localStorage.setItem('userRole', userRole); // samo rola, ne token
        showApp();
    } catch (e) {
        document.getElementById('loginError').textContent = e.message;
    }
}

async function logout() {
    await fetch(`${API}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
    });
    token = null;
    localStorage.clear();
    location.reload();
}

async function refreshAccessToken() {
    try {
        const res = await fetch(`${API}/api/auth/refresh`, {
            method: 'POST',
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Refresh failed');
        const data = await res.json();
        token = data.accessToken;
        return true;
    } catch (e) {
        token = null;
        localStorage.clear();
        location.reload();
        return false;
    }
}

function showApp() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('appSection').classList.remove('hidden');
    document.getElementById('userInfo').textContent = userRole;
    if (userRole === 'FULL_ACCESS') {
        document.getElementById('createForm').classList.remove('hidden');
        document.getElementById('actionsHeader').classList.remove('hidden');
    }
    loadTickets();
}

async function loadTickets() {
    const res = await authFetch('/api/tickets');
    const tickets = await res.json();
    ticketsCache = {};
    tickets.forEach(t => { ticketsCache[t.id] = t; });
    document.getElementById('ticketsTable').innerHTML = tickets.map(t => `
        <tr>
            <td>${t.id}</td>
            <td>${t.subject}</td>
            <td>${t.status}</td>
            <td>${t.priority}</td>
            <td>${t.requesterEmail}</td>
            ${userRole === 'FULL_ACCESS'
        ? `<td><div class="row-actions">
                <button class="btn-edit" onclick="openEditModal(${t.id})">Uredi</button>
                <button class="btn-danger" onclick="deleteTicket(${t.id})">Obriši</button>
            </div></td>`
        : '<td></td>'}
        </tr>
    `).join('');
}

function openEditModal(id) {
    const t = ticketsCache[id];
    if (!t) return;
    document.getElementById('editTicketId').value = id;
    document.getElementById('editSubject').value = t.subject;
    document.getElementById('editDescription').value = t.description || '';
    document.getElementById('editStatus').value = t.status;
    document.getElementById('editPriority').value = t.priority;
    document.getElementById('editRequesterEmail').value = t.requesterEmail;
    document.getElementById('editMsg').textContent = '';
    document.getElementById('editMsg').className = '';
    document.getElementById('editModal').classList.remove('hidden');
}

function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
}

async function updateTicket() {
    const id = document.getElementById('editTicketId').value;
    const body = {
        subject: document.getElementById('editSubject').value,
        description: document.getElementById('editDescription').value,
        status: document.getElementById('editStatus').value,
        priority: document.getElementById('editPriority').value,
        requesterEmail: document.getElementById('editRequesterEmail').value
    };
    const res = await authFetch(`/api/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const msg = document.getElementById('editMsg');
    if (res.ok) {
        msg.className = 'success';
        msg.textContent = 'Tiket uspješno ažuriran!';
        loadTickets();
        setTimeout(closeEditModal, 900);
    } else {
        const err = await res.json().catch(() => ({ error: 'Greška pri ažuriranju' }));
        msg.className = 'error';
        msg.textContent = err.error || 'Greška pri ažuriranju';
    }
}

function setFormat(format, event) {
    currentFormat = format;
    document.querySelectorAll('#createForm .tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
}

async function createTicket() {
    const content = document.getElementById('ticketInput').value;
    const isXml = currentFormat === 'xml';
    const res = await authFetch(isXml ? '/api/tickets/xml' : '/api/tickets/json', {
        method: 'POST',
        headers: { 'Content-Type': isXml ? 'application/xml' : 'application/json' },
        body: content
    });
    const msg = document.getElementById('createMsg');
    if (res.ok) {
        msg.className = 'success';
        msg.textContent = 'Tiket uspješno kreiran!';
        loadTickets();
    } else {
        const err = await res.json();
        msg.className = 'error';
        msg.textContent = err.error;
    }
}

async function deleteTicket(id) {
    if (!confirm('Jeste li sigurni?')) return;
    await authFetch(`/api/tickets/${id}`, { method: 'DELETE' });
    loadTickets();
}

async function getWeather() {
    const city = document.getElementById('cityInput').value;
    const res = await authFetch(`/api/weather/${city}`);
    const data = await res.json();
    document.getElementById('weatherResult').innerHTML = data.length
        ? data.map(d => `<p><strong>${d.city}</strong>: ${d.temperature}, vlaga: ${d.humidity}</p>`).join('')
        : '<p>Grad nije pronađen</p>';
}

function formatXml(xml) {
    const INDENT = '  ';
    let depth = 0;
    let result = '';
    const lines = xml
        .replace(/>\s*</g, '>\n<')
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);
    lines.forEach(line => {
        const isClosing   = line.startsWith('</');
        const isSelfClose = /\/>$/.test(line) || /^<[^>]+\/>$/.test(line);
        const isDecl      = line.startsWith('<?') || line.startsWith('<!--');
        const isOpening   = line.startsWith('<') && !isClosing && !isSelfClose && !isDecl;
        const hasInline   = isOpening && line.includes('</', line.indexOf('>') + 1);
        if (isClosing) depth = Math.max(0, depth - 1);
        result += INDENT.repeat(depth) + line + '\n';
        if (isOpening && !hasInline) depth++;
    });
    return result.trim();
}

async function searchSoap() {
    const keyword = document.getElementById('soapKeyword').value;
    const soapBody = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://soap.iis.algebra.hr/">
        <soapenv:Header/>
        <soapenv:Body>
            <tns:searchTickets>
                <keyword>${keyword}</keyword>
            </tns:searchTickets>
        </soapenv:Body>
    </soapenv:Envelope>`;

    const res = await fetch(`${window.location.origin}/ws/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body: soapBody
    });
    const text = await res.text();
    document.getElementById('soapResult').textContent = formatXml(text);
}

async function runGraphQL() {
    const query = document.getElementById('graphqlQuery').value;
    const res = await authFetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
    });
    const data = await res.json();
    document.getElementById('graphqlResult').textContent = JSON.stringify(data, null, 2);
}

async function validateXml() {
    const res = await authFetch('/api/tickets/validate-xml');
    const data = await res.json();
    document.getElementById('validateResult').innerHTML = data.messages
        .map(m => `<li style="color:${m.includes('GREŠKA') ? 'red' : 'green'};padding:0.25rem 0">${m}</li>`)
        .join('');
}

async function getZendesk() {
    const res = await authFetch('/api/tickets/zendesk');
    const data = await res.json();
    document.getElementById('zendeskResult').textContent = JSON.stringify(data, null, 2);
}

function showTab(name, event) {
    document.querySelectorAll('[id^="tab-"]').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tabs > .tab').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${name}`).classList.remove('hidden');
    event.target.classList.add('active');
}

async function authFetch(path, options = {}) {
    let res = await fetch(`${API}${path}`, {
        ...options,
        credentials: 'include',
        headers: { ...options.headers, 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            res = await fetch(`${API}${path}`, {
                ...options,
                credentials: 'include',
                headers: { ...options.headers, 'Authorization': `Bearer ${token}` }
            });
        }
    }
    return res;
}

(async () => {
    if (userRole) {
        const refreshed = await refreshAccessToken();
        if (refreshed) showApp();
    }
})();