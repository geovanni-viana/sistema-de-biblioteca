/**
 * app.js
 * Lógica de interface da Biblioteca: cadastro de livros, busca,
 * empréstimos e devoluções.
 */

// ---------- Estado ----------
let termoBusca = '';

// ---------- Utilidades ----------
function gerarId() {
  return (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatarData(iso) {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function normalizar(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function mostrarToast(mensagem) {
  const toast = document.getElementById('toast');
  toast.textContent = mensagem;
  toast.classList.add('is-visible');
  clearTimeout(mostrarToast._t);
  mostrarToast._t = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// ---------- Navegação por abas ----------
document.getElementById('tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  const alvo = btn.dataset.tab;

  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('is-active', b === btn));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('is-active', p.id === `panel-${alvo}`));

  if (alvo === 'emprestimos') preencherSelectLivros();
});

// ================= LIVROS =================

function renderAcervo() {
  const livros = Storage.getLivros();
  const filtro = normalizar(termoBusca);

  const filtrados = filtro
    ? livros.filter(l => normalizar(l.titulo).includes(filtro) || normalizar(l.autor).includes(filtro))
    : livros;

  const container = document.getElementById('lista-livros');
  const vazio = document.getElementById('acervo-empty');
  document.getElementById('acervo-count').textContent = livros.length;

  if (filtrados.length === 0) {
    container.innerHTML = '';
    vazio.hidden = false;
    vazio.textContent = livros.length === 0
      ? 'Nenhum livro encontrado. Cadastre o primeiro título ao lado.'
      : 'Nenhum livro corresponde à busca.';
    return;
  }
  vazio.hidden = true;

  container.innerHTML = filtrados
    .slice()
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
    .map(livro => {
      const esgotado = livro.disponiveis <= 0;
      return `
        <article class="book-card" data-id="${livro.id}">
          <div class="book-title">${escapeHtml(livro.titulo)}</div>
          <div class="book-author">${escapeHtml(livro.autor)}</div>
          <div class="book-meta">
            ${livro.categoria ? `<span>${escapeHtml(livro.categoria)}</span>` : ''}
            ${livro.isbn ? `<span>ISBN ${escapeHtml(livro.isbn)}</span>` : ''}
          </div>
          <div class="book-stamp">
            <div>
              <div class="stamp-count ${esgotado ? 'esgotado' : 'disponivel'}">${livro.disponiveis}/${livro.totalExemplares}</div>
              <div class="stamp-label">${esgotado ? 'todos emprestados' : 'disponíveis'}</div>
            </div>
            <button class="btn-remove" data-remove="${livro.id}">remover</button>
          </div>
        </article>
      `;
    }).join('');
}

document.getElementById('form-livro').addEventListener('submit', (e) => {
  e.preventDefault();
  const titulo = document.getElementById('livro-titulo').value.trim();
  const autor = document.getElementById('livro-autor').value.trim();
  const categoria = document.getElementById('livro-categoria').value.trim();
  const isbn = document.getElementById('livro-isbn').value.trim();
  const exemplares = Math.max(1, parseInt(document.getElementById('livro-exemplares').value, 10) || 1);

  if (!titulo || !autor) return;

  Storage.addLivro({
    id: gerarId(),
    titulo,
    autor,
    categoria,
    isbn,
    totalExemplares: exemplares,
    disponiveis: exemplares,
  });

  e.target.reset();
  document.getElementById('livro-exemplares').value = 1;
  mostrarToast(`"${titulo}" adicionado ao acervo.`);
  renderAcervo();
  preencherSelectLivros();
});

document.getElementById('lista-livros').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-remove]');
  if (!btn) return;
  const id = btn.dataset.remove;
  const emprestado = Storage.getEmprestimos().some(em => em.livroId === id && em.status !== 'devolvido');
  if (emprestado) {
    mostrarToast('Não é possível remover: há empréstimo ativo para este título.');
    return;
  }
  Storage.removeLivro(id);
  renderAcervo();
  preencherSelectLivros();
});

document.getElementById('busca-input').addEventListener('input', (e) => {
  termoBusca = e.target.value;
  renderAcervo();
});

// ================= EMPRÉSTIMOS =================

function preencherSelectLivros() {
  const select = document.getElementById('emprestimo-livro');
  const livros = Storage.getLivros()
    .filter(l => l.disponiveis > 0)
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));

  if (livros.length === 0) {
    select.innerHTML = '<option value="">Nenhum exemplar disponível</option>';
    document.getElementById('emprestimo-hint').textContent = 'Cadastre um livro ou aguarde uma devolução.';
    return;
  }

  document.getElementById('emprestimo-hint').textContent = '';
  select.innerHTML = livros
    .map(l => `<option value="${l.id}">${escapeHtml(l.titulo)} — ${escapeHtml(l.autor)} (${l.disponiveis} disp.)</option>`)
    .join('');
}

function statusEmprestimo(emprestimo) {
  if (emprestimo.status === 'devolvido') return 'devolvido';
  if (emprestimo.dataPrevista && emprestimo.dataPrevista < hojeISO()) return 'atrasado';
  return 'ativo';
}

function renderEmprestimos() {
  const emprestimos = Storage.getEmprestimos().filter(e => e.status !== 'devolvido');
  const container = document.getElementById('lista-emprestimos');
  const vazio = document.getElementById('emprestimos-empty');
  document.getElementById('ativos-count').textContent = emprestimos.length;

  if (emprestimos.length === 0) {
    container.innerHTML = '';
    vazio.hidden = false;
    return;
  }
  vazio.hidden = true;

  container.innerHTML = emprestimos
    .slice()
    .sort((a, b) => (a.dataPrevista || '').localeCompare(b.dataPrevista || ''))
    .map(em => {
      const status = statusEmprestimo(em);
      return `
        <div class="ledger-row">
          <div>
            <div class="ledger-title">${escapeHtml(em.livroTitulo)}</div>
            <div class="ledger-sub">Leitor: ${escapeHtml(em.leitor)} · retirado em ${formatarData(em.dataEmprestimo)}</div>
          </div>
          <span class="status-pill ${status}">${status === 'atrasado' ? 'atrasado' : 'em aberto'}</span>
          <div class="ledger-date"><b>${formatarData(em.dataPrevista)}</b>devolução prevista</div>
          <button class="btn-devolver" data-devolver="${em.id}">Registrar devolução</button>
        </div>
      `;
    }).join('');
}

function renderHistorico() {
  const devolvidos = Storage.getEmprestimos().filter(e => e.status === 'devolvido');
  const container = document.getElementById('lista-historico');
  const vazio = document.getElementById('historico-empty');
  document.getElementById('historico-count').textContent = devolvidos.length;

  if (devolvidos.length === 0) {
    container.innerHTML = '';
    vazio.hidden = false;
    return;
  }
  vazio.hidden = true;

  container.innerHTML = devolvidos
    .slice()
    .sort((a, b) => (b.dataDevolucao || '').localeCompare(a.dataDevolucao || ''))
    .map(em => `
      <div class="ledger-row">
        <div>
          <div class="ledger-title">${escapeHtml(em.livroTitulo)}</div>
          <div class="ledger-sub">Leitor: ${escapeHtml(em.leitor)} · retirado em ${formatarData(em.dataEmprestimo)}</div>
        </div>
        <span class="status-pill devolvido">devolvido</span>
        <div class="ledger-date"><b>${formatarData(em.dataDevolucao)}</b>devolvido em</div>
        <span></span>
      </div>
    `).join('');
}

document.getElementById('form-emprestimo').addEventListener('submit', (e) => {
  e.preventDefault();
  const livroId = document.getElementById('emprestimo-livro').value;
  const leitor = document.getElementById('emprestimo-leitor').value.trim();
  let prazo = document.getElementById('emprestimo-prazo').value;

  if (!livroId || !leitor) return;

  const livro = Storage.getLivros().find(l => l.id === livroId);
  if (!livro || livro.disponiveis <= 0) {
    mostrarToast('Este título não tem exemplares disponíveis.');
    return;
  }

  if (!prazo) {
    const data = new Date();
    data.setDate(data.getDate() + 14);
    prazo = data.toISOString().slice(0, 10);
  }

  Storage.addEmprestimo({
    id: gerarId(),
    livroId: livro.id,
    livroTitulo: livro.titulo,
    leitor,
    dataEmprestimo: hojeISO(),
    dataPrevista: prazo,
    dataDevolucao: null,
    status: 'ativo',
  });

  Storage.updateLivro(livro.id, { disponiveis: livro.disponiveis - 1 });

  e.target.reset();
  mostrarToast(`Empréstimo registrado: "${livro.titulo}" para ${leitor}.`);
  renderAcervo();
  renderEmprestimos();
  preencherSelectLivros();
});

document.getElementById('lista-emprestimos').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-devolver]');
  if (!btn) return;
  const id = btn.dataset.devolver;
  const emprestimo = Storage.getEmprestimos().find(em => em.id === id);
  if (!emprestimo) return;

  Storage.updateEmprestimo(id, { status: 'devolvido', dataDevolucao: hojeISO() });

  const livro = Storage.getLivros().find(l => l.id === emprestimo.livroId);
  if (livro) {
    Storage.updateLivro(livro.id, { disponiveis: Math.min(livro.totalExemplares, livro.disponiveis + 1) });
  }

  mostrarToast(`Devolução registrada: "${emprestimo.livroTitulo}".`);
  renderAcervo();
  renderEmprestimos();
  renderHistorico();
  preencherSelectLivros();
});

// ---------- Dados de exemplo (apenas na primeira execução) ----------
function semearDadosIniciais() {
  if (Storage.getLivros().length > 0) return;
  const exemplos = [
    { titulo: 'Dom Casmurro', autor: 'Machado de Assis', categoria: 'Romance', isbn: '', totalExemplares: 2, disponiveis: 2 },
    { titulo: 'Grande Sertão: Veredas', autor: 'Guimarães Rosa', categoria: 'Romance', isbn: '', totalExemplares: 1, disponiveis: 1 },
    { titulo: 'Estruturas de Dados com Python', autor: 'Coleção Técnica', categoria: 'Informática', isbn: '', totalExemplares: 3, disponiveis: 3 },
  ];
  exemplos.forEach(l => Storage.addLivro({ id: gerarId(), ...l }));
}

// ---------- Inicialização ----------
function iniciar() {
  if (Storage.usandoMemoria()) {
    document.getElementById('storage-warning').hidden = false;
  }
  semearDadosIniciais();
  renderAcervo();
  preencherSelectLivros();
  renderEmprestimos();
  renderHistorico();
}

try {
  iniciar();
} catch (erro) {
  console.error('Falha ao iniciar a Biblioteca:', erro);
  mostrarToast('Ocorreu um erro ao carregar os dados. Veja o console para detalhes.');
}
