import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Código legado, mantido apenas como referência histórica.
    "_legacy/**",
    // Artefatos de teste.
    "tests/.tmp/**",
    "coverage/**",
  ]),

  {
    rules: {
      // Dívida herdada: o projeto tem 53 usos de `any` e 32 variáveis não
      // usadas, de antes de haver lint no CI. Corrigir tudo de uma vez
      // significaria mexer em código que ninguém pediu para mexer, com
      // risco real de regressão. Ficam como aviso: continuam visíveis no
      // log e no editor, e o CI passa a barrar categorias novas de erro
      // em vez de reprovar sempre — um CI que falha desde o primeiro dia
      // é um CI que ninguém olha.
      //
      // Para reduzir com segurança: `npx eslint --fix`, depois arquivo por
      // arquivo, com os testes rodando.
      "@typescript-eslint/no-explicit-any": "warn",

      // `_` na frente marca descarte intencional — o caso de tirar um
      // campo de um objeto justamente para não devolvê-lo.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Imagens em <img>: a otimização do next/image é desejável, mas
      // trocar as sete ocorrências é mudança visual que precisa de
      // conferência no navegador.
      "@next/next/no-img-element": "warn",
    },
  },

  {
    // Nos scripts de operação e nos testes, `console` é a interface.
    files: ["scripts/**/*.ts", "tests/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
]);

export default eslintConfig;
