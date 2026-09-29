# Banco integrado — 1.3.11

Node.js >=22.13 fornece node:sqlite. Recomendação desta entrega: Node 24 LTS. O Express continua sendo a única dependência npm.

O servidor usa database/wellpro.db. Nunca substitua seu banco pelo banco vazio da base depois de começar os testes. Ao iniciar pela primeira vez nesta etapa, o servidor salva uma cópia .antes-1.3.11.bak antes de migrar a estrutura.

O schema da base permitia sala/laboratorio/armario, mas a interface original também oferecia Outro e Descrição. Nesta integração, o schema passa a aceitar outro e guardar descrição. Matrícula/identificação do responsável e observação de devolução ganham colunas próprias. Essa alteração só aparece nesta etapa. As tabelas originais são preservadas, com uma tabela auxiliar configuracoes para registrar a transição.

Se o SQLite estiver vazio, o servidor importa automaticamente data/usuarios.json da etapa 1.3.10 (usuários, chaves e movimentações). O arquivo original permanece no disco como cópia, mas deixa de ser usado após a migração. Se o banco já tiver dados, ele tem prioridade e o JSON não é mesclado. O terminal informa essa situação. Não apague nenhum dos dois para forçar migração sem antes verificar os dados.

Operações são gravadas em transações, com chaves estrangeiras habilitadas e parâmetros SQL. Horários das novas operações são ISO 8601 UTC e aparecem no fuso do navegador. As contas e hashes scrypt existentes são preservados; nenhuma senha padrão é criada.

Para backup manual: pare o servidor e copie wellpro.db para um local separado. Backup diário automatizado e hospedagem permanecem tarefas de implantação da EAP 1.4, não desta sequência. O projeto destina-se a um único processo Node local nesta entrega.

O .gitignore não afeta arquivos já rastreados. Se wellpro.db já estiver no Git, antes de guardar dados reais use git rm --cached database/wellpro.db para retirar SOMENTE do versionamento, mantendo a cópia local. Mantenha schema.sql no Git. Não comite banco com dados, backups, JSON local ou senhas.
