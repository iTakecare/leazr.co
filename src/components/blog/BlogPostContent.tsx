
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Facebook, Linkedin, Twitter } from "lucide-react";
import { Link } from "react-router-dom";

interface BlogPostContentProps {
  title: string;
  content: React.ReactNode;
  date: string;
  category: string;
  image: string;
  author: {
    name: string;
    role: string;
    avatar: string;
  };
}

const BlogPostContent = ({ title, content, date, category, image, author }: BlogPostContentProps) => {
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
            {category}
          </Badge>
          <span className="text-sm text-gray-500">{date}</span>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-6">{title}</h1>
        
        <div className="flex items-center gap-4 mb-8">
          <img 
            src={author.avatar} 
            alt={author.name} 
            className="w-12 h-12 rounded-full"
          />
          <div>
            <h3 className="font-medium">{author.name}</h3>
            <p className="text-sm text-gray-500">{author.role}</p>
          </div>
        </div>
      </div>
      
      {/* Featured image */}
      <div className="mb-8 rounded-xl overflow-hidden">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-auto"
        />
      </div>
      
      {/* Article content */}
      <div className="prose prose-lg max-w-none mb-10">
        {content}
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
