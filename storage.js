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

const Storage = {

  // ---------- Livros ----------
  getLivros() {
    const raw = localStorage.getItem(DB_KEYS.LIVROS);
    return raw ? JSON.parse(raw) : [];
  },

  saveLivros(livros) {
    localStorage.setItem(DB_KEYS.LIVROS, JSON.stringify(livros));
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
    const raw = localStorage.getItem(DB_KEYS.EMPRESTIMOS);
    return raw ? JSON.parse(raw) : [];
  },

  saveEmprestimos(emprestimos) {
    localStorage.setItem(DB_KEYS.EMPRESTIMOS, JSON.stringify(emprestimos));
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
