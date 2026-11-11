# Especificação - Document Management System

## 1. Objetivo

Oferecer uma aplicação web simples para enviar, listar e baixar documentos armazenados no filesystem local, com metadados mantidos em memória.

> Esta especificação registra o comportamento e as decisões da implementação atual. O endpoint `/health`, as rotas de documentos e a interface descritos abaixo estão implementados.

## 2. Escopo

### Dentro do escopo

- Enviar um arquivo pela interface web e pela API.
- Listar os metadados dos documentos disponíveis na memória do processo.
- Baixar o conteúdo de um documento pelo identificador.
- Exibir estados de carregamento, sucesso, lista vazia e erro na interface.
- Armazenar os bytes no filesystem local da aplicação em `backend/storage`, usando multer com `diskStorage`.
- Manter os metadados em memória durante a vida do processo.

### Fora do escopo

- Armazenamento em nuvem ou em qualquer provedor externo.
- Banco de dados ou persistência durável dos metadados.
- Versionamento, exclusão, busca, paginação e compartilhamento de documentos.
- Autenticação, autorização e isolamento real entre usuários.
- Recuperação automática de metadados após reinício.
- Allowlist de formatos MIME ou antivírus. Esses controles exigem uma decisão de produto própria e não devem ser presumidos.

## 3. Requisitos funcionais

| ID | Requisito | Critérios de aceitação |
| --- | --- | --- |
| RF-01 | O sistema deve aceitar o envio de um documento. | A API recebe um único arquivo no campo multipart `file`; em sucesso, retorna os metadados criados e grava os bytes em `backend/storage`. |
| RF-02 | O sistema deve rejeitar uma requisição de upload sem arquivo. | A API retorna `400` com erro estruturado e não cria metadados. |
| RF-03 | O sistema deve rejeitar arquivos que excedam o limite configurado. | O limite é configurável, com padrão de 10 MiB (10485760 bytes); uma violação retorna `413` e não deixa metadados ou arquivo parcial acessível. |
| RF-04 | O sistema deve atribuir um identificador único gerado pelo servidor a cada documento. | O ID não é derivado do nome enviado pelo cliente e identifica o metadado e o arquivo armazenado. |
| RF-05 | O sistema deve listar os documentos conhecidos pelo processo atual. | A resposta contém metadados, nunca bytes do arquivo nem caminho físico; lista vazia retorna sucesso com coleção vazia. |
| RF-06 | O sistema deve baixar um documento pelo ID. | Um documento existente retorna os bytes com `Content-Disposition: attachment` e nome original seguro; ID sem metadado ou arquivo correspondente retorna `404`. |
| RF-07 | A interface deve permitir selecionar e enviar um arquivo. | Durante o envio apresenta estado de carregamento, comunica sucesso ou erro e atualiza a lista após sucesso. |
| RF-08 | A interface deve apresentar os documentos disponíveis. | Para cada item mostra ao menos nome original, tamanho e data do upload e oferece ação de download. |
| RF-09 | A interface deve distinguir lista vazia e falha de carregamento. | A lista vazia não é apresentada como erro; falhas oferecem mensagem compreensível e possibilidade de tentar novamente. |
| RF-10 | O MVP deve operar como aplicação de usuário único, sem autenticação. | O campo `owner` é informativo e não constitui controle de acesso nem isolamento entre usuários. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos devem ser gravados exclusivamente no filesystem local da aplicação usando multer `diskStorage`; o diretório padrão é `backend/storage`. |
| RNF-02 | Os metadados devem residir em memória. Eles são perdidos ao reiniciar o backend; os arquivos podem permanecer no disco como órfãos e não são recuperados automaticamente. |
| RNF-03 | Configurações operacionais devem vir de variáveis de ambiente, conforme 12-Factor. O diretório de storage e o limite máximo de upload devem ser configuráveis. |
| RNF-04 | O backend deve seguir dependências `routes -> controllers -> services -> repositories`; as camadas internas não devem depender do Express ou da interface. |
| RNF-05 | O frontend deve usar React com componentes funcionais e chamar a API com `fetch` sob o prefixo `/api`; o proxy de desenvolvimento Vite remove esse prefixo antes de encaminhar ao backend. |
| RNF-06 | Nomes e caminhos enviados pelo cliente não devem determinar o caminho físico gravado. O nome físico deve ser gerado pelo servidor e o caminho não deve ser exposto na API. |
| RNF-07 | Erros esperados devem ter status HTTP e formato estáveis. Respostas de erro não devem revelar stack traces, caminhos locais ou detalhes internos de I/O. |
| RNF-08 | Falhas durante a gravação ou o registro do metadado não devem deixar um documento parcialmente disponível na API. O arquivo recém-gravado deve ser removido se o registro do metadado falhar. |

### Configuração proposta

| Variável | Uso |
| --- | --- |
| `PORT` | Porta HTTP do backend; o seed usa `3000` como padrão. |
| `STORAGE_DIR` | Diretório local de gravação; padrão `backend/storage`. Caminhos relativos devem ser resolvidos de forma consistente a partir da raiz do backend. |
| `MAX_FILE_SIZE_BYTES` | Limite máximo de bytes por arquivo. Deve ser positivo e finito; o padrão é 10485760 bytes (10 MiB). |

Configuração inválida deve ser reportada no startup, sem iniciar o servidor com limites acidentais ou armazenamento em destino externo.

## 5. Modelo de dados

### Documento (metadados em memória)

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | Identificador único gerado no servidor. Também determina, por mapeamento interno seguro, o nome físico do arquivo. |
| `originalName` | string | Nome original fornecido no upload, mantido para exibição e download; nunca usado como caminho de storage. |
| `size` | number | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Data e hora do upload em ISO 8601, preferencialmente UTC. |
| `owner` | string | Campo informativo de dono. No MVP de usuário único, não representa identidade autenticada nem autorização. |

O caminho físico é detalhe interno do repositório, derivado de `STORAGE_DIR` e do identificador gerado pelo servidor. Não faz parte do objeto público nem das respostas HTTP. O arquivo deve ser armazenado com nome controlado pelo servidor, sem confiar em diretórios ou extensões presentes em `originalName`.

Os registros são mantidos em memória pelo repositório enquanto o processo estiver ativo. Após reinício, a lista começa vazia mesmo que existam arquivos no diretório local; não há indexação, restauração ou limpeza automática de órfãos neste escopo.

## 6. Contratos de API

### Convenção de paths

Os paths canônicos abaixo são registrados no backend sem prefixo `/api`. No desenvolvimento, o frontend chama `/api/upload`, `/api/documents` e `/api/documents/:id/download`; o proxy do Vite remove `/api` ao encaminhar para o backend. O prefixo é uma convenção do proxy, não parte das rotas canônicas do Express.

Formato comum de erro:

```json
{
  "error": {
    "code": "FILE_REQUIRED",
    "message": "Envie um arquivo no campo file."
  }
}
```

O texto pode ser localizado, mas `code` e status devem ser estáveis. Nenhuma resposta de erro deve incluir stack trace ou caminho local.

### `POST /upload`

- **Content-Type:** `multipart/form-data`.
- **Campo obrigatório:** `file`, com exatamente um arquivo.
- **Sucesso:** `201 Created`, corpo JSON:

```json
{
  "document": {
    "id": "<id-gerado-pelo-servidor>",
    "originalName": "relatorio.pdf",
    "size": 12345,
    "uploadedAt": "2026-11-11T12:00:00.000Z",
    "owner": "<identificador-informativo>"
  }
}
```

- **Erros:** `400 FILE_REQUIRED` para arquivo ausente ou requisição multipart inválida; `413 FILE_TOO_LARGE` quando o limite configurado for excedido; `500 STORAGE_ERROR` para falha inesperada de gravação/registro.
- A resposta não inclui caminho de arquivo nem conteúdo binário. Em falha após gravação, o arquivo parcial/recém-criado deve ser removido e nenhum metadado deve ser publicado.
- Não há allowlist MIME definida neste MVP. O backend não deve tratar o MIME declarado pelo cliente como prova de conteúdo seguro.

### `GET /documents`

- **Sucesso:** `200 OK`, corpo JSON:

```json
{
  "documents": [
    {
      "id": "<id>",
      "originalName": "relatorio.pdf",
      "size": 12345,
      "uploadedAt": "2026-11-11T12:00:00.000Z",
      "owner": "<identificador-informativo>"
    }
  ]
}
```

- Retorna somente metadados disponíveis na memória do processo atual. Se não houver documentos, retorna `200` com `"documents": []`.
- A coleção pertence ao escopo único do MVP; `owner` não filtra nem protege resultados.
- **Erros:** `500 INTERNAL_ERROR` em falha inesperada ao consultar o repositório.

### `GET /documents/:id/download`

- **Sucesso:** `200 OK`, corpo binário do arquivo, `Content-Type` apropriado quando conhecido (caso contrário `application/octet-stream`) e `Content-Disposition: attachment` com o nome original codificado de forma segura.
- **Erros:** `404 DOCUMENT_NOT_FOUND` quando não houver metadado para o ID ou quando o arquivo associado não existir; `500 STORAGE_ERROR` para falha de I/O que não seja ausência.
- O ID é resolvido pelo repositório; entrada do cliente não pode ser concatenada sem validação para formar um caminho arbitrário.

### Códigos e semântica de erro

| Status | Código | Situação |
| --- | --- | --- |
| `400` | `FILE_REQUIRED` / `INVALID_MULTIPART` | Upload sem arquivo ou corpo multipart inválido. |
| `404` | `DOCUMENT_NOT_FOUND` | ID sem metadado ou arquivo associado ausente. |
| `413` | `FILE_TOO_LARGE` | Upload excede `MAX_FILE_SIZE_BYTES`. |
| `500` | `STORAGE_ERROR` / `INTERNAL_ERROR` | Falha inesperada de persistência local ou operação interna. |

## 7. Decisões arquiteturais

### Backend

- **Routes:** registram os paths e encaminham para controllers.
- **Controllers:** validam o limite HTTP da entrada, chamam services e traduzem resultados/erros para status e JSON/stream HTTP.
- **Services:** coordenam regras de upload, listagem e download; não conhecem objetos `req`/`res`.
- **Repositories:** mantêm metadados em memória; o adaptador de storage encapsula acesso e remoção de arquivos e valida a contenção no diretório configurado. O destino do upload usa `multer` com `diskStorage` na camada de rotas.
- O Express e o middleware multer ficam na borda HTTP; regras de negócio não devem depender de detalhes do framework.
- `GET /health` e os três endpoints de documentos estão implementados.

### Frontend

- React com componentes funcionais, organização por componentes/páginas/serviços e chamadas `fetch` centralizadas no serviço de API.
- A experiência cobre upload de um documento, listagem e ação de download, com estados de carregamento, vazio e erro.
- A interface não presume autenticação nem oferece operações fora do escopo.

### Armazenamento e identidade

- Bytes exclusivamente no filesystem local, em diretório configurável com padrão `backend/storage`; sem cloud ou serviços de terceiros.
- Metadados exclusivamente em memória nesta fase. A perda dos metadados em reinício e a possibilidade de arquivos órfãos são limitações conhecidas, não falhas de persistência a serem ocultadas.
- Aplicação de usuário único sem autenticação. `owner` é mantido por compatibilidade com o modelo inicial, sem promessa de autorização ou separação de dados.

## 8. Estado e limitações

- Backend: upload local com limite por arquivo, limites multipart, listagem em memória e download com contenção do caminho físico no storage configurado.
- Frontend: upload, listagem e download com estados de carregamento e erro; respostas antigas da listagem não substituem alterações mais recentes após upload.
- Testes de integração cobrem o fluxo principal, limites de tamanho e multipart, documento inexistente e rejeição de caminhos fora do storage.
- Metadados continuam voláteis e podem deixar arquivos órfãos após reinício. O MVP segue sem autenticação, quotas acumuladas, rate limiting, allowlist MIME ou antivírus; não deve ser exposto como serviço multiusuário ou público sem controles adicionais.