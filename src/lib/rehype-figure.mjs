// Transforma uma imagem que está sozinha num parágrafo — o caso do
// `![alt](caminho "legenda")` do Markdown — num <figure> com <figcaption>.
// A legenda vem do "title" da imagem (o texto entre aspas). Rodando como
// rehype (depois do mdast→hast), o <img> já é o mesmo nó que o Astro otimiza,
// então a conversão pra webp/lazy/responsivo continua valendo.
export default function rehypeFigure() {
  return (tree) => walk(tree);
}

function walk(node) {
  if (!node || !Array.isArray(node.children)) return;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (isLoneImageParagraph(child)) {
      const img = child.children.find(
        (c) => c.type === 'element' && c.tagName === 'img',
      );
      const caption = img.properties && img.properties.title;
      const figureChildren = [img];
      if (caption) {
        // Tira o title do <img> pra não virar tooltip duplicado.
        delete img.properties.title;
        figureChildren.push({
          type: 'element',
          tagName: 'figcaption',
          properties: {},
          children: [{ type: 'text', value: String(caption) }],
        });
      }
      node.children[i] = {
        type: 'element',
        tagName: 'figure',
        properties: { className: ['post-figure'] },
        children: figureChildren,
      };
    } else {
      walk(child);
    }
  }
}

function isLoneImageParagraph(node) {
  if (node.type !== 'element' || node.tagName !== 'p') return false;
  const meaningful = node.children.filter(
    (c) => !(c.type === 'text' && c.value.trim() === ''),
  );
  return (
    meaningful.length === 1 &&
    meaningful[0].type === 'element' &&
    meaningful[0].tagName === 'img'
  );
}
