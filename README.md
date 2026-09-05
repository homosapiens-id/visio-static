# Visio Static — espelho de compatibilidade

Este repositório **não é mais a fonte canônica do produto Visio**.

- Fonte canônica da interface: `homosapiens-id/visio-web`
- Produção pública: `https://visio.homosapiens.id`
- Runtime/API: `https://app.homosapiens.id`
- Runtime de produção: `homosapiens-id/homosapiens-app`, branch `hostinger-node`

O papel deste repositório é apenas manter um mecanismo de deploy/espelho compatível com a hospedagem estática da Hostinger. O script `deploy.sh` publica o conteúdo da branch `main` de `visio-web` no `public_html` de `visio.homosapiens.id`.

Não adicionar novas funcionalidades aqui. Não armazenar segredos.
