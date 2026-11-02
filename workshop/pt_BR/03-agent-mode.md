<!-- l10n-sync: source-file="workshop/03-agent-mode.md" -->
# Parte 3: Construa o jogo com fluxos de trabalho agênticos

---

Nesta parte, o Copilot passa de planejador a implementador. Em vez de escrever código linha por linha, você descreve o que precisa e deixa o Copilot trabalhar nos arquivos necessários.

## Tarefa 1: Conecte a batalha

<!-- track:vscode:start -->
1. Mude para o modo **Agent** no Copilot Chat.
2. Insira este prompt:
<!-- track:vscode:end -->

<!-- track:cli:start -->
1. Retorne o Copilot CLI ao fluxo normal de programação (ou continue no modo autopilot para que o Copilot prossiga até você pará-lo).
2. Se ajudar, indique o arquivo da página para fornecer mais contexto: `@src/pages/index.astro`.
3. Insira este prompt:
<!-- track:cli:end -->

   > Adicione JavaScript do lado do cliente à página de batalha para que:
   > 1. Ao clicar no botão Battle, obtenha os dois nomes de usuário dos campos.
   > 2. Valide se ambos estão preenchidos e exiba um erro caso contrário.
   > 3. Busque em paralelo, pela nossa API, os dados de contribuição dos dois usuários.
   > 4. Renderize os gráficos de contribuição como grades coloridas: cada dia deve ser um quadrado colorido usando a paleta do GitHub.
   > 5. Exiba um selo VS entre os dois usuários.
   > 6. Mostre o nome de usuário, o total de contribuições e o intervalo de datas de cada usuário.
   > 7. Trate os estados de carregamento e os erros.
   > 8. Acione a ação também ao pressionar Enter nos campos.
   > 9. Por enquanto, use a interface simples que já está estruturada.
   >
   > Use interfaces do TypeScript para a estrutura dos dados de contribuição.

<!-- track:vscode:start -->
3. Deixe o Agent Mode implementar as alterações em `index.astro`.
4. Revise as alterações propostas na visualização de diff antes de aceitá-las.
<!-- track:vscode:end -->

<!-- track:cli:start -->
4. Deixe o Copilot CLI implementar as alterações em `src/pages/index.astro`.
5. Use `/diff` para revisar as alterações geradas e, em seguida, aprová-las.
<!-- track:cli:end -->

## Tarefa 2: Teste a batalha

> **⚠️ Não está vendo as alterações?** Se a página de batalha não for atualizada, pare o servidor de desenvolvimento (`Ctrl+C`), reinicie com `npm run dev` e atualize o navegador.

1. Digite `octocat` e `torvalds` como nomes de usuário e clique em **Battle**.
2. Você deve ver os gráficos de contribuição dos dois usuários lado a lado, com grades coloridas.
3. Teste os casos de erro:
   - Deixe um ou os dois campos vazios e clique em Battle: um erro de validação deve aparecer.
   - Digite um nome de usuário inválido: o aplicativo deve exibir um erro da API.
4. Pressione **Enter** em qualquer campo: a batalha deve ser iniciada da mesma forma que ao clicar no botão.

## Tarefa 3: Itere com o Copilot

Se algo não estiver como deveria, envie feedback diretamente ao Copilot. Por exemplo:

- *"Os quadrados de contribuição estão grandes demais; ajuste para 12 × 12 px."*
- *"Adicione uma dica ao passar o cursor que mostre a data e a quantidade de contribuições."*
- *"O estado de carregamento precisa de uma animação pulsante."*

<!-- track:vscode:start -->
O Agent Mode gerencia naturalmente alterações em vários arquivos e as iterações. Cada prompt de acompanhamento usa o contexto da conversa anterior, permitindo refinar a implementação passo a passo sem recomeçar.
<!-- track:vscode:end -->

<!-- track:cli:start -->
As sessões do Copilot CLI mantêm o histórico, então cada prompt de acompanhamento se baseia nos anteriores. Use `/session` ou `/context` para inspecionar o contexto mantido pelo CLI e `/review` depois de uma iteração maior para procurar erros ou melhorias.
<!-- track:cli:end -->

## Dicas para esta parte

- **Seja específico sobre o que precisa** — requisitos claros levam a resultados melhores.
- **Divida tarefas grandes em prompts menores** se o Copilot sair do rumo.
- **Revise as alterações antes de aceitá-las** — inspecionar o código gerado é mais rápido do que reescrevê-lo depois.
- **Teste o aplicativo após cada etapa de implementação** para localizar os problemas rapidamente.

## ✅ Parte 3 concluída

Você aprendeu a:

- Usar o Copilot para **implementar alterações em vários arquivos**.
- **Iterar nos resultados** com feedback específico.
- Lidar com o **ciclo completo de uma funcionalidade**: implementação, revisão, testes e refinamento.
