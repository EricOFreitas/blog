import rss from '@astrojs/rss';
import { getVisiblePosts } from '../lib/posts';

export async function GET(context) {
  const posts = await getVisiblePosts();

  return rss({
    title: 'Eric de Oliveira Freitas — blog',
    description:
      'Aventuras reais em programação, infra, investimentos e educação.',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      categories: [post.data.category, ...post.data.tags],
      link: `/posts/${post.id}/`,
    })),
  });
}
