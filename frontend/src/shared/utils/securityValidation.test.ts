import { describe, expect, it } from 'vitest';
import { sanitizeInput, containsMaliciousCode } from './securityValidation';

describe('securityValidation - sanitizeInput', () => {
  it('escapa caracteres HTML críticos de manera estricta', () => {
    const raw = '<script>alert("xss & fun\'s")</script>';
    const sanitized = sanitizeInput(raw);
    expect(sanitized).toBe('&lt;script&gt;alert(&quot;xss &amp; fun&#x27;s&quot;)&lt;/script&gt;');
  });

  it('maneja strings vacíos y entradas no válidas sin lanzar errores', () => {
    expect(sanitizeInput('')).toBe('');
    // @ts-expect-error testing runtime robustness
    expect(sanitizeInput(null)).toBe('');
    // @ts-expect-error testing runtime robustness
    expect(sanitizeInput(undefined)).toBe('');
    // @ts-expect-error testing runtime robustness
    expect(sanitizeInput(12345)).toBe('');
  });

  it('aplica trim a espacios en blanco circundantes', () => {
    expect(sanitizeInput('   Hola Finca Villa Luz   ')).toBe('Hola Finca Villa Luz');
  });

  it('no altera texto plano sin entidades', () => {
    expect(sanitizeInput('Vaca Holstein #123')).toBe('Vaca Holstein #123');
  });
});

describe('securityValidation - containsMaliciousCode', () => {
  it('detecta etiquetas script completas e incompletas sin cierre', () => {
    expect(containsMaliciousCode('<script>alert(1)</script>')).toBe(true);
    expect(containsMaliciousCode('<SCRIPT src="evil.js"></SCRIPT>')).toBe(true);
    expect(containsMaliciousCode('<script src="https://evil.com/xss.js">')).toBe(true);
    expect(containsMaliciousCode('<script>alert("no close")')).toBe(true);
  });

  it('detecta esquemas javascript y data:text/html', () => {
    expect(containsMaliciousCode('javascript: void(0)')).toBe(true);
    expect(containsMaliciousCode('data:text/html;base64,PHNjcmlwdD4=')).toBe(true);
  });

  it('detecta inline event handlers peligrosos', () => {
    expect(containsMaliciousCode('<img src=x onerror=alert(1)>')).toBe(true);
    expect(containsMaliciousCode('<body onload = "hack()">')).toBe(true);
  });

  it('detecta llamadas a funciones críticas como eval y expression', () => {
    expect(containsMaliciousCode('eval("malicious")')).toBe(true);
    expect(containsMaliciousCode('expression(malicious)')).toBe(true);
  });

  it('detecta iframes, objects y embeds', () => {
    expect(containsMaliciousCode('<iframe src="evil.com"></iframe>')).toBe(true);
    expect(containsMaliciousCode('<object data="evil.swf"></object>')).toBe(true);
    expect(containsMaliciousCode('<embed src="evil.swf">')).toBe(true);
  });

  it('no genera falsos positivos en texto legítimo', () => {
    expect(containsMaliciousCode('Producción de leche: 12.5 litros')).toBe(false);
    expect(containsMaliciousCode('Observaciones del potrero: sin novedad')).toBe(false);
    expect(containsMaliciousCode('')).toBe(false);
    // @ts-expect-error testing runtime robustness
    expect(containsMaliciousCode(null)).toBe(false);
  });
});
