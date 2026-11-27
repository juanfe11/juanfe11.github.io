export type Consulta = { titulo: string; concepto: string; codigo: string };
export type Seccion = { etiqueta: string; nombre: string; resumen: string; consultas: Consulta[] };
export type Documento = {
  intro: string;
  notas: string[];
  objetivo: string;
  tablas: string[];
  secciones: Seccion[];
  total: number;
};

// "Presentación 2: Nombre", "Bloque 4: Nombre" o el cierre "Consultas integradoras".
const ENCABEZADO = /^(?:((?:Presentación|Bloque|Tema|Parte)\s+\d+)\s*:\s*(.+)|Consultas integradoras)$/;

function leerPreambulo(doc: Documento, lineas: string[]) {
  const primera = lineas[0].trim();

  if (/^Notas/i.test(primera)) {
    const items: string[] = [];
    for (const l of lineas.slice(1)) {
      const t = l.trim();
      if (t.startsWith('- ')) items.push(t.slice(2).trim());
      else if (t && items.length) items[items.length - 1] += ' ' + t;
    }
    for (const it of items) {
      const tablas = it.match(/Tablas(?: consultadas)?:\s*([^.]+)\./);
      if (tablas) {
        doc.tablas = tablas[1]
          .split(/,\s*|\s+y\s+/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      const objetivo = it.match(/^Objetivo de aprendizaje:\s*(.+)$/i);
      if (objetivo) doc.objetivo = objetivo[1];
      // Esta nota es una instrucción de armado, no contenido para mostrar.
      else if (!/^Actualizar los contadores/i.test(it)) doc.notas.push(it);
    }
  } else if (!doc.intro) {
    doc.intro = (primera === 'SQL' ? lineas.slice(1) : lineas).join(' ').trim();
  }
}

// Formato esperado: bloques separados por una línea en blanco.
//  - Tema:     "Presentación N: Nombre" y debajo una línea con lo que practica.
//  - Consulta: "Título — Concepto" y debajo el código, sin líneas en blanco.
// Si una consulta tiene una línea en blanco dentro del código, el resto se une a la anterior.
export function parseSql(raw: string): Documento {
  const doc: Documento = { intro: '', notas: [], objetivo: '', tablas: [], secciones: [], total: 0 };
  const bloques = raw
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  let seccion: Seccion | null = null;
  let actual: Consulta | null = null;

  for (const bloque of bloques) {
    const lineas = bloque.split('\n');
    const primera = lineas[0].trim();
    const enc = primera.match(ENCABEZADO);

    if (enc) {
      seccion = {
        etiqueta: enc[1] ?? 'Cierre',
        nombre: enc[2] ?? primera,
        resumen: lineas.slice(1).join(' ').trim(),
        consultas: [],
      };
      doc.secciones.push(seccion);
      actual = null;
      continue;
    }

    if (!seccion) {
      leerPreambulo(doc, lineas);
      continue;
    }

    const corte = Math.max(primera.lastIndexOf(' — '), primera.lastIndexOf(' – '));
    if (corte > 0 && !primera.endsWith(';')) {
      actual = {
        titulo: primera.slice(0, corte).trim(),
        concepto: primera.slice(corte + 3).trim(),
        codigo: lineas.slice(1).join('\n').trim(),
      };
      seccion.consultas.push(actual);
      doc.total++;
    } else if (actual) {
      actual.codigo += '\n\n' + bloque;
    }
  }

  return doc;
}

// Si los archivos de texto aún no existen, devuelve documentos vacíos en vez de romper el build.
const archivos = import.meta.glob<string>('../data/sql-*.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export function cargarSql() {
  const leer = (nombre: string) => parseSql(archivos[`../data/${nombre}.txt`] ?? '');
  return { clase: leer('sql-clase'), proyecto: leer('sql-vesperaroom') };
}
