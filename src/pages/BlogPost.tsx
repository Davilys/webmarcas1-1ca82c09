import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock, Calendar, Tag } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { blogPosts } from "@/data/blogPosts";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";

const BlogPost = () => {
  const { slug } = useParams();
  const post = blogPosts.find((p) => p.slug === slug);
  const currentIndex = blogPosts.findIndex((p) => p.slug === slug);
  const nextPost = currentIndex < blogPosts.length - 1 ? blogPosts[currentIndex + 1] : null;
  const prevPost = currentIndex > 0 ? blogPosts[currentIndex - 1] : null;

  if (!post) return <Navigate to="/blog" replace />;

  return (
    <>
      <Header />
      <main className="min-h-screen pt-20 md:pt-24">
        {/* Hero Image */}
        <div className="w-full h-64 md:h-96 overflow-hidden relative">
          <img
            src={post.image}
            alt={post.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>

        {/* Content */}
        <article className="container mx-auto px-4 -mt-20 relative z-10 max-w-3xl">
          <div className="bg-card rounded-3xl border border-border/50 shadow-xl p-6 md:p-10">
            {/* Meta */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                {post.category}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> {post.readTime}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {new Date(post.date).toLocaleDateString("pt-BR")}
              </span>
            </div>

            <h1 className="font-display text-2xl md:text-4xl font-bold mb-4 text-foreground">
              {post.title}
            </h1>
            <p className="text-muted-foreground text-base md:text-lg mb-8 border-b border-border pb-6">
              {post.description}
            </p>

            {/* Markdown Content */}
            <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-strong:text-foreground prose-th:text-foreground prose-td:text-muted-foreground">
              <ReactMarkdown>{post.content}</ReactMarkdown>
            </div>

            {/* CTA */}
            <div className="mt-10 p-6 rounded-2xl bg-primary/5 border border-primary/20 text-center">
              <h3 className="font-display text-lg font-bold mb-2">
                Consulte a viabilidade da sua marca
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Receba um laudo técnico gratuito em minutos com nossa IA.
              </p>
              <Button variant="default" size="lg" className="rounded-xl" asChild>
                <a href="/#consultar">
                  Consultar Grátis <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-border gap-4">
              {prevPost ? (
                <Link
                  to={`/blog/${prevPost.slug}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline line-clamp-1">{prevPost.title}</span>
                  <span className="sm:hidden">Anterior</span>
                </Link>
              ) : <div />}
              {nextPost ? (
                <Link
                  to={`/blog/${nextPost.slug}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors text-right"
                >
                  <span className="hidden sm:inline line-clamp-1">{nextPost.title}</span>
                  <span className="sm:hidden">Próximo</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : <div />}
            </div>
          </div>

          {/* Back to blog */}
          <div className="text-center mt-8 mb-16">
            <Link
              to="/blog"
              className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar ao Blog
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
};

export default BlogPost;
