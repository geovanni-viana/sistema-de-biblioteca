/**
 * storage.js
 * Camada de persistência da Biblioteca.
 * Hoje usa localStorage; a interface foi desenhada para que, no futuro,
 * cada método possa ser trocado por uma chamada ao Firebase (Firestore)
 * sem alterar o restante da aplicação.
 */

const DB_KEYS = {
  LIVROS: 'biblioteca_livros',
  EMPRESTIMOS: 'biblioteca_emprestimos',
};

/**
 * Alguns navegadores (principalmente o Chrome) bloqueiam o localStorage
 * quando a página é aberta direto do disco (protocolo file://), lançando
 * um SecurityError. Para o app continuar funcionando nesse cenário —
 * mesmo que sem persistir entre recarregamentos — usamos um driver em
 * memória como alternativa automática.
 */
function criarDriverArmazenamento() {
  try {
    const chaveTeste = '__biblioteca_teste__';
    window.localStorage.setItem(chaveTeste, '1');
    window.localStorage.removeItem(chaveTeste);
    return { tipo: 'local', driver: window.localStorage };
  } catch (erro) {
    console.warn('localStorage indisponível; usando armazenamento temporário em memória.', erro);
    const dados = {};
    const driverMemoria = {
      getItem: (chave) => (chave in dados ? dados[chave] : null),
      setItem: (chave, valor) => { dados[chave] = String(valor); },
      removeItem: (chave) => { delete dados[chave]; },
    };
    return { tipo: 'memoria', driver: driverMemoria };
  }
}

const { tipo: STORAGE_TIPO, driver: STORAGE_DRIVER } = criarDriverArmazenamento();

const Storage = {

  usandoMemoria() {
    return STORAGE_TIPO === 'memoria';
  },

  // ---------- Livros ----------
  getLivros() {
    const raw = STORAGE_DRIVER.getItem(DB_KEYS.LIVROS);
    return raw ? JSON.parse(raw) : [];
  },

  saveLivros(livros) {
    STORAGE_DRIVER.setItem(DB_KEYS.LIVROS, JSON.stringify(livros));
  },

  addLivro(livro) {
    const livros = this.getLivros();
    livros.push(livro);
    this.saveLivros(livros);
    return livro;
  },

  removeLivro(id) {
    const livros = this.getLivros().filter(l => l.id !== id);
    this.saveLivros(livros);
  },

  updateLivro(id, changes) {
    const livros = this.getLivros();
    const idx = livros.findIndex(l => l.id === id);
    if (idx === -1) return null;
    livros[idx] = { ...livros[idx], ...changes };
    this.saveLivros(livros);
    return livros[idx];
  },

  // ---------- Empréstimos ----------
  getEmprestimos() {
    const raw = STORAGE_DRIVER.getItem(DB_KEYS.EMPRESTIMOS);
    return raw ? JSON.parse(raw) : [];
  },

  saveEmprestimos(emprestimos) {
    STORAGE_DRIVER.setItem(DB_KEYS.EMPRESTIMOS, JSON.stringify(emprestimos));
  },

  addEmprestimo(emprestimo) {
    const emprestimos = this.getEmprestimos();
    emprestimos.push(emprestimo);
    this.saveEmprestimos(emprestimos);
    return emprestimo;
  },

  updateEmprestimo(id, changes) {
    const emprestimos = this.getEmprestimos();
    const idx = emprestimos.findIndex(e => e.id === id);
    if (idx === -1) return null;
    emprestimos[idx] = { ...emprestimos[idx], ...changes };
    this.saveEmprestimos(emprestimos);
    return emprestimos[idx];
  },

};
