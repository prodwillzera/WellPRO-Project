-- ==========================================================
-- WellPro — Sistema de Controle de Chaves do IFC
-- Instituto Federal Catarinense (IFC)
-- Script de Criação do Banco de Dados e Tabelas (MySQL / MariaDB)
-- ==========================================================

CREATE DATABASE IF NOT EXISTS wellpro_ifc CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE wellpro_ifc;

DROP TABLE IF EXISTS movimentacao;
DROP TABLE IF EXISTS chave;
DROP TABLE IF EXISTS usuario;

CREATE TABLE usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    matricula VARCHAR(50) NOT NULL UNIQUE,
    perfil VARCHAR(50) NOT NULL DEFAULT 'operador', -- 'administrador', 'operador'
    senha_hash VARCHAR(255) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE chave (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identificacao VARCHAR(100) NOT NULL UNIQUE,
    descricao VARCHAR(255) NOT NULL,
    finalidade VARCHAR(100) NOT NULL, -- Ex: Sala de Aula, Laboratório, Armário, Administrativo
    localizacao VARCHAR(150) NOT NULL, -- Ex: Bloco A - Sala 101, Prédio Central
    status ENUM('Disponível', 'Retirada', 'Perdida') NOT NULL DEFAULT 'Disponível',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE movimentacao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chave_id INT NOT NULL,
    usuario_id INT NOT NULL,
    nome_responsavel VARCHAR(150) NOT NULL,
    matricula_responsavel VARCHAR(50) NOT NULL,
    data_retirada DATE NOT NULL,
    hora_retirada TIME NOT NULL,
    data_devolucao DATE DEFAULT NULL,
    hora_devolucao TIME DEFAULT NULL,
    status ENUM('Retirada', 'Devolvida') NOT NULL DEFAULT 'Retirada',
    observacao TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_movimentacao_chave FOREIGN KEY (chave_id) REFERENCES chave (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_movimentacao_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices para otimização de consultas frequentes
CREATE INDEX idx_chave_status ON chave(status);
CREATE INDEX idx_chave_identificacao ON chave(identificacao);
CREATE INDEX idx_movimentacao_status ON movimentacao(status);
CREATE INDEX idx_movimentacao_data ON movimentacao(data_retirada);

-- Usuários iniciais do sistema
-- Senha padrão para testes: "admin123" (hash SHA-256: 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9)
INSERT INTO usuario (id, nome, matricula, perfil, senha_hash, ativo) VALUES
(1, 'Administrador do IFC', 'IFC001', 'administrador', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', TRUE),
(2, 'Servidor da Portaria', 'IFC002', 'operador', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', TRUE);

INSERT INTO chave (id, identificacao, descricao, finalidade, localizacao, status, ativo) VALUES
(1, 'Chave 01 — Sala 101', 'Chave principal da Sala de Aula 101', 'Sala de Aula', 'Bloco Pedagógico A - 1º Andar', 'Disponível', TRUE),
(2, 'Chave 02 — Lab Informática 1', 'Laboratório de Informática e Redes 01', 'Laboratório', 'Bloco Tecnológico - Sala 204', 'Retirada', TRUE),
(3, 'Chave 03 — Armário de Ferramentas 05', 'Armário do Laboratório de Mecânica', 'Armário', 'Oficina Mecânica - Bloco C', 'Disponível', TRUE),
(4, 'Chave 04 — Sala dos Professores', 'Sala dos Docentes do Ensino Médio/Técnico', 'Administrativo', 'Bloco Central - 2º Andar', 'Disponível', TRUE),
(5, 'Chave 05 — Lab de Química', 'Laboratório de Química e Biotecnologia', 'Laboratório', 'Bloco de Ciências - Térreo', 'Retirada', TRUE),
(6, 'Chave 06 — Auditório Central', 'Chave do Auditório Principal e Cabine de Som', 'Auditório', 'Prédio Central', 'Perdida', TRUE),
(7, 'Chave 07 — Sala de Reuniões', 'Sala de Reuniões da Direção Geral', 'Administrativo', 'Prédio da Direção - Sala 12', 'Disponível', TRUE),
(8, 'Chave 08 — Almoxarifado Central', 'Acesso aos estoques de materiais de consumo', 'Almoxarifado', 'Bloco de Logística - Galpão 1', 'Disponível', TRUE);

-- Movimentações iniciais (histórico de exemplo)
INSERT INTO movimentacao (id, chave_id, usuario_id, nome_responsavel, matricula_responsavel, data_retirada, hora_retirada, data_devolucao, hora_devolucao, status, observacao) VALUES
(1, 1, 1, 'Prof. Carlos Eduardo Mendes', 'SIAPE284910', '2026-03-01', '07:45:00', '2026-03-01', '11:50:00', 'Devolvida', 'Aula de Algoritmos no 1º período.'),
(2, 4, 2, 'Profa. Mariana Costa', 'SIAPE194022', '2026-03-02', '08:00:00', '2026-03-02', '18:15:00', 'Devolvida', 'Preparação de material didático.'),
(3, 2, 1, 'Prof. Roberto Santos', 'SIAPE330219', '2026-03-03', '08:30:00', NULL, NULL, 'Retirada', 'Aula prática de Programação Web.'),
(4, 5, 2, 'Técnica Fernanda Lima', 'SIAPE449182', '2026-03-03', '09:15:00', NULL, NULL, 'Retirada', 'Preparo de reagentes químicos para aula prática.');
