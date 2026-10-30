
const STORAGE_KEY = 'gestion_clients_fichiers_v1';
const $ = id => document.getElementById(id);

let records = [];
let currentReturnId = null;

// ==============================
// CHARGEMENT DES DONNÉES
// ==============================

try {
  records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  if (!Array.isArray(records)) records = [];
} catch {
  records = [];
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

$('sendDate').value = today();

// ==============================
// SAUVEGARDE
// ==============================

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    alert('Impossible de sauvegarder dans le navigateur. Exportez vos données en JSON.');
  }
}

// ==============================
// FONCTIONS UTILITAIRES
// ==============================

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
}

function dateDisplay(value) {
  if (!value) return '—';

  const p = String(value).split('-');

  return p.length === 3
    ? `${p[2]}/${p[1]}/${p[0]}`
    : value;
}

function statusName(status) {
  return ({
    pending: 'En attente',
    sent: 'Envoyé',
    returned: 'Retiré'
  })[status] || 'En attente';
}

// ==============================
// AFFICHAGE DU TABLEAU
// ==============================

function render() {
  $('total').textContent = records.length;

  $('active').textContent =
    records.filter(r => r.status !== 'returned').length;

  $('returnedCount').textContent =
    records.filter(r => r.status === 'returned').length;

  const query = $('search').value.trim().toLocaleLowerCase('fr');
  const filter = $('filter').value;

  const list = records.filter(r =>
    (filter === 'all' || r.status === filter) &&
    [r.client, r.phone, r.filename].some(value =>
      String(value || '').toLocaleLowerCase('fr').includes(query)
    )
  );

  $('rows').innerHTML = list.map(r => `
    <tr>
      <td><div class="clientname">${esc(r.client)}</div></td>
      <td>${esc(r.phone || '—')}</td>
      <td>${esc(r.filename)}</td>
      <td>${dateDisplay(r.sendDate)}</td>
      <td>${dateDisplay(r.returnDate)}</td>
      <td>
        <span class="badge ${esc(r.status)}">
          ${statusName(r.status)}
        </span>
      </td>
      <td>
        <div class="actions">

          <button class="secondary small"
            data-action="edit" data-id="${esc(r.id)}">
            Modifier
          </button>

          ${r.status !== 'returned' ? `
            <button class="retire small"
              data-action="return" data-id="${esc(r.id)}">
              Retrait
            </button>` : ''}

          <button class="danger small"
            data-action="delete" data-id="${esc(r.id)}">
            Supprimer
          </button>

        </div>
      </td>
    </tr>
  `).join('');

  $('empty').style.display = list.length ? 'none' : 'block';
  $('count').textContent = `${list.length} fichier(s) affiché(s)`;
}

// ==============================
// RÉINITIALISER LE FORMULAIRE
// ==============================

function resetForm() {
  $('fileForm').reset();
  $('editId').value = '';
  $('formTitle').textContent = 'Ajouter un fichier';
  $('submitBtn').textContent = '＋ Enregistrer le fichier';
  $('cancelEdit').hidden = true;
  $('sendDate').value = today();
  $('status').value = 'pending';
}

// ==============================
// AJOUTER OU MODIFIER UN FICHIER
// ==============================

$('fileForm').addEventListener('submit', event => {
  event.preventDefault();

  const id = $('editId').value;
  const status = $('status').value;
  const old = records.find(r => r.id === id);

  const item = {
    id: id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    client: $('client').value.trim(),
    phone: $('phone').value.trim(),
    filename: $('filename').value.trim(),
    sendDate: $('sendDate').value,
    returnDate: old?.returnDate || '',
    status: old?.status === 'returned' ? 'returned' : status
  };

  if (id) {
    records = records.map(r => r.id === id ? item : r);
  } else {
    records.unshift(item);
  }

  save();
  resetForm();
  render();
});

$('cancelEdit').addEventListener('click', resetForm);

// ==============================
// MODIFIER, RETIRER ET SUPPRIMER
// ==============================

$('rows').addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const record = records.find(r => r.id === button.dataset.id);
  if (!record) return;

  if (button.dataset.action === 'edit') {

    $('editId').value = record.id;
    $('client').value = record.client;
    $('phone').value = record.phone || '';
    $('filename').value = record.filename;
    $('sendDate').value = record.sendDate || '';
    $('status').value = record.status === 'sent' ? 'sent' : 'pending';

    $('formTitle').textContent = 'Modifier un fichier';
    $('submitBtn').textContent = 'Enregistrer les modifications';
    $('cancelEdit').hidden = false;

    $('client').focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });

  } else if (button.dataset.action === 'return') {

    openReturnModal(record);

  } else if (
    button.dataset.action === 'delete' &&
    confirm(`Supprimer le fichier « ${record.filename} » du client ${record.client} ?`)
  ) {

    records = records.filter(r => r.id !== record.id);
    save();
    render();
  }
});

// Recherche et filtre
$('search').addEventListener('input', render);
$('filter').addEventListener('change', render);

// ==============================
// TÉLÉCHARGEMENT DES FICHIERS
// ==============================

function download(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ==============================
// EXPORT JSON
// ==============================

$('backupBtn').addEventListener('click', () => {
  download(
    JSON.stringify(records, null, 2),
    'sauvegarde_fichiers.json',
    'application/json'
  );
});

// ==============================
// EXPORT EXCEL PROFESSIONNEL
// ==============================

$('excelBtn').addEventListener('click', async () => {
  try {
    if (typeof ExcelJS === 'undefined') {
      alert('ExcelJS ne fonctionne pas. Vérifiez votre connexion Internet.');
      return;
    }

    const workbook = new ExcelJS.Workbook();

    workbook.creator = 'Gestion des clients et fichiers';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Liste des clients');

    // PARAMÈTRES D'IMPRESSION A4
    worksheet.pageSetup = {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
            left: 0.25,
            right: 0.25,
            top: 0.40,
            bottom: 0.40,
            header: 0.15,
            footer: 0.15
        }
    };


    // Titre principal
    worksheet.mergeCells('A1:F1');

    const title = worksheet.getCell('A1');

    title.value = 'GESTION DES CLIENTS ET FICHIERS';

    title.font = {
      bold: true,
      size: 16,
      color: { argb: 'FFFFFFFF' }
    };

    title.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1565C0' }
    };

    title.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

    worksheet.getRow(1).height = 38;

    // En-têtes du tableau
    worksheet.addRow([
      'Client',
      'Téléphone',
      'Numéro de série / fichier',
      'Date envoi',
      'Date retrait',
      'Statut'
    ]);

    const header = worksheet.getRow(2);

    header.font = {
      bold: true,
      size: 11,
      color: { argb: 'FFFFFFFF' }
    };

    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0D47A1' }
    };

    header.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true
    };

    header.height = 32;

    // Ajouter les données
    records.forEach(r => {
      worksheet.addRow([
        r.client || '',
        r.phone || '',
        r.filename || '',
        dateDisplay(r.sendDate),
        dateDisplay(r.returnDate),
        statusName(r.status)
      ]);
    });

    // Largeur des colonnes
    worksheet.columns = [
      { width: 25 },
      { width: 20 },
      { width: 38 },
      { width: 20 },
      { width: 20 },
      { width: 18 }
    ];

    // Style des lignes
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 2) {
        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
          };

          cell.alignment = {
            horizontal: 'left',
            vertical: 'middle',
            wrapText: true
          };
        });
      }

      // Couleurs alternées
      if (rowNumber >= 3 && rowNumber % 2 === 1) {
        row.eachCell(cell => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF1F5F9' }
          };
        });
      }

      if (rowNumber >= 3) {
        row.height = 25;
      }
    });

    // Couleurs des statuts
    for (let i = 3; i <= worksheet.rowCount; i++) {
      const cell = worksheet.getCell(`F${i}`);

      if (cell.value === 'En attente') {
        cell.font = {
          bold: true,
          color: { argb: 'FFB45309' }
        };
      } else if (cell.value === 'Envoyé') {
        cell.font = {
          bold: true,
          color: { argb: 'FF1565C0' }
        };
      } else if (cell.value === 'Retiré') {
        cell.font = {
          bold: true,
          color: { argb: 'FF15803D' }
        };
      }
    }

    // Filtres et ligne d'en-tête figée
    worksheet.autoFilter = 'A2:F2';

    worksheet.views = [{
      state: 'frozen',
      ySplit: 2
    }];

    // Générer le fichier Excel
    const buffer = await workbook.xlsx.writeBuffer();

    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'gestion_clients.xlsx';

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

  } catch (error) {
    console.error('Erreur export Excel :', error);
    alert('Une erreur est survenue pendant la création du fichier Excel.');
  }
});

// ==============================
// IMPORT JSON
// ==============================

$('importBtn').addEventListener('click', () => {
  $('importFile').click();
});

$('importFile').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const data = JSON.parse(await file.text());

    const valid = Array.isArray(data) && data.every(r =>
      r &&
      typeof r.id === 'string' &&
      typeof r.client === 'string' &&
      typeof r.filename === 'string' &&
      ['pending', 'sent', 'returned'].includes(r.status)
    );

    if (!valid) throw new Error('Fichier invalide');

    if (confirm(`Importer ${data.length} fichier(s) ? Les données actuelles seront remplacées.`)) {
      records = data;
      save();
      resetForm();
      render();
      alert('Importation terminée.');
    }

  } catch (error) {
    alert('Fichier JSON invalide ou incompatible.');
  }

  event.target.value = '';
});

// ==============================
// FENÊTRE DE RETRAIT
// ==============================

function openReturnModal(record) {
  currentReturnId = record.id;

  $('modalClientName').textContent = record.client;
  $('modalFileName').textContent = record.filename;
  $('modalReturnDate').value = record.returnDate || today();

  $('returnModal').classList.add('show');
  document.body.style.overflow = 'hidden';

  setTimeout(() => $('modalReturnDate').focus(), 50);
}

// Fermer la fenêtre
function closeReturnModal() {
  $('returnModal').classList.remove('show');
  document.body.style.overflow = '';
  currentReturnId = null;
}

$('cancelReturn').addEventListener('click', closeReturnModal);

$('returnModal').addEventListener('click', event => {
  if (event.target === $('returnModal')) {
    closeReturnModal();
  }
});

document.addEventListener('keydown', event => {
  if (
    event.key === 'Escape' &&
    $('returnModal').classList.contains('show')
  ) {
    closeReturnModal();
  }
});

// ==============================
// CONFIRMER LE RETRAIT
// ==============================

$('returnForm').addEventListener('submit', event => {
  event.preventDefault();

  const date = $('modalReturnDate').value;

  if (!date) {
    alert('Veuillez saisir la date de retrait.');
    return;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (!match) {
    alert('Veuillez choisir une date valide.');
    return;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const verification = new Date(year, month - 1, day);

  if (
    verification.getFullYear() !== year ||
    verification.getMonth() !== month - 1 ||
    verification.getDate() !== day
  ) {
    alert('Veuillez choisir une date valide.');
    return;
  }

  const record = records.find(r => r.id === currentReturnId);

  if (!record) {
    closeReturnModal();
    return;
  }

  record.returnDate = date;
  record.status = 'returned';

  save();
  render();
  closeReturnModal();
});

// ==============================
// DÉMARRAGE
// ==============================

render();
