function texto(valor, limite = 250) {
  if (typeof valor !== 'string' || valor.trim().length > limite) {
    throw new Error('Confira os campos de texto e seus limites.');
  }
  return valor.trim();
}

function proximo(lista) {
  return Math.max(0, ...lista.map((item) => item.id)) + 1;
}

function buscarChave(estado, id) {
  const chave = estado.chaves.find((item) => item.id === Number(id) && item.ativo);
  if (!chave) {
    const erro = new Error('Chave não encontrada.');
    erro.status = 404;
    throw erro;
  }
  return chave;
}

// O status no evento é uma fotografia da operação, não o status atual da chave.
function registrarEvento(estado, chave, tipo, usuario, movimento, observacoes = '') {
  estado.eventos.push({
    id: proximo(estado.eventos),
    chave_id: chave.id,
    movimentacao_id: movimento?.id || null,
    tipo,
    status: chave.status,
    responsavel: movimento?.responsavel || '',
    usuario_id: usuario.id,
    operador: usuario.nome,
    ocorrido_em: new Date().toISOString(),
    observacoes
  });
}

export function cadastrar(estado, dados) {
  const identificacao = texto(dados.identificacao, 120);
  if (!identificacao) throw new Error('Informe a identificação.');
  if (estado.chaves.some((c) => c.identificacao.toLowerCase() === identificacao.toLowerCase())) {
    throw new Error('Identificação já cadastrada.');
  }
  if (!['Sala', 'Laboratório', 'Armário', 'Outro'].includes(dados.finalidade)) {
    throw new Error('Finalidade inválida.');
  }
  const chave = {
    id: proximo(estado.chaves),
    identificacao,
    descricao: texto(dados.descricao || ''),
    finalidade: dados.finalidade,
    localizacao: texto(dados.localizacao || ''),
    status: 'disponivel',
    responsavel: '',
    ativo: true,
    criado_em: new Date().toISOString()
  };
  estado.chaves.push(chave);
  return chave;
}

export function retirar(estado, dados, usuario) {
  const chave = buscarChave(estado, dados.chave);
  const aberta = estado.movimentacoes.some((m) => m.chave_id === chave.id && !m.devolucao_em);
  if (chave.status !== 'disponivel' || aberta) {
    throw new Error('Chave indisponível: ela está retirada ou perdida.');
  }
  const responsavel = texto(dados.responsavel, 120);
  if (!responsavel) throw new Error('Informe o responsável pela retirada.');
  const movimento = {
    id: proximo(estado.movimentacoes),
    chave_id: chave.id,
    responsavel,
    identificacao: texto(dados.identificacao || '', 120),
    observacao: texto(dados.observacao || '', 1000),
    retirada_em: new Date().toISOString(),
    devolucao_em: null,
    usuario_retirada_id: usuario.id,
    usuario_devolucao_id: null
  };
  estado.movimentacoes.push(movimento);
  chave.status = 'retirada';
  chave.responsavel = responsavel;
  registrarEvento(estado, chave, 'retirada', usuario, movimento, movimento.observacao);
}

export function devolver(estado, dados, usuario) {
  const chave = buscarChave(estado, dados.chave);
  const movimento = estado.movimentacoes.find((m) => m.chave_id === chave.id && !m.devolucao_em);
  if (chave.status !== 'retirada' || !movimento) {
    throw new Error(
      'Não há retirada em aberto para devolução. Se a chave estava perdida, marque-a como encontrada.'
    );
  }
  movimento.devolucao_em = new Date().toISOString();
  movimento.usuario_devolucao_id = usuario.id;
  movimento.observacao_devolucao = texto(dados.observacao || '', 1000);
  chave.status = 'disponivel';
  chave.responsavel = '';
  registrarEvento(estado, chave, 'devolucao', usuario, movimento, movimento.observacao_devolucao);
}

export function perder(estado, id, usuario) {
  const chave = buscarChave(estado, id);
  if (chave.status === 'perdida') throw new Error('Esta chave já está perdida.');
  const movimento = estado.movimentacoes.find((m) => m.chave_id === chave.id && !m.devolucao_em);
  chave.status = 'perdida';
  registrarEvento(estado, chave, 'perda', usuario, movimento);
}

export function encontrar(estado, id, usuario) {
  const chave = buscarChave(estado, id);
  if (chave.status !== 'perdida')
    throw new Error('Somente uma chave perdida pode ser marcada como encontrada.');
  const movimento = estado.movimentacoes.find((m) => m.chave_id === chave.id && !m.devolucao_em);
  // Confirmar "encontrada" significa que a chave voltou ao ponto de controle.
  if (movimento) {
    movimento.devolucao_em = new Date().toISOString();
    movimento.usuario_devolucao_id = usuario.id;
    movimento.observacao_devolucao =
      'Retirada encerrada após recuperação da chave no ponto de controle.';
  }
  chave.status = 'disponivel';
  chave.responsavel = '';
  registrarEvento(
    estado,
    chave,
    'encontrada',
    usuario,
    movimento,
    movimento?.observacao_devolucao || 'Chave recuperada no ponto de controle.'
  );
}
