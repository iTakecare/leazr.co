
import React, { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Facebook, Linkedin, Twitter } from "lucide-react";
import { Link } from "react-router-dom";
import { BlogPost } from "@/services/blogService";

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
    <article className="max-w-3xl mx-auto px-4 py-8">
      {/* Back to blog button */}
      <div className="mb-8">
        <Link to="/blog">
          <Button variant="ghost" className="group flex items-center text-gray-600 hover:text-[#48b5c3]">
            <ArrowLeft className="mr-2 w-4 h-4" />
            Retour au blog
          </Button>
        </Link>
      </div>
      
      {/* Article header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Badge variant="outline" className="bg-[#f8f8f6] text-[#48b5c3] rounded-full">
            {blogPost.category}
          </Badge>
          <span className="text-sm text-gray-500">
            {new Date(blogPost.created_at).toLocaleDateString('fr-FR')}
          </span>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-6">{blogPost.title}</h1>
        
        {blogPost.author_name && (
          <div className="flex items-center gap-4 mb-8">
            {blogPost.author_avatar && (
              <img 
                src={blogPost.author_avatar} 
                alt={blogPost.author_name} 
                className="w-12 h-12 rounded-full"
              />
            )}
            <div>
              <h3 className="font-medium">{blogPost.author_name}</h3>
              {blogPost.author_role && (
                <p className="text-sm text-gray-500">{blogPost.author_role}</p>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Featured image */}
      {blogPost.image_url && (
        <div className="mb-8 rounded-xl overflow-hidden">
          <img 
            src={blogPost.image_url} 
            alt={blogPost.title} 
            className="w-full h-auto"
          />
        </div>
      )}
      
      {/* Article content */}
      <div className="prose prose-lg max-w-none mb-10 cms-content">
        <div dangerouslySetInnerHTML={{ __html: blogPost.content }} />
      </div>
      
      {/* Social sharing */}
      <div className="border-t border-gray-200 pt-6 mt-10">
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
