PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL CHECK (length(trim(nome)) > 0),
    login TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (length(trim(login)) > 0),
    senha_hash TEXT NOT NULL CHECK (length(trim(senha_hash)) > 0),
    perfil TEXT NOT NULL DEFAULT 'operador'
        CHECK (perfil IN ('administrador', 'operador')),
    ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chaves (
    id INTEGER PRIMARY KEY,
    identificacao TEXT NOT NULL COLLATE NOCASE UNIQUE
        CHECK (length(trim(identificacao)) > 0),
    finalidade TEXT NOT NULL CHECK (finalidade IN ('sala', 'laboratorio', 'armario', 'outro')),
    descricao TEXT,
    localizacao TEXT,
    status TEXT NOT NULL DEFAULT 'disponivel'
        CHECK (status IN ('disponivel', 'retirada', 'perdida')),
    ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
    observacoes TEXT,
    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS movimentacoes (
    id INTEGER PRIMARY KEY,
    chave_id INTEGER NOT NULL,
    identificacao_responsavel TEXT,
    observacao_devolucao TEXT,
    responsavel_nome TEXT NOT NULL CHECK (length(trim(responsavel_nome)) > 0),
    usuario_retirada_id INTEGER NOT NULL,
    retirada_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario_devolucao_id INTEGER,
    devolucao_em TEXT,
    observacoes TEXT,
    FOREIGN KEY (chave_id) REFERENCES chaves(id) ON DELETE RESTRICT,
    FOREIGN KEY (usuario_retirada_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    FOREIGN KEY (usuario_devolucao_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    CHECK ((devolucao_em IS NULL AND usuario_devolucao_id IS NULL)
        OR (devolucao_em IS NOT NULL AND usuario_devolucao_id IS NOT NULL)),
    CHECK (devolucao_em IS NULL OR devolucao_em >= retirada_em)
);

-- Uma chave nao pode ter duas retiradas abertas ao mesmo tempo.
CREATE UNIQUE INDEX IF NOT EXISTS idx_movimentacao_aberta
    ON movimentacoes(chave_id) WHERE devolucao_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_movimentacoes_chave_data
    ON movimentacoes(chave_id, retirada_em);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_responsavel
    ON movimentacoes(responsavel_nome);
CREATE INDEX IF NOT EXISTS idx_chaves_status ON chaves(status);

CREATE TABLE IF NOT EXISTS configuracoes (chave TEXT PRIMARY KEY, valor TEXT NOT NULL);

COMMIT;
