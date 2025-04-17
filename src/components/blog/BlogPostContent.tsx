
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Facebook, Linkedin, Twitter } from "lucide-react";
import { Link } from "react-router-dom";
import { BlogPost } from "@/services/blogService";
import "../../../src/styles/cms.css";

interface BlogPostContentProps {
  blogPost: BlogPost;
}

const BlogPostContent = ({ blogPost }: BlogPostContentProps) => {
  useEffect(() => {
    // Mettre à jour les métadonnées de la page
    document.title = blogPost.meta_title || blogPost.title;
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription && blogPost.meta_description) {
      metaDescription.setAttribute('content', blogPost.meta_description);
    } else if (blogPost.meta_description) {
      const meta = document.createElement('meta');
      meta.name = "description";
      meta.content = blogPost.meta_description;
      document.head.appendChild(meta);
    }
  }, [blogPost]);

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      {/* Article header */}
      <div className="mb-12 text-center">
        <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-6 text-[#222222]">
          {blogPost.title}
        </h1>

        <div className="flex items-center justify-center space-x-8 text-gray-500 text-sm">
          <div className="flex items-center">
            <span>{new Date(blogPost.created_at).toLocaleDateString('fr-FR')}</span>
          </div>
          <div className="w-2 h-2 rounded-full bg-gray-300"></div>
          <div className="flex items-center">
            <span>{blogPost.read_time || "9 minutes de lecture"}</span>
          </div>
        </div>
      </div>
      
      {/* Separator line */}
      <div className="border-t border-gray-200 mb-8 relative">
        <div className="absolute left-1/2 -translate-x-1/2 -top-2 w-4 h-4 rounded-full bg-gray-200"></div>
      </div>
      
      {/* Featured image */}
      {blogPost.image_url && (
        <div className="mb-8 rounded-lg overflow-hidden">
          <img 
            src={blogPost.image_url} 
            alt={blogPost.title} 
            className="w-full h-auto object-cover"
          />
        </div>
      )}
      
      {/* Article content */}
      <div className="prose prose-lg max-w-none mb-10 cms-content">
        <div dangerouslySetInnerHTML={{ __html: blogPost.content }} />
      </div>
      
      {/* Back to blog button */}
      <div className="mt-8 mb-12">
        <Link to="/blog">
          <Button variant="ghost" className="group flex items-center text-gray-600 hover:text-[#48b5c3]">
            <ArrowLeft className="mr-2 w-4 h-4" />
            Retour au blog
          </Button>
        </Link>
      </div>
      
      {/* Social sharing */}
      <div className="border-t border-gray-200 pt-6 mt-10 hidden md:block">
        <div className="flex items-center gap-4">
          <span className="font-medium">Partager:</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="rounded-full w-9 h-9 p-0">
              <Facebook className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" className="rounded-full w-9 h-9 p-0">
              <Twitter className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" className="rounded-full w-9 h-9 p-0">
              <Linkedin className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" className="rounded-full w-9 h-9 p-0">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default BlogPostContent;
