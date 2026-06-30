# Webhooks outbound — ReuniAI

Integração com Zapier, Make ou qualquer endpoint HTTP via webhooks assinados.

## Configuração

1. Em **Configurações → Integrações**, adicione a URL do seu webhook.
2. Copie o **secret** exibido uma única vez após a criação.
3. Selecione os eventos desejados (por padrão: `meeting.completed` e `action_item.created`).

## Formato do payload

Cada entrega é um `POST` com corpo JSON:

```json
{
  "event": "meeting.completed",
  "timestamp": "2026-06-30T12:00:00.000Z",
  "data": { }
}
```

### `meeting.completed`

```json
{
  "event": "meeting.completed",
  "timestamp": "2026-06-30T12:00:00.000Z",
  "data": {
    "meeting": {
      "id": "uuid",
      "title": "Standup semanal",
      "started_at": "2026-06-30T10:00:00.000Z",
      "ended_at": "2026-06-30T10:30:00.000Z",
      "platform": "google_meet",
      "url": "https://meet.google.com/..."
    },
    "summary": {
      "executive_summary": "...",
      "decisions": ["..."]
    },
    "action_items": [
      {
        "id": "uuid",
        "title": "Enviar proposta",
        "assignee": "Ana",
        "due_date": "2026-07-05",
        "status": "open",
        "source": "ai"
      }
    ]
  }
}
```

### `action_item.created`

```json
{
  "event": "action_item.created",
  "timestamp": "2026-06-30T12:00:00.000Z",
  "data": {
    "action_item": {
      "id": "uuid",
      "title": "Revisar contrato",
      "assignee": null,
      "due_date": null,
      "status": "open",
      "source": "manual"
    },
    "meeting": {
      "id": "uuid",
      "title": "Reunião com cliente"
    }
  }
}
```

## Verificação de assinatura (HMAC)

Header: `X-Reuniai-Signature: sha256=<hex>`

O valor é `HMAC-SHA256(secret, raw_body)` em hexadecimal, prefixado com `sha256=`.

### Node.js

```javascript
import { createHmac, timingSafeEqual } from "node:crypto";

function verify(secret, rawBody, header) {
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  return timingSafeEqual(Buffer.from(expected), Buffer.from(header.trim()));
}
```

## Retentativas

O ReuniAI tenta até **3 vezes** com backoff (0s, 2s, 8s). Respostas HTTP 2xx são consideradas sucesso.

## Zapier / Make

Use um trigger **Webhooks by Zapier** ou **Custom webhook** no Make apontando para sua URL. Cole o secret na etapa de verificação HMAC conforme acima.

OpenAPI: [`webhooks.yaml`](./webhooks.yaml)
