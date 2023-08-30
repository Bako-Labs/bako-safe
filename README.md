## Template criação SDK 🐢

##### Este repositório contém um template para a criação de Software Development Kits (SDKs) em diferentes linguagens de programação. Um SDK é uma ferramenta essencial para simplificar a integração de uma API ou serviço em uma aplicação, permitindo que os desenvolvedores interajam com o sistema subjacente de maneira mais eficiente e fácil.

### Estrutura do repositório

```bash
├──dist                         # Destino do build dos arquivos
├──exemple                      # Projeto em react para implementar/validar recursos desenvolvidos
├───src/                        # Todos os recursos que serão disponibilizados
│   └── components              # React components
│   └── hooks                   # React hooks para implementar itens da library
│   └── libraries               # Abstração das funções do pacote
│   └── index                   # Export padrão dos recursos
```

### Como utilizar

1. Clone este repo:

    ```
    git clone git@github.com:infinitybase/sdk-template.git
    ```

2. Instale as dependências com o comando abaixo: `yarn` ou `npm install`

3. Configure no package.json os itens: `name` | `version` | `description` | `author`

4. Rode o comando de build do projeto

    ```
    yarn build
    ```

5. Acesse o projeto de exemplo

    ```
    npx create-react-app exemple && cd exemple && yarn add ../ && yarn
    ```

6. Instale novamente os pacotes

    ```
    yarn && yarn add ../
    ```

7. Seus recursos desenvolvidos já estão disponíveis, basta importá-los a partir do nome configurado no item 3
    ```
    import { Basic, Advanced} from 'sdk-template-infinity'
    ```
