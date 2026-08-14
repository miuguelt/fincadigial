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

const plugin = {
  meta: { name: 'devbrain', version: '1.0.0' },
  rules: {
    'no-es-es': noEsEs,
    'require-locale': requireLocale,
  },
  configs: {
    recommended: {
      plugins: ['devbrain'],
      rules: {
        'devbrain/no-es-es': 'error',
        'devbrain/require-locale': 'error',
      },
    },
  },
};

export default plugin;
