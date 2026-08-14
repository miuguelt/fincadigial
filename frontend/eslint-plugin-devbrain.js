/**
 * ESLint plugin: eslint-plugin-devbrain
 * Enforces DevBrain canonical rules (Section 7 - UX Colombia Standard).
 *
 * Rules:
 *   no-es-es         → Reject 'es-ES' locale (use 'es-CO')
 *   require-locale   → Reject toLocaleDateString/String/TimeString() without locale arg
 *   no-hardcoded-color → Reject hex/rgb colors in JSX (use CSS variables)
 */

const LOCALE_METHODS = ['toLocaleDateString', 'toLocaleString', 'toLocaleTimeString'];

const noEsEs = {
  meta: {
    type: 'problem',
    docs: {
      description: "Disallow 'es-ES' locale. Use 'es-CO' (DevBrain Rule 7.2a).",
      recommended: true,
    },
    fixable: 'code',
    messages: {
      noEsEs: "Use 'es-CO' instead of 'es-ES'. DevBrain Rule 7.2a: All UI must be in Colombian Spanish.",
    },
  },
  create(context) {
    return {
      Literal(node) {
        if (node.value === 'es-ES') {
          context.report({
            node,
            messageId: 'noEsEs',
            fix(fixer) {
              const quote = context.sourceCode.getText(node)[0];
              return fixer.replaceText(node, `${quote}es-CO${quote}`);
            },
          });
        }
      },
    };
  },
};

const requireLocale = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require locale argument in toLocaleDateString/String/TimeString (DevBrain Rule 7.2b-d).',
      recommended: true,
    },
    fixable: 'code',
    messages: {
      requireLocale: "'{{method}}()' must have 'es-CO' as first argument. DevBrain Rule 7.2: All dates/numbers must use Colombian locale.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          LOCALE_METHODS.includes(node.callee.property.name) &&
          node.arguments.length === 0
        ) {
          const method = node.callee.property.name;
          const openParen = context.sourceCode.getTokenAfter(node.callee);
          context.report({
            node,
            messageId: 'requireLocale',
            data: { method },
            fix(fixer) {
              return fixer.insertTextAfter(openParen, "'es-CO'");
            },
          });
        }
      },
    };
  },
};

/**
 * Encabezados de landing colados en pantallas de datos.
 * La firma es el hero copiado y pegado: radio `rounded-[2.5rem]` junto con
 * relleno `p-6 sm:p-8`. Ocupaba ~180 px y dejaba la tabla en una fila.
 * Ver docs/estandar-pantallas-de-datos.md.
 *
 * Se exigen ambos tokens: `rounded-[2.5rem]` a secas también se usa como radio
 * decorativo en tarjetas y barras, que no son encabezados de pantalla.
 */
const LEGACY_HERO_TOKENS = [/rounded-\[2\.5rem\]/, /\bsm:p-8\b/];

const noLegacyScreenHeader = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow the legacy landing-style page hero in data screens. Use widgets/layout/DataScreenHeader.',
      recommended: true,
    },
    messages: {
      noLegacyHero:
        'Encabezado de landing en una pantalla de datos: usa <DataScreenHeader> de @/widgets/layout/DataScreenHeader. Ver docs/estandar-pantallas-de-datos.md.',
    },
  },
  create(context) {
    const report = (node, value) => {
      if (typeof value !== 'string') return;
      if (LEGACY_HERO_TOKENS.every((token) => token.test(value))) {
        context.report({ node, messageId: 'noLegacyHero' });
      }
    };

    return {
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier') return;
        if (node.name.name !== 'className' && node.name.name !== 'class') return;
        const value = node.value;
        if (!value) return;
        if (value.type === 'Literal') {
          report(value, value.value);
          return;
        }
        if (value.type === 'JSXExpressionContainer') {
          const source = context.sourceCode.getText(value);
          report(value, source);
        }
      },
    };
  },
};

/**
 * Corte de palabras a la mitad.
 *
 * `break-all` (Tailwind) y `wordBreak: 'break-word'|'break-all'` (estilo en
 * línea) reducen el ancho min-content a un carácter: en un flex o un grid el
 * contenedor se encoge por debajo de la palabra más larga y el navegador la
 * parte aunque hubiera sitio ("Enfermed / ad").
 *
 * Alternativas: <FitText> para que encoja la letra, `.break-anywhere` cuando
 * el contenido es un identificador sin espacios.
 * Ver docs/estandar-texto-adaptable.md.
 */
// El delimitador incluye la comilla y la llave: `className="break-all"` y
// `cn({'break-all': x})` también son usos, y con `(^|\s)` se escapaban.
const MID_WORD_BREAK_CLASS = /(^|[\s"'`:{(])break-all([\s"'`:})]|$)/;
const MID_WORD_BREAK_VALUES = new Set(['break-word', 'break-all']);

const noMidWordBreak = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow mid-word breaking (break-all / wordBreak) on user-facing text.',
      recommended: true,
    },
    messages: {
      noMidWordBreak:
        'Partir palabras a la mitad está prohibido. Usa <FitText> para que el texto encoja, o `.break-anywhere` si es un identificador sin espacios. Ver docs/estandar-texto-adaptable.md.',
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier') return;
        if (node.name.name !== 'className' && node.name.name !== 'class') return;
        if (!node.value) return;
        const source = context.sourceCode.getText(node.value);
        if (MID_WORD_BREAK_CLASS.test(source)) {
          context.report({ node: node.value, messageId: 'noMidWordBreak' });
        }
      },
      Property(node) {
        const key = node.key;
        const name = key.type === 'Identifier' ? key.name : key.value;
        if (name !== 'wordBreak') return;
        if (node.value.type !== 'Literal') return;
        if (!MID_WORD_BREAK_VALUES.has(node.value.value)) return;
        context.report({ node, messageId: 'noMidWordBreak' });
      },
    };
  },
};

/**
 * `truncate` recorta el texto sin intentar nada. Está retirado del proyecto:
 * sus 196 apariciones son ahora `.fit-clamp`, que mantiene el renglón único
 * pero encoge la letra antes de perder texto, y solo recorta lo que aún sobre.
 * Ver docs/estandar-texto-adaptable.md.
 */
const TRUNCATE_CLASS = /(^|[\s"'`:{(])truncate([\s"'`:})]|$)/;

const noTruncate = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow the `truncate` utility. Use `.fit-clamp` instead.',
      recommended: true,
    },
    fixable: 'code',
    messages: {
      noTruncate:
        '`truncate` recorta sin intentar que quepa. Usa `fit-clamp`, que encoge la letra antes de perder texto. Ver docs/estandar-texto-adaptable.md.',
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier') return;
        if (node.name.name !== 'className' && node.name.name !== 'class') return;
        if (!node.value) return;
        const source = context.sourceCode.getText(node.value);
        if (!TRUNCATE_CLASS.test(source)) return;
        context.report({
          node: node.value,
          messageId: 'noTruncate',
          fix(fixer) {
            return fixer.replaceText(
              node.value,
              source.replace(/(^|\s|:)truncate(\s|$|["'`])/g, '$1fit-clamp$2'),
            );
          },
        });
      },
    };
  },
};

const plugin = {
  meta: { name: 'devbrain', version: '1.3.0' },
  rules: {
    'no-es-es': noEsEs,
    'require-locale': requireLocale,
    'no-legacy-screen-header': noLegacyScreenHeader,
    'no-mid-word-break': noMidWordBreak,
    'no-truncate': noTruncate,
  },
  configs: {
    recommended: {
      plugins: ['devbrain'],
      rules: {
        'devbrain/no-es-es': 'error',
        'devbrain/require-locale': 'error',
        'devbrain/no-legacy-screen-header': 'error',
        'devbrain/no-mid-word-break': 'error',
        'devbrain/no-truncate': 'error',
      },
    },
  },
};

export default plugin;
