<!-- l10n-sync: source-file="README.md" -->
🌐 [English](README.md) | [Español](README.es.md) | Português (Brasil) | [한국어](README.ko.md)

# 🎮 Mona Mayhem

**Workshop de VS Code e GitHub Copilot CLI** — Crie uma arena de batalha de contribuições do GitHub

Um template de workshop para criar com Astro um site com tema de fliperama retrô que compara os gráficos de contribuição do GitHub de dois usuários. Este é o **ponto de partida** — você vai criar o aplicativo passo a passo usando o GitHub Copilot.

![Captura de tela do Mona Mayhem](https://github.com/user-attachments/assets/5eca79e2-cb9f-4e93-aa0d-23666ebde3b7)
*Veja como ficará o projeto ao final do workshop*

## 📚 Workshop

O workshop oferece duas trilhas. Escolha a que combina com seu fluxo de trabalho:

- **Trilha do VS Code** — Chat, Plan Mode, Agent Mode, agentes em segundo plano e ciclos de revisão integrados ao editor
- **Trilha do CLI** — `copilot`, contexto com `@file`, `/plan`, edições autônomas, `/fleet`, `/delegate` e `/review`

| Parte | Título | Foco do Copilot |
|------|-------|-----------------|
| [00](workshop/pt_BR/00-overview.md) | Visão geral | Escolha da trilha e objetivos de aprendizado |
| [01](workshop/pt_BR/01-setup.md) | Configuração e engenharia de contexto | Instruções, permissões e configuração do ambiente |
| [02](workshop/pt_BR/02-plan-and-scaffold.md) | Planejamento e estrutura inicial | Planejamento da API e da arquitetura das páginas |
| [03](workshop/pt_BR/03-agent-mode.md) | Construção do jogo | Implementação e iteração agênticas |
| [04](workshop/pt_BR/04-design-vibes.md) | Design e temas | Planejamento e implementação do design visual |
| [05](workshop/pt_BR/05-polish.md) | Polimento e trabalho em paralelo | Paralelismo, revisões e verificações de qualidade |
| [06](workshop/pt_BR/06-bonus.md) | Bônus e extensões | Ideias de funcionalidades e experimentos extras com o Copilot |

## 🚀 Início rápido

1. **Primeiro, crie seu próprio repositório** usando este template para criar um novo repositório ou fazendo um fork deste.
2. Escolha a trilha:
   - **VS Code:** clone seu repositório e abra-o no VS Code.
   - **GitHub Copilot CLI:** clone seu repositório, instale `copilot` e trabalhe pelo terminal.
3. Siga o [guia do workshop](workshop/pt_BR/00-overview.md).

## Pré-requisitos

### Compartilhados

- GitHub Copilot (Pro, Business ou Enterprise)
- Git
- Node.js

### Trilha do VS Code

- VS Code v1.107+
- Extensão GitHub Copilot com sessão iniciada

### Trilha do CLI

- GitHub Copilot CLI (`copilot`)
- Node.js 22+ se você pretende instalar o CLI com `npm install -g @github/copilot`
- Ou Homebrew / WinGet, se preferir instalar por um gerenciador de pacotes nativo

## Tecnologias

- **Framework**: [Astro](https://astro.build/) v6
- **Runtime**: Node.js com o adaptador [@astrojs/node](https://docs.astro.build/en/guides/integrations-guide/node/)
- **Fonte**: Press Start 2P (fonte de jogos retrô)
- **API**: API do gráfico de contribuições do GitHub

## Notas de implantação

### Configuração atual do GitHub Pages

Atualmente, o workflow em `.github/workflows/deploy.yml` publica no GitHub Pages o conteúdo estático do workshop e da documentação em `docs/` e `workshop/`. Ele não compila nem publica o aplicativo Astro de `src/`.

### Se quiser publicar o aplicativo Astro no GitHub Pages

O GitHub Pages é uma hospedagem estática, portanto o aplicativo Astro deve gerar conteúdo estático.

1. Altere `output` de `server` para `static` em `astro.config.mjs`.
2. Remova o adaptador Node (`@astrojs/node`) de `astro.config.mjs` e `package.json`.
3. Atualize o workflow do GitHub Actions para executar `npm ci` e `npm run build`, e depois enviar `dist/` como artefato do Pages.
4. Se for publicar em uma página de projeto (`https://<user>.github.io/<repo>/`), configure `site` e `base` em `astro.config.mjs`.

Se quiser manter as rotas de API em produção, use uma plataforma de servidor em vez do GitHub Pages (por exemplo, Vercel, Netlify ou um host Node).

## Licença

MIT
