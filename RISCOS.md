# Riscos de Seguranca Identificados

Este documento resume falhas criticas encontradas nos arquivos de rotas, middlewares e controllers do projeto Node.js, com foco em Mass Assignment, Sensitive Data Exposure e Broken Object Level Authorization (BOLA).

## 1. Sensitive Data Exposure

### Falha identificada

A API retorna dados sensiveis de pacientes em endpoints simples de consulta e listagem.

Evidencias principais:

- `src/pacientes/pacienteController.ts`: `exibeTodosPacientes` retorna todos os pacientes diretamente.
- `src/pacientes/pacienteController.ts`: `lerPaciente` retorna o objeto completo do paciente pelo ID.
- `src/pacientes/pacienteController.ts`: `consultaPorPaciente` usa `SELECT * FROM paciente WHERE nome = ?` e retorna o resultado bruto.
- `src/pacientes/pacienteEntity.ts`: o campo `cpf` existe na entidade e nao possui nenhuma restricao de ocultacao na resposta.
- `src/pacientes/pacienteEntity.ts`: o campo `senha` possui `select: false`, mas essa protecao pode ser ignorada por consultas SQL brutas com `SELECT *`.

### Riscos

- Exposicao indevida de CPF de pacientes.
- Possivel exposicao de senha criptografada/hash em consultas SQL brutas.
- Vazamento de dados pessoais em endpoints que deveriam retornar apenas informacoes basicas.
- Risco juridico relacionado a LGPD, por tratamento e exposicao excessiva de dados pessoais.

### Por que isso e um risco

Dados como CPF e senha/hash nao sao necessarios em listagens comuns. Mesmo quando a senha esta criptografada, seu vazamento aumenta o risco de ataques offline, reutilizacao de credenciais e comprometimento de contas. O CPF e um dado pessoal sensivel para o contexto de negocio e pode gerar responsabilizacao legal caso seja exposto sem necessidade.

### Sugestoes de melhoria

- Nunca retornar entidades diretamente nas respostas da API.
- Criar DTOs de resposta, por exemplo `PacienteResumoDTO`, contendo apenas campos necessarios.
- Remover `cpf`, `senha`, `historico` e outros dados sensiveis de listagens simples.
- Substituir `SELECT *` por selecao explicita de colunas permitidas.
- Manter `select: false` em campos sensiveis e evitar consultas brutas que ignorem essa protecao.
- Criar testes automatizados garantindo que `senha` e `cpf` nao aparecem em endpoints de listagem.

## 2. Broken Object Level Authorization (BOLA)

### Falha identificada

Alguns endpoints permitem acessar recursos pelo ID da URL sem verificar se o usuario autenticado e o dono do recurso.

Evidencias principais:

- `src/consultas/consultaRoutes.ts`: rotas de consulta nao usam middleware de autenticacao.
- `src/consultas/consultaController.ts`: `buscaConsultaPorId` busca consulta apenas por `id`, sem comparar com `req.userId`.
- `src/pacientes/pacienteRoutes.ts`: `GET /paciente/:id` e `GET /paciente/:id/consultas` nao exigem token.
- `src/pacientes/pacienteRoutes.ts`: `PUT`, `DELETE` e `PATCH` exigem apenas role de paciente, mas nao verificam se o `id` da URL pertence ao usuario autenticado.
- `src/auth/middlewares/authMiddlewares.ts`: o middleware define `req.userId`, mas os controllers analisados nao usam essa informacao para validar propriedade do recurso.

### Riscos

- Um usuario pode trocar o ID na URL e acessar dados de outro paciente.
- Um usuario pode visualizar agendamentos de outra pessoa.
- Um paciente autenticado pode tentar atualizar, alterar endereco ou excluir/desativar outro paciente apenas mudando o parametro `id`.
- Exposicao indevida de dados medicos e pessoais.

### Por que isso e um risco

Autenticacao nao e suficiente. Mesmo com token valido, a API precisa verificar autorizacao no nivel do objeto. Sem essa verificacao, qualquer usuario autenticado com a mesma role pode manipular IDs e acessar ou alterar recursos de terceiros.

### Sugestoes de melhoria

- Adicionar `verificaTokenJWT` nas rotas de consulta e nas rotas de leitura de paciente que retornam dados privados.
- Validar nos controllers se `req.userId` corresponde ao `id` da URL antes de retornar ou alterar dados de paciente.
- Para consultas, buscar pelo `id` da consulta junto com o dono do recurso, por exemplo filtrando por `consulta.id` e `consulta.paciente.id = req.userId`.
- Retornar `404` ou `403` quando o recurso nao pertencer ao usuario autenticado.
- Criar middleware ou helper reutilizavel para verificar propriedade de recurso.
- Criar testes automatizados simulando um usuario tentando acessar recurso de outro usuario.

## 3. Mass Assignment / Overposting

### Falha identificada

Nao foi encontrado um campo literal `isAdmin` no modelo analisado. Portanto, nao ha evidencia direta de que o usuario consiga enviar `isAdmin: true` e virar administrador.

Apesar disso, ha uma falha equivalente de Mass Assignment: o sistema aceita campos sensiveis e de controle diretamente do corpo da requisicao.

Evidencias principais:

- `src/pacientes/pacienteController.ts`: `criarPaciente` aceita `estaAtivo`, `historico`, `imagem`, `imagemUrl` e outros campos diretamente do body.
- `src/pacientes/pacienteController.ts`: `atualizarPaciente` aceita e salva `estaAtivo`, `cpf`, `historico`, `imagem`, `imagemUrl` diretamente do body.
- `src/pacientes/pacienteSanitizations.ts`: campos que nao possuem regra especifica de sanitizacao sao copiados para o objeto final.
- `src/pacientes/pacienteEntity.ts`: o campo `role` e definido como `Role.paciente` no construtor, o que reduz o risco de elevacao direta de perfil nesse endpoint.

### Riscos

- Usuario pode manipular campos que deveriam ser controlados pelo sistema.
- Usuario pode alterar seu proprio status `estaAtivo`.
- Usuario pode alterar informacoes sensiveis como `historico`, dependendo do uso do sistema.
- Usuario pode modificar dados que deveriam exigir validacao administrativa ou regra de negocio especifica.

### Por que isso e um risco

Mass Assignment ocorre quando a API confia demais no JSON enviado pelo cliente. Mesmo que `isAdmin` nao exista, qualquer campo sensivel aceito diretamente pode gerar abuso de permissao, fraude de estado, adulteracao de dados clinicos ou inconsistencias juridicamente relevantes.

### Sugestoes de melhoria

- Aplicar whitelist de campos permitidos por endpoint.
- Separar DTOs de criacao e atualizacao, por exemplo `CriarPacienteDTO` e `AtualizarPacienteDTO`.
- Remover do body controlado pelo usuario campos como `role`, `estaAtivo`, `historico` e outros campos administrativos.
- Definir campos internos exclusivamente no servidor.
- Usar validacao com bloqueio de campos desconhecidos, por exemplo `noUnknown()` no Yup ou biblioteca equivalente.
- Criar testes automatizados enviando campos extras, como `role`, `isAdmin`, `estaAtivo` e `historico`, e validar que eles sao ignorados ou rejeitados.

## Prioridade Recomendada

1. Corrigir BOLA em rotas de pacientes e consultas, pois permite acesso direto a dados de terceiros.
2. Corrigir exposicao de dados sensiveis, especialmente CPF e possivel senha/hash via `SELECT *`.
3. Corrigir Mass Assignment com DTOs e whitelist de campos por operacao.

## Conclusao

As falhas encontradas podem expor a empresa a riscos tecnicos e juridicos relevantes, principalmente por vazamento de dados pessoais, acesso indevido a informacoes de pacientes e falta de controle sobre campos sensiveis enviados pelo cliente. As melhorias recomendadas reduzem o risco de incidentes de seguranca e ajudam a alinhar a API com boas praticas de protecao de dados.
