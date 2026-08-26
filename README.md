# Proposta Mendes Pro

Aplicativo PWA para criar propostas comerciais profissionais pelo smartphone ou computador. O projeto funciona com Next.js e está preparado para GitHub e Vercel.

## Recursos incluídos

- cadastro completo da proposta e do cliente;
- logomarca do cliente;
- logomarca do profissional com identificação automática das cores;
- personalização automática da proposta e do PDF com a paleta da marca;
- preenchimento por teclado e comando de voz;
- criação de itens por voz, quantidade, unidade e valor;
- cálculos automáticos, desconto e custos adicionais;
- assinatura na tela com o dedo ou caneta;
- modelos de propostas técnicas;
- pré-visualização em A4 e geração de PDF;
- compartilhamento pelo smartphone e WhatsApp;
- modo claro e escuro;
- funcionamento offline após a primeira abertura;
- instalação na tela inicial como aplicativo;
- rascunhos, duplicação e backup local em JSON.

## Executar no computador

Requisitos: Node.js 22 e npm.

```bash
npm install
npm run dev
```

Abra `http://localhost:3000` no navegador.

Para validar a versão de produção:

```bash
npm run build
npm start
```

## Publicar no GitHub

1. Crie um repositório vazio no GitHub.
2. Extraia este projeto e abra a pasta no terminal.
3. Execute:

```bash
git init
git add .
git commit -m "Projeto inicial Proposta Mendes Pro"
git branch -M main
git remote add origin URL_DO_SEU_REPOSITORIO
git push -u origin main
```

## Publicar na Vercel

1. Entre em [vercel.com](https://vercel.com) usando sua conta do GitHub.
2. Selecione **Add New > Project**.
3. Importe o repositório criado.
4. A Vercel identificará **Next.js** automaticamente.
5. Clique em **Deploy**.

Nenhuma chave externa é obrigatória. Opcionalmente, crie a variável `NEXT_PUBLIC_SITE_URL` com o endereço final do projeto, por exemplo `https://seu-projeto.vercel.app`.

## Instalar no smartphone

- Na barra inferior do aplicativo, toque em **Instalar**.
- Android/Chrome: confirme **Instalar aplicativo**; se o aviso não aparecer, abra o menu ⋮ e escolha **Adicionar à tela inicial**.
- iPhone/Safari: toque em **Compartilhar** e depois em **Adicionar à Tela de Início**.
- Se o link abriu dentro do WhatsApp ou Instagram, use o menu para abri-lo primeiro no Chrome ou Safari.

O reconhecimento de voz requer HTTPS, permissão para usar o microfone e um navegador compatível. O aplicativo continua permitindo preenchimento normal pelo teclado quando a voz não estiver disponível.

## Dados e privacidade

As propostas, imagens e assinatura ficam no armazenamento local do navegador. Elas não são enviadas a banco de dados. Use **Exportar backup** periodicamente e **Importar backup** ao trocar de aparelho ou navegador.

## Estrutura principal

```text
app/
  layout.tsx       metadados e configuração da aplicação
  page.tsx         funcionalidades do gerador
  globals.css      interface, responsividade e impressão A4
public/
  icons/            ícones instaláveis do PWA
  manifest.webmanifest
  sw.js             funcionamento offline
  logo-joelson.jpg  logomarca padrão
```
