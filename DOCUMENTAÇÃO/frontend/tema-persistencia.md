# Documentação da Persistência de Tema (Escuro/Claro) - Sistema de Marcos Geodésicos

## Visão Geral

O sistema implementa persistência e aplicação automática da preferência de tema (escuro ou claro) via localStorage do navegador. Isso garante que a preferência do usuário seja mantida entre sessões e aplicações.

## Implementação Técnica

### Armazenamento da Preferência

A preferência de tema é armazenada no localStorage do navegador com a chave `theme` e pode ter os seguintes valores:

- `'light'`: Tema claro
- `'dark'`: Tema escuro

### Aplicação no Carregamento da Página

O tema é aplicado imediatamente no carregamento da página para evitar o "flash" de cor errada:

1. A página lê o valor de `localStorage.getItem('theme')`
2. Se um valor existir, aplica imediatamente via `document.documentElement.setAttribute('data-theme', theme)`
3. Se nenhum valor existir, aplica o tema padrão (light)

### Função de Alternância

A função `toggleTheme()` implementa a alternância entre temas:

- Verifica o tema atual via `data-theme` no elemento `html`
- Alterna entre 'light' e 'dark'
- Atualiza o atributo `data-theme` no elemento `html`
- Salva a preferência no localStorage via `localStorage.setItem('theme', newTheme)`
- Atualiza o ícone do botão de tema (lua/sol)

### Estilos CSS

O sistema utiliza variáveis CSS para gerenciar cores do tema:

- No modo `data-theme="light"`: Cores padrão para tema claro
- No modo `data-theme="dark"`: Cores adaptadas para tema escuro

As variáveis são definidas em `frontend/styles/design-system.css`.

## Localização no Código

### Arquivo Principal

- `frontend/index.html`: Contém a função `toggleTheme()` e a lógica de carregamento do tema
- Linhas relevantes: 810-840 (aproximadamente)

### Estilos

- `frontend/styles/design-system.css`: Define as variáveis CSS para ambos os temas
- `frontend/styles/components.css`: Estilos específicos para componentes como o `.lbl-marco`

## Funcionalidades Associadas

### Botão de Alternância

- Localizado na barra de navegação superior
- Ícone muda dinamicamente (lua para sol e vice-versa) de acordo com o tema atual
- Aplica o tema imediatamente após o clique

### Aplicação em Todos os Componentes

- Todos os componentes da interface respeitam o tema atual
- Cores, backgrounds e contrastes são ajustados automaticamente
- Componentes de mapa também adaptam cores de acordo com o tema

## Benefícios

- Experiência do usuário consistente entre sessões
- Redução do "flash" de tema durante carregamento
- Menos fadiga visual em ambientes com pouca luz
- Adaptação às preferências do usuário
- Conformidade com padrões modernos de interface