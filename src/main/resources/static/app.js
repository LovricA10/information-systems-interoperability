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
        localStorage.setItem('userRole', userRole);
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

    const parser = new DOMParser();
    const soapDoc = parser.parseFromString(text, 'text/xml');
    const returnEl = soapDoc.getElementsByTagName('return')[0];
    const resultDiv = document.getElementById('soapResult');

    if (!returnEl) {
        resultDiv.innerHTML = '<p style="color:var(--muted);margin:1rem 0;">Greška: neispravan odgovor servisa.</p>';
        return;
    }

    const innerXml = returnEl.textContent.replace(/<\?xml[^?]*\?>/g, '');
    const innerDoc = parser.parseFromString(innerXml, 'text/xml');
    const count = parseInt(innerDoc.getElementsByTagName('count')[0]?.textContent || '0');
    const kw = innerDoc.getElementsByTagName('keyword')[0]?.textContent || keyword;

    if (count === 0) {
        resultDiv.innerHTML = '<p style="color:var(--muted);margin:1rem 0;">Nema rezultata za traženi pojam.</p>';
        return;
    }

    resultDiv.innerHTML = `<p style="margin-bottom:1rem;color:var(--muted);">Pronađeno <strong style="color:var(--white);">${count}</strong> rezultata za: '<strong style="color:var(--accent);">${kw}</strong>'</p>`;
    const pre = document.createElement('pre');
    pre.textContent = formatXml(innerXml);
    resultDiv.appendChild(pre);
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
    if (name === 'graphql') gqlInitTab();
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

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 320);
    }, 3000);
}

let gqlCache = {};
let gqlBusy = false;

async function gqlQuery(query, variables = {}) {
    const res = await authFetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables })
    });
    const data = await res.json();
    if (data.errors && data.errors.length) throw new Error(data.errors[0].message);
    return data.data;
}

function gqlSetLoading(on) {
    document.getElementById('gql-loading').classList.toggle('hidden', !on);
    if (on) document.getElementById('gql-table').style.display = 'none';
}

async function gqlLoadTickets() {
    if (gqlBusy) return;
    gqlBusy = true;
    gqlSetLoading(true);
    document.getElementById('gql-empty').classList.add('hidden');
    try {
        const data = await gqlQuery(`{ tickets { id subject description status priority requesterEmail } }`);
        const tickets = data.tickets || [];
        gqlCache = {};
        tickets.forEach(t => { gqlCache[t.id] = t; });
        renderGqlTickets(tickets);
    } catch (e) {
        showToast('Greška pri učitavanju: ' + e.message, 'error');
        document.getElementById('gql-table').style.display = 'none';
    } finally {
        gqlSetLoading(false);
        gqlBusy = false;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderGqlTickets(tickets) {
    const table = document.getElementById('gql-table');
    const tbody = document.getElementById('gql-tickets-body');
    const empty = document.getElementById('gql-empty');
    const actionsCol = document.getElementById('gql-actions-col');
    const isAdmin = userRole === 'FULL_ACCESS';

    actionsCol.classList.toggle('hidden', !isAdmin);

    if (!tickets.length) {
        empty.classList.remove('hidden');
        table.style.display = 'none';
        tbody.innerHTML = '';
        return;
    }

    table.style.display = '';
    empty.classList.add('hidden');

    tbody.innerHTML = tickets.map(t => `
        <tr>
            <td>${t.id}</td>
            <td>${escapeHtml(t.subject)}</td>
            <td><span class="badge ${t.status}">${t.status}</span></td>
            <td>${t.priority}</td>
            <td>${escapeHtml(t.requesterEmail)}</td>
            <td>
                ${isAdmin ? `<div class="row-actions">
                    <button class="btn-edit" onclick="gqlOpenEdit('${t.id}')">Uredi</button>
                    ${t.status !== 'solved' ? `<button class="btn-success" onclick="gqlMarkSolved('${t.id}')">Riješeno</button>` : ''}
                    <button class="btn-danger" onclick="gqlDeleteTicket('${t.id}')">Obriši</button>
                </div>` : ''}
            </td>
        </tr>
    `).join('');
}

async function gqlCreateTicket() {
    const subject       = document.getElementById('gql-subject').value.trim();
    const description   = document.getElementById('gql-description').value.trim();
    const status        = document.getElementById('gql-status').value;
    const priority      = document.getElementById('gql-priority').value;
    const requesterEmail = document.getElementById('gql-email').value.trim();
    const msg           = document.getElementById('gql-create-msg');

    if (!subject || !description || !requesterEmail) {
        msg.className = 'error';
        msg.textContent = 'Naslov, opis i email su obavezni.';
        return;
    }

    const btn = document.getElementById('gql-create-btn');
    btn.disabled = true;
    btn.textContent = 'Kreiranje...';
    msg.textContent = '';

    try {
        await gqlQuery(
            `mutation Create($subject:String!,$description:String!,$status:String!,$priority:String!,$requesterEmail:String!){
                createTicket(subject:$subject,description:$description,status:$status,priority:$priority,requesterEmail:$requesterEmail){ id }
            }`,
            { subject, description, status, priority, requesterEmail }
        );
        document.getElementById('gql-subject').value = '';
        document.getElementById('gql-description').value = '';
        document.getElementById('gql-email').value = '';
        document.getElementById('gql-status').value = 'open';
        document.getElementById('gql-priority').value = 'normal';
        msg.textContent = '';
        showToast('Tiket uspješno kreiran!');
        await gqlLoadTickets();
    } catch (e) {
        msg.className = 'error';
        msg.textContent = 'Greška: ' + e.message;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Kreiraj tiket';
    }
}

function gqlOpenEdit(id) {
    const t = gqlCache[id];
    if (!t) return;
    document.getElementById('gql-edit-id').value = id;
    document.getElementById('gql-edit-subject').value = t.subject;
    document.getElementById('gql-edit-description').value = t.description || '';
    document.getElementById('gql-edit-status').value = t.status;
    document.getElementById('gql-edit-priority').value = t.priority;
    document.getElementById('gql-edit-email').value = t.requesterEmail;
    document.getElementById('gql-edit-msg').textContent = '';
    document.getElementById('gqlEditModal').classList.remove('hidden');
}

function gqlCloseEdit() {
    document.getElementById('gqlEditModal').classList.add('hidden');
}

async function gqlSaveEdit() {
    const id             = document.getElementById('gql-edit-id').value;
    const subject        = document.getElementById('gql-edit-subject').value.trim();
    const description    = document.getElementById('gql-edit-description').value.trim();
    const status         = document.getElementById('gql-edit-status').value;
    const priority       = document.getElementById('gql-edit-priority').value;
    const requesterEmail = document.getElementById('gql-edit-email').value.trim();
    const msg            = document.getElementById('gql-edit-msg');

    if (!subject || !description || !requesterEmail) {
        msg.className = 'error';
        msg.textContent = 'Naslov, opis i email su obavezni.';
        return;
    }

    const btn = document.getElementById('gql-save-btn');
    btn.disabled = true;
    btn.textContent = 'Spremanje...';

    try {
        await gqlQuery(
            `mutation Update($id:ID!,$subject:String!,$description:String!,$status:String!,$priority:String!,$requesterEmail:String!){
                updateTicket(id:$id,subject:$subject,description:$description,status:$status,priority:$priority,requesterEmail:$requesterEmail){ id }
            }`,
            { id, subject, description, status, priority, requesterEmail }
        );
        showToast('Tiket uspješno ažuriran!');
        gqlCloseEdit();
        await gqlLoadTickets();
    } catch (e) {
        msg.className = 'error';
        msg.textContent = 'Greška: ' + e.message;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Spremi';
    }
}

async function gqlMarkSolved(id) {
    const t = gqlCache[id];
    if (!t) return;
    try {
        await gqlQuery(
            `mutation Update($id:ID!,$subject:String!,$description:String!,$status:String!,$priority:String!,$requesterEmail:String!){
                updateTicket(id:$id,subject:$subject,description:$description,status:$status,priority:$priority,requesterEmail:$requesterEmail){ id }
            }`,
            { id, subject: t.subject, description: t.description || '', status: 'solved', priority: t.priority, requesterEmail: t.requesterEmail }
        );
        showToast('Tiket označen kao riješen!');
        await gqlLoadTickets();
    } catch (e) {
        showToast('Greška: ' + e.message, 'error');
    }
}

async function gqlDeleteTicket(id) {
    if (!confirm(`Jeste li sigurni da želite obrisati tiket #${id}?`)) return;
    try {
        await gqlQuery(`mutation Delete($id:ID!){ deleteTicket(id:$id) }`, { id });
        showToast('Tiket obrisan.');
        await gqlLoadTickets();
    } catch (e) {
        showToast('Greška pri brisanju: ' + e.message, 'error');
    }
}

let gqlInited = false;
function gqlInitTab() {
    if (userRole === 'FULL_ACCESS') {
        document.getElementById('gql-create-card').classList.remove('hidden');
    }
    gqlLoadTickets();
}


function gqlShowSubtab(name, event) {
    document.querySelectorAll('#tab-graphql .gql-panel').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.gql-subtab').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('gql-panel-' + name).classList.remove('hidden');
    if (name === 'all') gqlUpdateAllPreview();
    if (name === 'byid') gqlUpdateByIdPreview();
}

function gqlBuildFields(prefix) {
    return [
        { id: `${prefix}-id`,          gql: 'id' },
        { id: `${prefix}-subject`,     gql: 'subject' },
        { id: `${prefix}-status`,      gql: 'status' },
        { id: `${prefix}-priority`,    gql: 'priority' },
        { id: `${prefix}-description`, gql: 'description' },
        { id: `${prefix}-email`,       gql: 'requesterEmail' }
    ].filter(f => document.getElementById(f.id)?.checked).map(f => f.gql).join(' ');
}

function gqlUpdateAllPreview() {
    const fields = gqlBuildFields('gqlf');
    document.getElementById('gql-all-preview').textContent =
        fields ? `{ tickets { ${fields} } }` : '(odaberite barem jedno polje)';
}

function gqlUpdateByIdPreview() {
    const id = document.getElementById('gql-byid-input').value.trim() || '?';
    const fields = gqlBuildFields('gqlf-byid');
    document.getElementById('gql-byid-preview').textContent =
        fields ? `{ ticket(id: ${id}) { ${fields} } }` : '(odaberite barem jedno polje)';
}

function gqlHighlightJson(json) {
    const safe = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return safe.replace(
        /("(?:\\u[\dA-Fa-f]{4}|\\[^u]|[^\\"])*"(\s*:)?|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
        match => {
            if (/^"/.test(match))
                return /:$/.test(match)
                    ? `<span class="json-key">${match}</span>`
                    : `<span class="json-str">${match}</span>`;
            if (match === 'true' || match === 'false') return `<span class="json-bool">${match}</span>`;
            if (match === 'null') return `<span class="json-null">${match}</span>`;
            return `<span class="json-num">${match}</span>`;
        }
    );
}

function gqlShowCodeResult(preId, data) {
    document.getElementById(preId).innerHTML = gqlHighlightJson(JSON.stringify(data, null, 2));
}

function gqlShowCodeError(preId, message) {
    document.getElementById(preId).innerHTML = `<span class="json-str">"Error: ${escapeHtml(message)}"</span>`;
}

async function gqlRunAll() {
    const fields = gqlBuildFields('gqlf');
    if (!fields) { showToast('Odaberite barem jedno polje.', 'error'); return; }
    const el = document.getElementById('gql-all-result');
    el.textContent = 'Učitavanje...';
    try {
        const data = await gqlQuery(`{ tickets { ${fields} } }`);
        gqlShowCodeResult('gql-all-result', data);
    } catch (e) {
        gqlShowCodeError('gql-all-result', e.message);
    }
}

async function gqlRunById() {
    const id = document.getElementById('gql-byid-input').value.trim();
    if (!id) { showToast('Unesite ID tiketa.', 'error'); return; }
    const fields = gqlBuildFields('gqlf-byid');
    if (!fields) { showToast('Odaberite barem jedno polje.', 'error'); return; }
    const el = document.getElementById('gql-byid-result');
    el.textContent = 'Učitavanje...';
    try {
        const data = await gqlQuery(`{ ticket(id: ${id}) { ${fields} } }`);
        gqlShowCodeResult('gql-byid-result', data);
    } catch (e) {
        gqlShowCodeError('gql-byid-result', e.message);
    }
}

async function gqlRunAdd() {
    const subject        = document.getElementById('gql-add-subject').value.trim();
    const description    = document.getElementById('gql-add-description').value.trim();
    const status         = document.getElementById('gql-add-status').value;
    const priority       = document.getElementById('gql-add-priority').value;
    const requesterEmail = document.getElementById('gql-add-email').value.trim();

    if (!subject || !description || !requesterEmail) {
        showToast('Naslov, opis i email su obavezni.', 'error');
        return;
    }

    const btn = document.getElementById('gql-add-btn');
    btn.disabled = true;
    document.getElementById('gql-add-result').textContent = 'Kreiranje...';

    try {
        const data = await gqlQuery(
            `mutation Create($subject:String!,$description:String!,$status:String!,$priority:String!,$requesterEmail:String!){
                createTicket(subject:$subject,description:$description,status:$status,priority:$priority,requesterEmail:$requesterEmail){ id subject status priority requesterEmail }
            }`,
            { subject, description, status, priority, requesterEmail }
        );
        gqlShowCodeResult('gql-add-result', data);
        showToast('Tiket uspješno kreiran!');
    } catch (e) {
        gqlShowCodeError('gql-add-result', e.message);
    } finally {
        btn.disabled = false;
    }
}

async function gqlRunUpdate() {
    const id             = document.getElementById('gql-upd-id').value.trim();
    const subject        = document.getElementById('gql-upd-subject').value.trim();
    const description    = document.getElementById('gql-upd-description').value.trim();
    const status         = document.getElementById('gql-upd-status').value;
    const priority       = document.getElementById('gql-upd-priority').value;
    const requesterEmail = document.getElementById('gql-upd-email').value.trim();

    if (!id) { showToast('Unesite ID tiketa.', 'error'); return; }
    if (!subject || !description || !requesterEmail) {
        showToast('Naslov, opis i email su obavezni.', 'error');
        return;
    }

    const btn = document.getElementById('gql-upd-btn');
    btn.disabled = true;
    document.getElementById('gql-upd-result').textContent = 'Ažuriranje...';

    try {
        const data = await gqlQuery(
            `mutation Update($id:ID!,$subject:String!,$description:String!,$status:String!,$priority:String!,$requesterEmail:String!){
                updateTicket(id:$id,subject:$subject,description:$description,status:$status,priority:$priority,requesterEmail:$requesterEmail){ id subject status priority requesterEmail }
            }`,
            { id, subject, description, status, priority, requesterEmail }
        );
        gqlShowCodeResult('gql-upd-result', data);
        showToast('Tiket uspješno ažuriran!');
    } catch (e) {
        gqlShowCodeError('gql-upd-result', e.message);
    } finally {
        btn.disabled = false;
    }
}

async function gqlRunDelete() {
    const id = document.getElementById('gql-del-id').value.trim();
    if (!id) { showToast('Unesite ID tiketa.', 'error'); return; }
    if (!confirm(`Jeste li sigurni da želite obrisati tiket #${id}?`)) return;

    const btn = document.getElementById('gql-del-btn');
    btn.disabled = true;
    document.getElementById('gql-del-result').textContent = 'Brisanje...';

    try {
        const data = await gqlQuery(`mutation Delete($id:ID!){ deleteTicket(id:$id) }`, { id });
        gqlShowCodeResult('gql-del-result', data);
        showToast('Tiket obrisan.');
    } catch (e) {
        gqlShowCodeError('gql-del-result', e.message);
    } finally {
        btn.disabled = false;
    }
}

async function handleRefreshToken() {
    const ok = await refreshAccessToken();
    if (ok) showToast('Token refreshed!');
}